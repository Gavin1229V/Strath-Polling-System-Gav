import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, ImageBackground } from "react-native";
import { useRouter } from "expo-router";
// Import background image
const bgImage = require("../assets/images/StrathBG_Index.jpg");

const StartPage = () => {
  const router = useRouter();

  return (
    <ImageBackground source={bgImage} style={styles.bg}>
      <View style={styles.container}>
        {/* Grey box container */}
        <View style={styles.greyBox}>
          <Text style={styles.title}>Welcome to Simpoll!</Text>
          <TouchableOpacity style={styles.button} onPress={() => router.push("./login")}>
            <Text style={styles.buttonText}>Login</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={() => router.push("./registerPage")}>
            <Text style={styles.buttonText}>Register</Text>
          </TouchableOpacity>
        </View>
      </View>
      <Text style={styles.credit}>A 4th year project by Gavin Verma            </Text>
    </ImageBackground>
  );
};

export default StartPage;

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
});