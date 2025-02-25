import React, { createContext, useContext, useState, ReactNode } from "react";

interface AuthUser {
  token: string;
  email: string;
  role: number; // Added role field
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
  
  return (
    <AuthContext.Provider value={{ user, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);