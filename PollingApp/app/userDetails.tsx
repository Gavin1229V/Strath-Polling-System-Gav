import React, { createContext, useContext, useState, ReactNode } from "react";
import { SERVER_IP } from "./config";

interface AuthUser {
  login_id: number;
  user_id: number;
  email: string;
  password: string;
  role: number;
  is_verified: number;
  verification_key?: string | null;
  created_at: string;
  token: string;
}

interface AuthContextType {
  user: AuthUser | null;
  setUser: (user: AuthUser | null) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  setUser: () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);

  // Removed auto-fetch of account details to rely on login to set user.
  // Original code is commented out:
  /*
  useEffect(() => {
    const fetchAccountDetails = async () => {
      try {
        const response = await fetch(`${SERVER_IP}/api/accountDetails`);
        const data = await response.json();
        if (Array.isArray(data) && data.length) {
          setUser(data[0]);
        }
      } catch (error) {
        console.error("Error fetching account details:", error);
      }
    };
    fetchAccountDetails();
  }, []);
  */

  return (
    <AuthContext.Provider value={{ user, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

export const useUserRole = () => {
  const { user } = useAuth();
  return user?.role;
};

// New hooks to extract first and last names from user email
export const useFirstName = () => {
  const { user } = useAuth();
  if (user && user.email) {
    const parts = user.email.split(".");
    if (parts[0]) {
      return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
    }
  }
  return "";
};

export const useLastName = () => {
  const { user } = useAuth();
  if (user && user.email) {
    const parts = user.email.split(".");
    if (parts.length > 1 && parts[1]) {
      return parts[1].charAt(0).toUpperCase() + parts[1].slice(1);
    }
  }
  return "";
};