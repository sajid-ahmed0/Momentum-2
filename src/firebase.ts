import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword 
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBoaj92GEII9BlRMlUc77p6sBS78liM0TM",
  authDomain: "momentum-8a2ea.firebaseapp.com",
  projectId: "momentum-8a2ea",
  storageBucket: "momentum-8a2ea.firebasestorage.app",
  messagingSenderId: "30079248942",
  appId: "1:30079248942:web:c0c8f70bfb417ffebc0dbf"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = () => signInWithPopup(auth, googleProvider);
export const loginWithEmail = (email: string, pass: string) => signInWithEmailAndPassword(auth, email, pass);
export const registerWithEmail = (email: string, pass: string) => createUserWithEmailAndPassword(auth, email, pass);
export const logout = () => signOut(auth);
