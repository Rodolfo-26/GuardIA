import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from "firebase/auth";
import { firebaseAuth } from "../lib/firebase";
import { ensureUserProfile, registerUserLogin, registerUserLogout } from "../services/users";

type AuthContextType = {
  user: User | null;
  isAuthReady: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ ok: boolean; message?: string }>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, (nextUser) => {
      if (nextUser) {
        void ensureUserProfile(nextUser);
      }
      setUser(nextUser);
      setIsAuthReady(true);
    });

    return () => unsubscribe();
  }, []);

  async function login(email: string, password: string) {
    try {
      const credentials = await signInWithEmailAndPassword(firebaseAuth, email, password);
      await registerUserLogin(credentials.user);
      return { ok: true };
    } catch (error) {
      const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";

      if (code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/user-not-found") {
        return { ok: false, message: "Credenciales incorrectas" };
      }

      if (code === "auth/too-many-requests") {
        return { ok: false, message: "Demasiados intentos. Intenta nuevamente en unos minutos." };
      }

      return { ok: false, message: "No fue posible iniciar sesion. Verifica la configuracion de Firebase." };
    }
  }

  async function logout() {
    if (firebaseAuth.currentUser) {
      await registerUserLogout(firebaseAuth.currentUser);
    }
    await signOut(firebaseAuth);
  }

  const value = useMemo(
    () => ({
      user,
      isAuthReady,
      isAuthenticated: Boolean(user),
      login,
      logout,
    }),
    [isAuthReady, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
