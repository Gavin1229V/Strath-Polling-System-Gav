import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ImageBackground, Alert } from "react-native";
import { useRouter } from "expo-router";
import { SERVER_IP } from "./config";
import { useAuth } from "./AuthContext";
const bgImage = require("../assets/images/StrathBG_Index.jpg");

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();
  const { setUser } = useAuth();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Email and password are required.");
      return;
    }

    try {
      const response = await fetch(`${SERVER_IP}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        const data = await response.json();
        const token = data.token;
        // Save the logged-in user with token, email, and role (returned from your API)
        setUser({ token, email, role: data.role });
        console.log("Received token:", token);
        Alert.alert("Success", "Logged in successfully.");
        // Redirect to home.tsx after successful login
        router.replace("/home");
      } else {
        const errorData = await response.json();
        Alert.alert("Error", errorData.message || "Invalid email or password.");
      }
    } catch (error) {
      Alert.alert("Error", "An error occurred. Please try again.");
    }
  };

  return (
    <ImageBackground source={bgImage} style={styles.bg}>
      <View style={styles.container}>
        <View style={styles.greyBox}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <View style={styles.contentWrapper}>
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
            />
            <TextInput
              style={styles.input}
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            <TouchableOpacity style={styles.button} onPress={handleLogin}>
              <Text style={styles.buttonText}>Login</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  bg: {
    flex: 1,
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent", // changed from "#fff"
  },
  // The grey background box
  greyBox: {
    backgroundColor: "rgba(240, 240, 240, 0.9)",
    paddingVertical: 40,
    paddingHorizontal: 30,
    borderRadius: 12,
    width: "80%",
    maxWidth: 350,
    alignItems: "center"
  },
  contentWrapper: {
    marginTop: 20,
  },
  input: {
    width: "100%",
    height: 40,
    borderColor: "#ccc",
    borderWidth: 1,
    paddingHorizontal: 10,
    marginBottom: 10,
    borderRadius: 6,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 40,
  },
  button: {
    backgroundColor: "#007AFF",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginVertical: 10,
    width: 200
  },
  buttonText: {
    color: "#FFF",
    fontSize: 18,
    textAlign: "center"
  },
  credit: {
    position: "absolute",
    bottom: 10,
    right: 10,
    fontSize: 10,
    color: "#FFF" // changed from "#000"
  },
  backButton: {
    position: "absolute",
    top: 10,
    left: 10,
    padding: 10,
  },
  backButtonText: {
    fontSize: 24,
    color: "#007AFF",
  }
});

export default LoginPage;