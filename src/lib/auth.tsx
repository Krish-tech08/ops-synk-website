import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from "firebase/auth";
import { config } from "../config";

export interface SessionUser { uid: string; email: string | null }
interface AuthState {
  user: SessionUser | null;
  ready: boolean;
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  /** Fresh bearer token for API calls (Firebase refreshes it automatically). */
  getToken(forceRefresh?: boolean): Promise<string | null>;
}

const Ctx = createContext<AuthState | null>(null);
let app: FirebaseApp | null = null;
const firebaseAuth = () => {
  app ??= initializeApp(config.firebase);
  return getAuth(app);
};
const DEV_KEY = "opssynk.devUid";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [fbUser, setFbUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (config.authMode === "dev") {
      const uid = sessionStorage.getItem(DEV_KEY);
      setUser(uid ? { uid, email: `${uid} (dev)` } : null);
      setReady(true);
      return;
    }
    return onAuthStateChanged(firebaseAuth(), (u) => {
      setFbUser(u);
      setUser(u ? { uid: u.uid, email: u.email } : null);
      setReady(true);
    });
  }, []);

  const value = useMemo<AuthState>(() => ({
    user, ready,
    async signIn(email, password) {
      if (config.authMode === "dev") {
        const uid = email.trim() || "demo-owner";
        sessionStorage.setItem(DEV_KEY, uid);
        setUser({ uid, email: `${uid} (dev)` });
        return;
      }
      await signInWithEmailAndPassword(firebaseAuth(), email, password);
    },
    async signOut() {
      if (config.authMode === "dev") { sessionStorage.removeItem(DEV_KEY); setUser(null); return; }
      await signOut(firebaseAuth());
    },
    async getToken(force = false) {
      if (config.authMode === "dev") return user ? `dev:${user.uid}` : null;
      return fbUser ? fbUser.getIdToken(force) : null;
    },
  }), [user, fbUser, ready]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth outside AuthProvider");
  return v;
}

export function friendlyAuthError(e: unknown): string {
  const code = (e as { code?: string })?.code ?? "";
  if (/invalid-credential|wrong-password|user-not-found|invalid-email/.test(code)) return "Email or password is incorrect.";
  if (/too-many-requests/.test(code)) return "Too many attempts. Wait a moment and try again.";
  if (/network/.test(code)) return "Network error. Check your connection.";
  if (/api-key|configuration/.test(code)) return "Firebase is not configured. Check the VITE_FIREBASE_* settings.";
  return "Sign-in failed. Please try again.";
}
