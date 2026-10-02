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

SCOPES.forEach((scope) => {
  googleProvider.addScope(scope);
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

    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (credential?.accessToken) {
      cachedAccessToken = credential.accessToken;
    }
    return result;
  } finally {
    isSigningIn = false;
  }
};

export const connectGoogleCalendar = async (): Promise<{ user: User; accessToken: string }> => {
  try {
    isSigningIn = true;
    googleProvider.setCustomParameters({ prompt: 'consent' });
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
