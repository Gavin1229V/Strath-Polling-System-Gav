import React from "react";
import { View, Text, Image } from "react-native";
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
        </View>
    );
};

export default HomeScreen;