"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { onAuthStateChanged, getRedirectResult, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { checkWhitelist, ensureUserProfile } from "@/lib/firestore";


interface AuthContextType {
  user: User | null;
  isWhitelisted: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isWhitelisted: false,
  loading: true,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isWhitelisted, setIsWhitelisted] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Handle the result of signInWithRedirect when user returns from Google
    getRedirectResult(auth).catch((err) => {
      if (err?.code !== "auth/null-user") {
        console.error("Redirect result error:", err);
      }
    });

    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
          await ensureUserProfile(u);
          const wl = await checkWhitelist(u.email ?? "");
          setIsWhitelisted(wl);
        } catch (err) {
          console.error("Firestore error (is DB created?):", err);
          // If Firestore isn't ready, allow access temporarily
          setIsWhitelisted(false);
        }
      } else {
        setIsWhitelisted(false);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  return (
    <AuthContext.Provider value={{ user, isWhitelisted, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
