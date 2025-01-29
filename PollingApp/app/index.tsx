import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Link } from "expo-router";

const HomeScreen = () => {
    return (
        <View style={styles.container}>
            <Text style={styles.header}>Home Screen</Text>
            <Link href="/pollScreen" style={styles.button}>
                <Text style={styles.buttonText}>Go to Poll Creation Screen</Text>
            </Link>
            <Link href="/pollView" style={styles.button}>
                <Text style={styles.buttonText}>View Polls</Text>
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
        marginBottom: 20,
    },
    button: {
        backgroundColor: "#007bff",
        padding: 10,
        borderRadius: 5,
        alignItems: "center",
        marginTop: 10,
    },
    buttonText: {
        color: "#ffffff",
        fontSize: 16,
    },
});