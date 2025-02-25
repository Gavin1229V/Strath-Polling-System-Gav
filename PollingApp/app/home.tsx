import React from "react";
import { View, Text, Image } from "react-native";
import { useAuth } from "./AuthContext";
import styles from "./styles";

const roleOptions = [
  { label: "Student", value: 1 },
  { label: "Student Rep", value: 2 },
  { label: "Lecturer", value: 3 },
];

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
          source={{ uri: "https://via.placeholder.com/200" }}
        />
        <Text style={styles.profileName}>Welcome, {firstName}</Text>
      </View>
    </View>
  );
};

export default HomeScreen;