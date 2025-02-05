import { Stack } from "expo-router";
import { View, StyleSheet, TouchableOpacity, Text } from "react-native";
import { Link } from "expo-router";

export default function RootLayout() {
    return (
        <View style={styles.container}>
            {/* Stack Navigation */}
            <View style={styles.content}>
                <Stack>
                    <Stack.Screen name="index" options={{ title: "Home" }} />
                    <Stack.Screen name="pollScreen" options={{ title: "Poll Creation" }} />
                    <Stack.Screen name="pollView" options={{ title: "Poll Viewer" }} />
                </Stack>
            </View>

            {/* Bottom Navigation Bar */}
            <View style={styles.navbar}>
                <Link href="/" asChild>
                    <TouchableOpacity style={styles.navButton}>
                        <Text style={styles.navText}>Home</Text>
                    </TouchableOpacity>
                </Link>
                <Link href="/pollScreen" asChild>
                    <TouchableOpacity style={styles.navButton}>
                        <Text style={styles.navText}>Create Poll</Text>
                    </TouchableOpacity>
                </Link>
                <Link href="/pollView" asChild>
                    <TouchableOpacity style={styles.navButton}>
                        <Text style={styles.navText}>View Polls</Text>
                    </TouchableOpacity>
                </Link>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f5f5f5",
    },
    content: {
        flex: 1,
    },
    navbar: {
        flexDirection: "row",
        justifyContent: "space-around",
        alignItems: "center",
        height: 60,
        backgroundColor: "#007bff",
        width: "100%",
        position: "absolute",
        bottom: 0,
        borderTopWidth: 1,
        borderTopColor: "#ddd",
    },
    navButton: {
        padding: 10,
    },
    navText: {
        color: "#ffffff",
        fontSize: 16,
        fontWeight: "bold",
    },
});