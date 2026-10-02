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
// Cache the OAuth access token in memory.
let cachedAccessToken: string | null = null;
let cachedTokenExpiry = 0;
let cachedCalendarEmail: string | null = null;

type CalendarAuthListener = (state: { token: string | null; email: string | null }) => void;
const calendarAuthListeners = new Set<CalendarAuthListener>();

const notifyCalendarAuthListeners = () => {
  const validToken = cachedAccessToken && cachedTokenExpiry > Date.now() ? cachedAccessToken : null;
  calendarAuthListeners.forEach((cb) => cb({ token: validToken, email: cachedCalendarEmail }));
};

export const subscribeCalendarAuth = (listener: CalendarAuthListener): (() => void) => {
  calendarAuthListeners.add(listener);
  const validToken = cachedAccessToken && cachedTokenExpiry > Date.now() ? cachedAccessToken : null;
  listener({ token: validToken, email: cachedCalendarEmail });
  return () => {
    calendarAuthListeners.delete(listener);
  };
};

// IndexedDB helpers to persist Google Calendar session across browser refreshes
const IDB_NAME = 'momentum_gcal_auth_db';
const IDB_STORE = 'session';
const IDB_KEY = 'active_calendar_session';

const openCalendarIdb = (): Promise<IDBDatabase | null> => {
  if (typeof window === 'undefined' || !window.indexedDB) return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const req = window.indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => {
        const dbInstance = req.result;
        if (!dbInstance.objectStoreNames.contains(IDB_STORE)) {
          dbInstance.createObjectStore(IDB_STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
};

const saveCalendarSessionToIdb = async (token: string, expiresAt: number, email: string | null) => {
  const dbInstance = await openCalendarIdb();
  if (!dbInstance) return;
  return new Promise<void>((resolve) => {
    try {
      const tx = dbInstance.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put({ token, expiresAt, email }, IDB_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
};

const loadCalendarSessionFromIdb = async (): Promise<{ token: string; expiresAt: number; email: string | null } | null> => {
  const dbInstance = await openCalendarIdb();
  if (!dbInstance) return null;
  return new Promise((resolve) => {
    try {
      const tx = dbInstance.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).get(IDB_KEY);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
};

const clearCalendarSessionFromIdb = async () => {
  const dbInstance = await openCalendarIdb();
  if (!dbInstance) return;
  return new Promise<void>((resolve) => {
    try {
      const tx = dbInstance.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).delete(IDB_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
};

export const clearExpiredCalendarToken = async () => {
  cachedAccessToken = null;
  cachedTokenExpiry = 0;
  if (cachedCalendarEmail) {
    await saveCalendarSessionToIdb('', 0, cachedCalendarEmail);
  } else {
    await clearCalendarSessionFromIdb();
  }
  notifyCalendarAuthListeners();
};

export const trySilentCalendarTokenRefresh = async (_hintEmail?: string | null): Promise<string | null> => {
  if (cachedAccessToken && cachedTokenExpiry > Date.now()) {
    return cachedAccessToken;
  }
  return null;
};

// Restore saved Google Calendar session on app load without opening any background popups
if (typeof window !== 'undefined') {
  loadCalendarSessionFromIdb().then(async (saved) => {
    if (saved) {
      cachedCalendarEmail = saved.email || calendarOAuthAuth.currentUser?.email || null;
      if (saved.token && saved.expiresAt > Date.now()) {
        cachedAccessToken = saved.token;
        cachedTokenExpiry = saved.expiresAt;
      } else {
        cachedAccessToken = null;
        cachedTokenExpiry = 0;
      }
      notifyCalendarAuthListeners();
    }
  });

  onAuthStateChanged(calendarOAuthAuth, (calUser) => {
    if (calUser?.email) {
      cachedCalendarEmail = calUser.email;
      notifyCalendarAuthListeners();
    }
  });
}

let hadAuthenticatedUser = false;
onAuthStateChanged(auth, (user) => {
  if (user && !user.isAnonymous) {
    hadAuthenticatedUser = true;
  } else if (!user && hadAuthenticatedUser && !isSigningIn) {
    hadAuthenticatedUser = false;
    cachedAccessToken = null;
    cachedTokenExpiry = 0;
    notifyCalendarAuthListeners();
  }
});

export const getGoogleAccessToken = (): string | null => {
  if (cachedAccessToken && cachedTokenExpiry > Date.now()) {
    return cachedAccessToken;
  }
  return null;
};

export const getConnectedCalendarEmail = (): string | null => {
  return cachedCalendarEmail || calendarOAuthAuth.currentUser?.email || auth.currentUser?.email || null;
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

export const connectGoogleCalendar = async (forceSelectAccount: boolean = false): Promise<{ user: User; accessToken: string }> => {
  try {
    isSigningIn = true;
    const hintEmail = cachedCalendarEmail || calendarOAuthAuth.currentUser?.email || auth.currentUser?.email;
    if (hintEmail && !forceSelectAccount) {
      calendarGoogleProvider.setCustomParameters({ login_hint: hintEmail });
    } else {
      calendarGoogleProvider.setCustomParameters({ prompt: 'select_account' });
    }

    const result = await signInWithPopup(calendarOAuthAuth, calendarGoogleProvider);

    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to obtain Google Calendar access token. Please try signing in again.');
    }
    const expiresAt = Date.now() + 55 * 60 * 1000; // 55 minutes
    cachedAccessToken = credential.accessToken;
    cachedTokenExpiry = expiresAt;
    cachedCalendarEmail = result.user.email || hintEmail || null;
    await saveCalendarSessionToIdb(cachedAccessToken, expiresAt, cachedCalendarEmail);
    notifyCalendarAuthListeners();
    return { user: result.user, accessToken: cachedAccessToken };
  } finally {
    isSigningIn = false;
  }
};

export const disconnectGoogleCalendar = async () => {
  cachedAccessToken = null;
  cachedTokenExpiry = 0;
  cachedCalendarEmail = null;
  await clearCalendarSessionFromIdb();
  try {
    await signOut(calendarOAuthAuth);
  } catch {}
  notifyCalendarAuthListeners();
};

export const loginWithEmail = (email: string, pass: string) => signInWithEmailAndPassword(auth, email, pass);
export const registerWithEmail = (email: string, pass: string) => createUserWithEmailAndPassword(auth, email, pass);
export const loginAnonymously = () => signInAnonymously(auth);
export const logout = async () => {
  cachedAccessToken = null;
  cachedTokenExpiry = 0;
  cachedCalendarEmail = null;
  await clearCalendarSessionFromIdb();
  try {
    await signOut(calendarOAuthAuth);
  } catch {}
  notifyCalendarAuthListeners();
  await signOut(auth);
};
