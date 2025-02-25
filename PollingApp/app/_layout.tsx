import React from "react";
import { Stack, usePathname, Link } from "expo-router";
import { View, StyleSheet, TouchableOpacity, Text } from "react-native";
import { AuthProvider, useAuth } from "./AuthContext";

function InnerLayout() {
  const { user } = useAuth();
  const pathname = usePathname();

  // Define routes where the navbar should be hidden
  const hideNavBarRoutes = ["/", "/login", "/register_page"];
  const shouldHideNavBar = hideNavBarRoutes.includes(pathname);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Stack>
          <Stack.Screen
            name="index"
            options={{
              title: "Welcome",
              headerBackVisible: false,
            }}
          />
          <Stack.Screen
            name="login"
            options={{
              title: "Login",
              headerBackVisible: true,
            }}
          />
          <Stack.Screen
            name="register_page"
            options={{
              title: "Register",
              headerBackVisible: true,
            }}
          />
          <Stack.Screen
            name="home"
            options={{
              title: "Home",
              headerBackVisible: false,
              headerLeft: () => null,
            }}
          />
          <Stack.Screen
            name="pollScreen"
            options={{
              title: "Poll Creation",
              headerBackVisible: false,
              headerLeft: () => null,
            }}
          />
          <Stack.Screen
            name="pollView"
            options={{
              title: "Poll Viewer",
              headerBackVisible: false,
              headerLeft: () => null,
            }}
          />
        </Stack>
      </View>

      {/* Render the bottom nav bar only if the current route is not in hideNavBarRoutes */}
      {!shouldHideNavBar && (
        <View style={styles.navbar}>
          <Link href="/home" asChild>
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
      )}
    </View>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <InnerLayout />
    </AuthProvider>
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