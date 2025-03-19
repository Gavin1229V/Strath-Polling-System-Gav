import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SERVER_IP } from "../config";

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

  // Store the complete user object in AsyncStorage without splitting
  const setUser = async (userData: AuthUser | null) => {
    setUserState(userData);
    if (userData) {
      try {
        // Store the entire user object in one AsyncStorage item
        await AsyncStorage.setItem("userData", JSON.stringify(userData));
        console.log("User data saved to AsyncStorage");
      } catch (error) {
        console.error("Failed to save user data:", error);
      }
    } else {
      // If userData is null, this is a logout operation
      await logout();
    }
  };

  // New function to handle logout and clear user data
  const logout = async () => {
    try {
      await AsyncStorage.removeItem("userData");
      // Clear any other user-related data from AsyncStorage
      console.log("User data removed from AsyncStorage");
    } catch (error) {
      console.error("Failed to clear user data:", error);
    }
  };

  // On provider mount, load the complete stored user data
  useEffect(() => {
    const loadUser = async () => {
      try {
        const storedUserData = await AsyncStorage.getItem("userData");
        if (storedUserData) {
          const parsedUser = JSON.parse(storedUserData);
          setUserState(parsedUser);
          console.log("User data loaded from AsyncStorage");
        }
      } catch (error) {
        console.error("Failed to load user data:", error);
        // In case of error, ensure we clear potentially corrupted data
        await AsyncStorage.removeItem("userData");
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

// Make the logout function available in the context
export const useLogout = () => {
  const { setUser } = useAuth();
  
  return async () => {
    // Clear user from context
    setUser(null);
  };
};

export default {}; // Added default export to suppress warning