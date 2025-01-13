import React from "react";
import { View, Text, Button, StyleSheet } from "react-native";
import { Link } from "expo-router";

const HomeScreen = () => {
    return (
        <View style={styles.container}>
            <Text style={styles.header}>Home Screen</Text>
            <Link href="/pollScreen" style={styles.button}>
                Go to Poll
            </Link>
        </View>
    );
};

export default HomeScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#f5f5f5",
    },
    header: {
        fontSize: 24,
        fontWeight: "bold",
    },
    button: {
        marginTop: 20,
        padding: 10,
        backgroundColor: "#007bff",
        color: "#fff",
        borderRadius: 5,
        textAlign: "center",
    },
});