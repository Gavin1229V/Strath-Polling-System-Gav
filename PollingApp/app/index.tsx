import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, ImageBackground, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { Asset } from "expo-asset";
import authStyles from "../styles/authStyles";
const bgImage = require("../assets/images/StrathBG_Index.jpg");

const StartPage = () => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const router = useRouter();

  useEffect(() => {
    Asset.loadAsync(bgImage).then(() => setImageLoaded(true));
  }, []);

  if (!imageLoaded) {
    return (
      <View style={authStyles.bg}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <ImageBackground source={bgImage} style={authStyles.bg}>
      <View style={authStyles.container}>
        {/* Grey box container */}
        <View style={authStyles.greyBox}>
          <Text style={authStyles.title}>Welcome to Simpoll!</Text>
          <TouchableOpacity style={authStyles.button} onPress={() => router.push("./login")}>
            <Text style={authStyles.buttonText}>Login</Text>
          </TouchableOpacity>
          <TouchableOpacity style={authStyles.button} onPress={() => router.push("./registerPage")}>
            <Text style={authStyles.buttonText}>Register</Text>
          </TouchableOpacity>
        </View>
      </View>
      <Text style={authStyles.credit}>A 4th year project by Gavin Verma            </Text>
    </ImageBackground>
  );
};

export default StartPage;