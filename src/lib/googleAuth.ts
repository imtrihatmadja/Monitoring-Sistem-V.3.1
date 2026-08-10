import type { User } from 'firebase/auth';

let app: any = null;
let auth: any = null;
let cachedAccessToken: string | null = null;
let isSigningIn = false;

// Lazy getter for Firebase Auth instance
async function getAuthInstance() {
  if (auth) return auth;
  try {
    const { initializeApp, getApps } = await import('firebase/app');
    const { getAuth } = await import('firebase/auth');
    const firebaseConfig = (await import('../../firebase-applet-config.json')).default;

    const apps = getApps();
    app = apps.length > 0 ? apps[0] : initializeApp(firebaseConfig);
    auth = getAuth(app);
    return auth;
  } catch (e) {
    console.warn('[GoogleAuth] Firebase failed to initialize lazily:', e);
    return null;
  }
}

// Initialize auth state listener.
export const initAuth = async (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  try {
    const firebaseAuth = await getAuthInstance();
    if (!firebaseAuth) {
      if (onAuthFailure) onAuthFailure();
      return () => {};
    }
    const { onAuthStateChanged } = await import('firebase/auth');
    return onAuthStateChanged(firebaseAuth, async (user: User | null) => {
      if (user) {
        if (cachedAccessToken) {
          if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
        } else if (!isSigningIn) {
          if (onAuthFailure) onAuthFailure();
        }
      } else {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    });
  } catch (err) {
    console.warn('[GoogleAuth] initAuth error:', err);
    if (onAuthFailure) onAuthFailure();
    return () => {};
  }
};

// Initiate Google Popup Sign In Flow
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  const firebaseAuth = await getAuthInstance();
  if (!firebaseAuth) {
    throw new Error('Google Authentication service is unavailable in this environment.');
  }
  try {
    isSigningIn = true;
    const { signInWithPopup, GoogleAuthProvider } = await import('firebase/auth');
    
    const provider = new GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/drive.file');
    provider.addScope('https://www.googleapis.com/auth/userinfo.email');
    provider.addScope('https://www.googleapis.com/auth/userinfo.profile');

    const result = await signInWithPopup(firebaseAuth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Gagal mendapatkan token akses Drive dari Google Auth.');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Google Sign-In Error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const setAccessToken = (token: string | null) => {
  cachedAccessToken = token;
};

export const logout = async () => {
  try {
    const firebaseAuth = await getAuthInstance();
    if (firebaseAuth) {
      const { signOut } = await import('firebase/auth');
      await signOut(firebaseAuth);
    }
  } catch (err) {
    console.warn('[GoogleAuth] Logout error:', err);
  }
  cachedAccessToken = null;
};

