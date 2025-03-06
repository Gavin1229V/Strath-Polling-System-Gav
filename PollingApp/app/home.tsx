import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useAuth, useFirstName, useLastName } from "./userDetails";
import { useRouter } from "expo-router";

const HomeScreen = () => {
  const { user, setUser } = useAuth();
  const router = useRouter();
  
  const firstName = useFirstName();
  const lastName = useLastName();
  
  return (
    <View style={styles.homeContainer}>
      <View style={styles.profileContainer}>
        <Text style={styles.profileName}>
          Welcome, {firstName} {lastName}
        </Text>
      </View>
      {user && (
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={() => {
            setUser(null);
            router.replace("/");
          }}
        >
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  homeContainer: {
    flex: 1,
    justifyContent: "flex-start",
    alignItems: "center",
    paddingTop: 50,
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
  logoutButton: {
    backgroundColor: "#FF3B30",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 5,
    marginTop: 20,
  },
  logoutText: {
    color: "#FFF",
    fontWeight: "bold",
  },
});

export default HomeScreen;