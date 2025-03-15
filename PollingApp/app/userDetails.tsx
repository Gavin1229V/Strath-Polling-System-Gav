import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
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
  profile_picture?: string; // Added optional profile_picture property
  classes?: string; // Added property to store user classes
  year_group?: number; // Added property to store user's academic year
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
  const [user, setUserState] = useState<AuthUser | null>(null);

  // Update setUser to store profile_picture as a JSON string
  const setUser = async (userData: AuthUser | null) => {
    setUserState(userData);
    if (userData) {
      const { profile_picture, ...userToStore } = userData;
      await AsyncStorage.setItem("user", JSON.stringify(userToStore));
      if (profile_picture) {
        // Store profile_picture as a string via JSON.stringify
        await AsyncStorage.setItem("profile_picture", JSON.stringify(profile_picture));
      } else {
        await AsyncStorage.removeItem("profile_picture");
      }
    } else {
      await AsyncStorage.removeItem("user");
      await AsyncStorage.removeItem("profile_picture");
    }
  };

  // On provider mount, load the stored user and the separate profile picture
  useEffect(() => {
    const loadUser = async () => {
      const storedUser = await AsyncStorage.getItem("user");
      const storedPic = await AsyncStorage.getItem("profile_picture");
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        if (storedPic) {
          parsedUser.profile_picture = storedPic;
        }
        setUserState(parsedUser);
      }
    };
    loadUser();
  }, []);

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
    return getFirstNameFromEmail(user.email);
  }
  return "";
};

export const useLastName = () => {
  const { user } = useAuth();
  if (user && user.email) {
    return getLastNameFromEmail(user.email);
  }
  return "";
};

// Utility functions for extracting names from any email
export const getFirstNameFromEmail = (email: string): string => {
  const parts = email.split(".");
  return parts[0] ? parts[0].charAt(0).toUpperCase() + parts[0].slice(1) : "";
};

export const getLastNameFromEmail = (email: string): string => {
  const parts = email.split(".");
  if (parts.length > 1) {
    const lastNamePart = parts[1].split("@")[0];
    return lastNamePart.charAt(0).toUpperCase() + lastNamePart.slice(1);
  }
  return "";
};

// New hook to extract user classes as an array for display
export const useUserClasses = () => {
  const { user } = useAuth();
  return user?.classes ? user.classes.split(",") : [];
};

export default {}; // Added default export to suppress warning