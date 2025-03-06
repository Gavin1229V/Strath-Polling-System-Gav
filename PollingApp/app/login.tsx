import React, { useState, useEffect } from "react";
import { SafeAreaView, View, Text, TextInput, TouchableOpacity, ImageBackground, Alert, Dimensions, ActivityIndicator, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter } from "expo-router";
import { SERVER_IP } from "./config";
import { useAuth } from "./userDetails";
import { Asset } from "expo-asset";
import authStyles from "../styles/authStyles";
const bgImage = require("../assets/images/StrathBG_Index.jpg");

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [imageLoaded, setImageLoaded] = useState(false);
  const router = useRouter();
  const { setUser } = useAuth();

  useEffect(() => {
    Asset.loadAsync(bgImage).then(() => setImageLoaded(true));
  }, []);

  // Updated helper: now using data.userDetails from the backend response
  const putUserDetails = (data: any, password: string) => {
    const userDetails = data.userDetails;
    setUser({ 
      token: data.token,
      email: userDetails.email,
      role: userDetails.role,
      login_id: userDetails.login_id,
      user_id: userDetails.user_id,
      password, 
      is_verified: userDetails.is_verified,
      created_at: userDetails.created_at
    });
  };

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
        putUserDetails(data, password);
        console.log("Received token:", data.token);
        console.log("User details:", data);
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

  if (!imageLoaded) {
    return (
      <View style={[authStyles.bg, {justifyContent: "center", alignItems: "center"}]}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <ImageBackground source={bgImage} style={authStyles.bg} resizeMode="cover">
      <SafeAreaView style={authStyles.safeArea}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <View style={authStyles.container}>
            <View style={authStyles.greyBox}>
              <View style={authStyles.contentWrapper}>
                <TextInput
                  style={authStyles.input}
                  placeholder="Email"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                />
                <TextInput
                  style={authStyles.input}
                  placeholder="Password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
                <TouchableOpacity style={authStyles.button} onPress={handleLogin}>
                  <Text style={authStyles.buttonText}>Login</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ImageBackground>
  );
};

export default LoginPage;