import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useAuth } from "./userDetails";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SERVER_IP } from "./config";
import styles from "../styles/styles"; // Import global styles

const Settings = () => {
  const { user, setUser } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    setUser(null);
    router.replace("/");
  };

  const handleRemoveProfilePic = async () => {
    if (user && user.profile_picture) {
      const response = await fetch(`${SERVER_IP}/api/removeProfilePicture`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.user_id }),
      });
      const data = await response.json();
      if (data.success) {
        await AsyncStorage.removeItem("profile_picture");
        setUser({ ...user, profile_picture: undefined });
        router.replace("/");  // added redirect to home
      } else {
        console.error("Error removing profile picture:", data.error);
      }
    }
  };

  return (
    <View style={styles.container}>
      {/* Put Change Classes button at the top and use blue styling */}
      <TouchableOpacity style={styles.button} onPress={() => router.push("/classChooser")}>
        <Text style={styles.buttonText}>Change Classes</Text>
      </TouchableOpacity>
      {/* Remove Profile Picture Button remains below */}
      <TouchableOpacity 
        style={[styles.button, { backgroundColor: "#FF3B30" }]} 
        onPress={handleRemoveProfilePic}
      >
        <Text style={styles.buttonText}>Remove Profile Picture</Text>
      </TouchableOpacity>
      {/* Logout Button */}
      <TouchableOpacity 
        style={[styles.button, { backgroundColor: "#FF3B30" }]} 
        onPress={handleLogout}
      >
        <Text style={styles.buttonText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
};

export default Settings;
