import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ImageBackground,
  Alert,
  Dimensions,
  ActivityIndicator,
  Animated,    // 1) Import Animated
  Easing,
} from "react-native";
// Remove Slider import
// import Slider from "@react-native-community/slider";

import { useRouter } from "expo-router";
import { SERVER_IP } from "./config";
import { useAuth } from "./userDetails";
import { Asset } from "expo-asset";
import authStyles from "../styles/authStyles";

const bgImage = require("../assets/images/StrathBG_Index.jpg");

const computeEntropy = (pwd: string): number => {
  let pool = 0;
  if (/[a-z]/.test(pwd)) pool += 26;
  if (/[A-Z]/.test(pwd)) pool += 26;
  if (/[0-9]/.test(pwd)) pool += 10;
  if (/[^a-zA-Z0-9]/.test(pwd)) pool += 33;
  return pwd.length * Math.log2(pool || 1);
};

const getStrength = (entropy: number): string => {
  if (entropy < 40) return "Weak";
  if (entropy < 60) return "Moderate";
  return "Strong";
};

const getSliderColor = (value: number): string => {
  const frac = Math.min(Math.max(value / 100, 0), 1);
  const r = Math.round(255 * (1 - frac));
  const g = Math.round(255 * frac);
  return `rgb(${r}, ${g}, 0)`;
};

const RegisterPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [imageLoaded, setImageLoaded] = useState(false);
  const router = useRouter();
  const { setUser } = useAuth();

  // Keep the Animated.Value for password strength
  const animatedStrength = useRef(new Animated.Value(0)).current;
  
  // New Animated.Value for password match slider
  const matchAnim = useRef(new Animated.Value(0)).current;

  // 1) Always run this (even if image isn't loaded yet)
  useEffect(() => {
    Asset.loadAsync(bgImage).then(() => setImageLoaded(true));
  }, []);

  // 2) Always run this too (it will animate only if needed)
  useEffect(() => {
    Animated.timing(animatedStrength, {
      toValue: Math.min(computeEntropy(password), 100),
      duration: 300,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start();
  }, [password]);

  // New useEffect for password match slider
  useEffect(() => {
    const toValue = confirmPassword.length > 0 && password === confirmPassword ? 100 : 0;
    Animated.timing(matchAnim, {
      toValue,
      duration: 300,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start();
  }, [password, confirmPassword]);

  const handleRegister = async () => {
    if (!email || !password || !confirmPassword) {
      Alert.alert("Error", "All fields are required.");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match.");
      return;
    }

    const entropy = computeEntropy(password);
    if (entropy < 60) {
      Alert.alert("Error", "Password is too weak.");
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

  // 3) If image isn’t loaded, just render a loader—but AFTER the hooks
  if (!imageLoaded) {
    return (
      <View
        style={[authStyles.bg, { justifyContent: "center", alignItems: "center" }]}
      >
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  // 4) Now do the normal render if image is loaded
  const passwordEntropy = computeEntropy(password);
  const sliderValue = Math.min(passwordEntropy, 100);
  const sliderColor = getSliderColor(sliderValue);
  const passwordStrength = getStrength(passwordEntropy);
  const animatedWidth = animatedStrength.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"],
  });

  // In render, compute animated width for match slider:
  const animatedMatchWidth = matchAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"],
  });

  return (
    <ImageBackground source={bgImage} style={authStyles.bg}>
      <View style={authStyles.container}>
        <View style={authStyles.greyBox}>
          <View style={authStyles.contentWrapper}>
            <TextInput
              style={authStyles.input}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <TextInput
              style={authStyles.input}
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            {/* Container for progress bar followed by strength label */}
            <View style={{ width: "95%" }}>
              <View
                style={{
                  width: "100%",
                  height: 6,
                  backgroundColor: "#ccc",
                  borderRadius: 3,
                  marginVertical: 10,
                }}
              >
                <Animated.View
                  style={{
                    width: animatedWidth,
                    height: "100%",
                    backgroundColor: sliderColor,
                    borderRadius: 3,
                  }}
                />
              </View>
              <Text style={[authStyles.passwordStrength, { color: sliderColor, marginLeft: 10 }]}>
                {passwordStrength}
              </Text>
            </View>
            <TextInput
              style={authStyles.input}
              placeholder="Confirm Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />
            {(
              // Compute match status variables
              () => {
                const passwordMatchText =
                  confirmPassword.length === 0
                    ? "Please confirm password"
                    : password === confirmPassword
                    ? "Passwords match"
                    : "Passwords do not match";
                const passwordMatchColor =
                  confirmPassword.length === 0
                    ? "#ccc"
                    : password === confirmPassword
                    ? "green"
                    : "red";
                return (
                  <View style={{ width: "95%" }}>
                    <View
                      style={{
                        width: "100%",
                        height: 6,
                        backgroundColor: "#ccc",
                        borderRadius: 3,
                        marginBottom: 10,
                      }}
                    >
                      <Animated.View
                        style={{
                          width: animatedMatchWidth,
                          height: "100%",
                          backgroundColor: passwordMatchColor,
                          borderRadius: 3,
                        }}
                      />
                    </View>
                    <Text style={[authStyles.passwordStrength, { color: passwordMatchColor, marginLeft: 10 }]}>
                      {passwordMatchText}
                    </Text>
                  </View>
                );
              }
            )()}
            <TouchableOpacity style={authStyles.button} onPress={handleRegister}>
              <Text style={authStyles.buttonText}>Register</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={() => router.replace("/login")}>
            <Text style={authStyles.switchText}>Already have an account? Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ImageBackground>
  );
};

export default RegisterPage;