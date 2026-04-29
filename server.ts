import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import webpush from "web-push";
import bodyParser from "body-parser";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, where } from "firebase/firestore";
import fs from "fs";
import { format, parse, isAfter, startOfToday } from "date-fns";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load Firebase Config
const firebaseConfig = JSON.parse(fs.readFileSync(path.join(process.cwd(), "firebase-applet-config.json"), "utf8"));
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);

// Web Push Setup
const publicVapidKey = process.env.VITE_VAPID_PUBLIC_KEY || "BJy-KX3sF3KI1Iuan-mNoWWqpbt3MEGVI6f_uPvvCoXRqtNbeTm5XrXVoIrSHJc-zYABT9gDOT-t8hWH9FMNf1M";
const privateVapidKey = process.env.VAPID_PRIVATE_KEY || "sdeQON2jA9zfgByHIkW_UzQlnO3B_sh4Mg4nQqkYGtU";

webpush.setVapidDetails(
  "mailto:example@yourdomain.org",
  publicVapidKey,
  privateVapidKey
);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(bodyParser.json());

  // API Routes
  app.post("/api/subscribe", async (req, res) => {
    const { subscription, uid } = req.body;
    // Note: In a real app, you'd save this to Firestore.
    // Since we're in the server, we'll just log it for now or use the client-side subscription.
    // Actually, I'll provide a response.
    res.status(201).json({});
  });

  // Scheduled Notification Logic
  // This runs every hour to check if it's 7 AM (server time)
  setInterval(async () => {
    const now = new Date();
    // Check if it's the 7:00 AM hour
    if (now.getHours() === 7 && now.getMinutes() === 0) {
      console.log("Checking for 7 AM milestone notifications...");
      try {
        const subsSnapshot = await getDocs(collection(db, "pushSubscriptions"));
        const examsSnapshot = await getDocs(collection(db, "exams"));
        
        const exams = examsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
        const today = startOfToday();

        for (const subDoc of subsSnapshot.docs) {
          const subData = subDoc.data();
          const userExams = exams.filter(e => e.uid === subData.uid);
          
          if (userExams.length > 0) {
            // Find closest upcoming
            const sorted = userExams
              .map(e => ({ ...e, dateObj: parse(e.date, 'yyyy-MM-dd', new Date()) }))
              .filter(e => e.dateObj > today)
              .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());

            if (sorted.length > 0) {
              const next = sorted[0];
              const diffTime = next.dateObj.getTime() - today.getTime();
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

              const payload = JSON.stringify({
                title: "Daily Milestone Update",
                body: `${diffDays} days left for ${next.title}. You've got this!`,
              });

              webpush.sendNotification(subData.subscription, payload)
                .catch(err => console.error("Error sending push:", err));
            }
          }
        }
      } catch (e) {
        console.error("Scheduler error:", e);
      }
    }
  }, 60000); // Check every minute to hit the exact 7:00 mark

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
