import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  linkWithPopup,
  signOut, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signInAnonymously,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { getFirestore, enableMultiTabIndexedDbPersistence } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId);

// Enable Offline Persistence
if (typeof window !== 'undefined') {
  enableMultiTabIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn('Persistence failed: Multiple tabs open');
    } else if (err.code === 'unimplemented') {
      console.warn('Persistence is not supported by this browser');
    }
  });
}

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
];

// Dedicated secondary Firebase app for Google Calendar OAuth (provisioned on project-61d3edb4-a424-4742-ae0)
// so that the user's primary Firestore database & Auth account stay on gen-lang-client-0011544447 with all existing data intact.
const calendarOAuthApp = initializeApp(
  {
    projectId: 'project-61d3edb4-a424-4742-ae0',
    appId: '1:792771806071:web:fd614f979e8f544e399772',
    apiKey: 'AIzaSyDgeRP-9RAMQSNCzUYYQo5J406eAVjhOq0',
    authDomain: 'project-61d3edb4-a424-4742-ae0.firebaseapp.com',
    storageBucket: 'project-61d3edb4-a424-4742-ae0.firebasestorage.app',
    messagingSenderId: '792771806071',
  },
  'google-calendar-oauth'
);
const calendarOAuthAuth = getAuth(calendarOAuthApp);
const calendarGoogleProvider = new GoogleAuthProvider();
SCOPES.forEach((scope) => {
  calendarGoogleProvider.addScope(scope);
});

// Flag to indicate if we are in the middle of a sign-in flow.
let isSigningIn = false;
// Cache the OAuth access token in memory only (never in localStorage or sessionStorage).
let cachedAccessToken: string | null = null;

onAuthStateChanged(auth, (user) => {
  if (!user && !isSigningIn) {
    cachedAccessToken = null;
  }
});

export const getGoogleAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const signInWithGoogle = async () => {
  try {
    isSigningIn = true;
    let result;
    if (auth.currentUser && auth.currentUser.isAnonymous) {
      try {
        result = await linkWithPopup(auth.currentUser, googleProvider);
      } catch (error: any) {
        if (error.code === 'auth/credential-already-in-use') {
          result = await signInWithPopup(auth, googleProvider);
        } else {
          throw error;
        }
      }
    } else {
      result = await signInWithPopup(auth, googleProvider);
    }
    return result;
  } finally {
    isSigningIn = false;
  }
};

export const connectGoogleCalendar = async (): Promise<{ user: User; accessToken: string }> => {
  try {
    isSigningIn = true;
    calendarGoogleProvider.setCustomParameters({ prompt: 'consent' });
    const result = await signInWithPopup(calendarOAuthAuth, calendarGoogleProvider);

    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to obtain Google Calendar access token. Please try signing in again.');
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } finally {
    isSigningIn = false;
  }
};

export const loginWithEmail = (email: string, pass: string) => signInWithEmailAndPassword(auth, email, pass);
export const registerWithEmail = (email: string, pass: string) => createUserWithEmailAndPassword(auth, email, pass);
export const loginAnonymously = () => signInAnonymously(auth);
export const logout = async () => {
  cachedAccessToken = null;
  await signOut(auth);
};
