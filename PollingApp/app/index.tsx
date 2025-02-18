import React from "react";
import { View, Text, Image, TouchableOpacity } from "react-native";
import { Link } from "expo-router";
import styles from "./styles";

const HomeScreen = () => {
  return (
    <View style={styles.homeContainer}>
      <View style={styles.profileContainer}>
        <Image
          style={styles.profilePic}
          source={{ uri: "https://via.placeholder.com/100" }}
        />
        <Text style={styles.profileName}>Person's Name</Text>
      </View>
      <Text style={styles.homeHeader}>You are a Student</Text>
      <Link href="/register_page" asChild>
        <TouchableOpacity style={styles.button}>
          <Text style={styles.buttonText}>Register</Text>
        </TouchableOpacity>
      </Link>
    </View>
  );
};

export default HomeScreen;