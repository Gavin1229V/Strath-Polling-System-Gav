import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
  Alert,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { SERVER_IP } from "./config";
import { useAuth } from "./userDetails";
import { Asset } from "expo-asset";

const bgImage = require("../assets/images/StrathBG_Index.jpg");

const RegisterPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [imageLoaded, setImageLoaded] = useState(false);
  const router = useRouter();
  const { setUser } = useAuth();

  useEffect(() => {
    Asset.loadAsync(bgImage).then(() => setImageLoaded(true));
  }, []);

  const handleRegister = async () => {
    if (!email || !password || !confirmPassword) {
      Alert.alert("Error", "All fields are required.");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match.");
      return;
    }

    try {
      const response = await fetch(`${SERVER_IP}/api/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        const data = await response.json();
        const token = data.token;
        setUser({
          token,
          email,
          password,
          role: data.role,
          login_id: data.login_id,
          user_id: data.user_id,
          is_verified: data.is_verified,
          created_at: data.created_at,
        });
        Alert.alert("Success", "Registered successfully.");
        router.replace("/home");
      } else {
        const errorData = await response.json();
        Alert.alert("Error", errorData.message || "Registration failed.");
      }
    } catch (error) {
      Alert.alert("Error", "An error occurred. Please try again.");
    }
  };

  if (!imageLoaded) {
    return (
      <View style={[styles.bg, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <ImageBackground source={bgImage} style={styles.bg}>
      <View style={styles.container}>
        <View style={styles.greyBox}>
          <Text style={styles.title}>Register</Text>
          <View style={styles.contentWrapper}>
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
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
          <TouchableOpacity onPress={() => router.replace("/login")}>
            <Text style={styles.switchText}>Already have an account? Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ImageBackground>
  );
};

const { width, height } = Dimensions.get("window");

const styles = StyleSheet.create({
  bg: {
    flex: 1,
    width: width,
    height: height,
    resizeMode: "cover",
  },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  greyBox: {
    backgroundColor: "rgba(240, 240, 240, 0.9)",
    paddingVertical: 40,
    paddingHorizontal: 30,
    borderRadius: 12,
    width: "80%",
    maxWidth: 350,
    alignItems: "center",
  },
  contentWrapper: {
    marginTop: 20,
    width: "100%",
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
    marginBottom: 20,
  },
  button: {
    backgroundColor: "#007AFF",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginVertical: 10,
    width: "100%",
    alignItems: "center",
  },
  buttonText: {
    color: "#FFF",
    fontSize: 18,
    textAlign: "center",
  },
  switchText: {
    marginTop: 10,
    fontSize: 14,
    color: "#007AFF",
  },
});

export default RegisterPage;