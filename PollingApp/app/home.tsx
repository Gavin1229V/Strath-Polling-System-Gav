import React from "react";
import { View, Text, Image, StyleSheet } from "react-native";
import { useAuth } from "./AuthContext";

const HomeScreen = () => {
  const { user } = useAuth();

  const rawFirstName =
    user && user.email ? user.email.split(".")[0] : "";
  const firstName =
    rawFirstName.length > 0
      ? rawFirstName.charAt(0).toUpperCase() + rawFirstName.slice(1)
      : "";

  return (
    <View style={styles.homeContainer}>
      <View style={styles.profileContainer}>
        <Image
          style={styles.profilePic}
          source={{ uri: "https://via.placeholder.com/200.png" }} // Updated URI with .png extension
          onError={(e) => console.error("Image load error:", e.nativeEvent.error)}
        />
        <Text style={styles.profileName}>Welcome, {firstName}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  homeContainer: {
    flex: 1,
    justifyContent: "flex-start", // Changed from "center"
    alignItems: "center",
    paddingTop: 50, // Added top padding to adjust vertical position
  },
  profileContainer: {
    alignItems: "center",
  },
  profilePic: {
    width: 200,
    height: 200,
    borderRadius: 100, // makes it round
  },
  profileName: {
    fontSize: 24,
    marginTop: 16,
  },
});

export default HomeScreen;