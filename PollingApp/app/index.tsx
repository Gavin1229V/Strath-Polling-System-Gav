import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, ImageBackground, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { Asset } from "expo-asset";
import authStyles from "../styles/authStyles";

const bgImage = require("../assets/images/StrathBG_Index.jpg");

const StartPage = () => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const router = useRouter();

  // Simplified asset loading
  useEffect(() => {
    Asset.loadAsync(bgImage).then(() => setImageLoaded(true));
  }, []);

  // Early return pattern for loading state
  if (!imageLoaded) {
    return (
      <View style={authStyles.bg}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  // Main component rendering
  return (
    <ImageBackground source={bgImage} style={authStyles.bg}>
      <View style={authStyles.container}>
        <View style={authStyles.greyBox}>
          <Text style={authStyles.title}>Welcome to Simpoll!</Text>
          
          {/* Navigation buttons */}
          {['login', 'registerPage'].map((route, i) => (
            <TouchableOpacity 
              key={route}
              style={authStyles.button} 
              onPress={() => router.push(`./${route}`)}
            >
              <Text style={authStyles.buttonText}>{i === 0 ? 'Login' : 'Register'}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      <Text style={authStyles.credit}>A 4th year project by Gavin Verma</Text>
    </ImageBackground>
  );
};

export default StartPage;