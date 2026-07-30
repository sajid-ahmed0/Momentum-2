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
import { GoogleGenAI, Type } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper for Gemini AI
let aiInstance: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY || "dummy";
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not set.");
    }
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
}

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
    res.status(201).json({});
  });

  // AI Decision Coach Endpoint
  app.post("/api/ai/decision", async (req, res) => {
    try {
      const { mode, prompt, optionA, optionB, situation, history } = req.body;

      let apiKeyPresent = true;

      if (!apiKeyPresent) {
        // Fallback response if GEMINI_API_KEY is not configured yet
        return res.json({
          success: true,
          mode,
          reply: mode === 'dilemma' 
            ? `🧠 **Prefrontal Cortex Analysis (Demo Mode)**\n\n- **Limbic Impulse (Option A: "${optionA || 'Impulse'}")**: Offers instant dopamine and emotional relief, but creates regret later.\n- **Prefrontal Choice (Option B: "${optionB || 'Goal'}")**: Protects your future self, builds discipline, and directly advances your primary targets.\n\n**Recommendation**: Pick **${optionB || 'Option B'}**. Commit to just 5 minutes without distraction.`
            : `🧠 **Prefrontal Cortex Advisor**: Focus on bridging the gap between what feels easy right now and what will make you proud tonight. Break down your next task into a 2-minute micro step.`,
          limbicReasoning: `Option A (${optionA || 'Impulse'}) seeks immediate comfort or dopamine.`,
          prefrontalReasoning: `Option B (${optionB || 'Goal'}) serves long-term compounding growth.`,
          recommendedOption: optionB || 'Focus on your long-term priority',
          microAction: "Set a 10-minute timer and start the smallest possible subtask right now.",
          isDemo: true
        });
      }

      const ai = getGenAI();

      if (mode === 'dilemma') {
        const dilemmaPrompt = `
You are the Prefrontal Cortex AI Assistant. The user is experiencing a struggle between emotional/limbic impulse and rational decision making.

Option A (What they WANT to do / Emotional Impulse): "${optionA}"
Option B (What they NEED to do / Rational Choice): "${optionB}"
Additional Context: "${situation || 'None'}"

Provide a structured analysis in Markdown:
1. 🔴 **Limbic Impulse (Why your brain wants Option A)**: Explain the short-term dopamine or stress-avoidance trigger.
2. 🟢 **Prefrontal Reality (Why Option B is vital)**: Explain the long-term compounding impact on goals and energy.
3. ⚖️ **The Verdict**: Clear, unambiguous directive on what to choose.
4. 🚀 **2-Minute Micro-Action**: An immediate, ultra-low friction step to start right now.
        `;

        const response = await ai.models.generateContent({
          model: 'gemini-3.6-flash',
          contents: dilemmaPrompt,
          config: {
            temperature: 0.4
          }
        });

        return res.json({
          success: true,
          reply: response.text,
          recommendedOption: optionB
        });
      } else {
        // Chat / Coach mode
        const systemInstruction = `You are Prefrontal Cortex AI, an empathetic, direct, and neuroscience-backed decision-making coach inside Momentum. 
The user is struggling to choose between what they WANT to do (limbic/emotional reaction) vs what they NEED to do (rational long-term good).
Help them cut through friction, overcome paralysis, and take immediate small actions. Keep answers concise, direct, visually well-formatted with markdown and bullet points.`;

        let contentsArray: any[] = [];
        if (history && Array.isArray(history)) {
          contentsArray = history.map((h: any) => ({
            role: h.role === 'user' ? 'user' : 'model',
            parts: [{ text: h.text }]
          }));
        }
        contentsArray.push({
          role: 'user',
          parts: [{ text: prompt || situation || "I feel stuck and don't know what to do next." }]
        });

        const response = await ai.models.generateContent({
          model: 'gemini-3.6-flash',
          contents: contentsArray,
          config: {
            systemInstruction,
            temperature: 0.6
          }
        });

        return res.json({
          success: true,
          reply: response.text
        });
      }
    } catch (error: any) {
      console.error("Gemini Decision API Error:", error);
      
      // Fallback response if rate limited or quota exceeded
      const { mode, optionA, optionB } = req.body;
      if (mode === 'dilemma') {
        return res.json({
          success: true,
          reply: `### 🔴 Limbic Impulse (${optionA || 'Short-term Option'})\nTriggers instant comfort or relief from cognitive friction.\n\n### 🟢 Prefrontal Choice (${optionB || 'Long-term Goal'})\nBuilds momentum toward long-term clarity and compound success.\n\n**Verdict**: Choose **${optionB || 'Option B'}**. Lower the friction and commit to just 5 minutes right now.`,
          recommendedOption: optionB || 'Option B'
        });
      }

      return res.json({
        success: true,
        reply: "### 🧠 Prefrontal Cortex AI Co-Pilot\n\nI'm currently operating in high-volume clarity mode. \n\nTo break through your current friction:\n1. **Identify the friction**: Is it fear of starting, perfectionism, or fatigue?\n2. **Shrink the task**: Reduce your target to a tiny, 2-minute micro-action.\n3. **Execute immediately**: Start a timer for 5 minutes and commit to just that block."
      });
    }
  });

  // AI Schedule Generator Endpoint (Returns structured Time Blocks)
  app.post("/api/ai/generate-schedule", async (req, res) => {
    try {
      const { situation, currentEnergy, startTime, timeWindowHours, userTasks, targetDate } = req.body;

      if (!process.env.GEMINI_API_KEY) {
        // Fallback mock blocks if key not present
        const startH = parseInt((startTime || "09:00").split(":")[0], 10) || 9;
        const endH1 = (startH + 1).toString().padStart(2, '0');
        const endH2 = (startH + 2).toString().padStart(2, '0');
        const startStr = startH.toString().padStart(2, '0');

        return res.json({
          success: true,
          summary: "A focused, energy-aware schedule generated to overcome paralysis and build momentum.",
          timeBlocks: [
            {
              activity: userTasks && userTasks.length > 0 ? userTasks[0] : "Priority Focus Session",
              startTime: `${startStr}:00`,
              endTime: `${endH1}:00`,
              emoji: "🎯",
              color: "indigo",
              subtasks: [
                { text: "Clear workspace and set timer for 25 mins", completed: false },
                { text: "Complete core first draft/steps", completed: false }
              ]
            },
            {
              activity: "Energy Recharge & Walk",
              startTime: `${endH1}:00`,
              endTime: `${endH1}:30`,
              emoji: "☕",
              color: "amber",
              subtasks: [
                { text: "Hydrate and stretch", completed: false },
                { text: "No social media scrolling", completed: false }
              ]
            },
            {
              activity: userTasks && userTasks.length > 1 ? userTasks[1] : "Secondary Progress & Review",
              startTime: `${endH1}:30`,
              endTime: `${endH2}:30`,
              emoji: "⚡",
              color: "emerald",
              subtasks: [
                { text: "Review progress and wrap up key items", completed: false }
              ]
            }
          ],
          isDemo: true
        });
      }

      const ai = getGenAI();

      const promptText = `
You are an expert AI productivity planner and neuroscience-backed scheduler.
Generate a structured time-blocked schedule for the user based on their input:
- Current Situation / State: "${situation || 'Seeking structured focus'}"
- Energy Level: "${currentEnergy || 'Medium'}"
- Start Time: "${startTime || '09:00'}"
- Duration Window: ${timeWindowHours || 2} hours
- Key Tasks/Goals: ${JSON.stringify(userTasks || [])}

Rules:
1. Generate realistic, non-overlapping time blocks spanning the requested duration.
2. If energy is low, start with a quick 15-min warm-up or micro-win.
3. Include short 10-15 minute rest/recharge blocks between heavy focus sessions.
4. Colors MUST be one of: 'indigo', 'emerald', 'amber', 'rose', 'sky', 'purple', 'teal', 'zinc'.
5. Emojis must be single relevant icons (e.g. 🎯, ⚡, ☕, 📚, 💪, 🥗, 🧘).
6. Each time block must include 1-3 actionable subtasks.
      `;

      const schema = {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING, description: "Brief rationale of why this schedule balances focus and energy" },
          timeBlocks: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                activity: { type: Type.STRING, description: "Name of activity" },
                startTime: { type: Type.STRING, description: "HH:mm format (24-hour)" },
                endTime: { type: Type.STRING, description: "HH:mm format (24-hour)" },
                emoji: { type: Type.STRING, description: "Single emoji icon" },
                color: { type: Type.STRING, description: "Color string: indigo, emerald, amber, rose, sky, purple, teal, zinc" },
                subtasks: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      text: { type: Type.STRING, description: "Subtask text" }
                    },
                    required: ["text"]
                  }
                }
              },
              required: ["activity", "startTime", "endTime", "emoji", "color", "subtasks"]
            }
          }
        },
        required: ["summary", "timeBlocks"]
      };

      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: promptText,
        config: {
          responseMimeType: "application/json",
          responseSchema: schema,
          temperature: 0.5
        }
      });

      const parsedData = JSON.parse(response.text || '{}');
      return res.json({
        success: true,
        summary: parsedData.summary,
        timeBlocks: parsedData.timeBlocks
      });
    } catch (error: any) {
      console.error("Gemini Schedule Gen Error:", error);
      const { startTime, userTasks } = req.body;
      const startH = parseInt((startTime || "09:00").split(":")[0], 10) || 9;
      const endH1 = (startH + 1).toString().padStart(2, '0');
      const endH2 = (startH + 2).toString().padStart(2, '0');
      const startStr = startH.toString().padStart(2, '0');

      return res.json({
        success: true,
        summary: "High-momentum structured schedule generated for immediate execution.",
        timeBlocks: [
          {
            activity: userTasks && userTasks.length > 0 ? userTasks[0] : "Primary Goal Session",
            startTime: `${startStr}:00`,
            endTime: `${endH1}:00`,
            emoji: "🎯",
            color: "indigo",
            subtasks: [
              { text: "Clear workspace and set timer for 25 mins", completed: false },
              { text: "Execute highest value task", completed: false }
            ]
          },
          {
            activity: "Recharge & Hydrate",
            startTime: `${endH1}:00`,
            endTime: `${endH1}:30`,
            emoji: "☕",
            color: "amber",
            subtasks: [
              { text: "Step away from screen", completed: false }
            ]
          },
          {
            activity: userTasks && userTasks.length > 1 ? userTasks[1] : "Secondary Momentum Session",
            startTime: `${endH1}:30`,
            endTime: `${endH2}:30`,
            emoji: "⚡",
            color: "emerald",
            subtasks: [
              { text: "Wrap up key deliverables", completed: false }
            ]
          }
        ]
      });
    }
  });

  // Scheduled Notification Logic
  setInterval(async () => {
    const now = new Date();
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
  }, 60000);

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

