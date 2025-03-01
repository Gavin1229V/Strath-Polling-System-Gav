import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert, ImageBackground, StyleSheet } from "react-native";
import { SERVER_IP } from "./config";
const bgImage = require("../assets/images/StrathBG_Index.jpg");

const RegisterPage: React.FC = () => {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");

  const handleRegister = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Email and password are required.");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match.");
      return;
    }

    try {
      // Replace with the URL for your backend register endpoint.
      const response = await fetch(`${SERVER_IP}/api/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        Alert.alert("Registration Error", errorData.message || "Registration failed");
        return;
      }

      await response.json();
      Alert.alert("Success", "User registered successfully!");
      // Optionally, navigate to another screen on success.
    } catch (error) {
      console.error("Registration error:", error);
      Alert.alert("Error", "An error occurred during registration.");
    }
  };

  return (
    <ImageBackground source={bgImage} style={styles.bg}>
      <View style={styles.container}>
        <View style={styles.greyBox}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          <TextInput
            style={styles.input}
            placeholder="Confirm Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
          />
          <TouchableOpacity style={styles.button} onPress={handleRegister}>
            <Text style={styles.buttonText}>Register</Text>
          </TouchableOpacity>
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
  }
});
export default RegisterPage;