import React from "react";
import { Stack, usePathname, useRouter } from "expo-router";
import { View, StyleSheet, TouchableOpacity, Text } from "react-native";
import { AuthProvider, useAuth } from "./userDetails";
import NavBar from "../components/NavBar"; // updated import path

function InnerLayout() {
  const pathname = usePathname();

  const hideNavBarRoutes = ["/", "/login", "/registerPage"];
  const shouldHideNavBar = hideNavBarRoutes.includes(pathname);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Stack>
          <Stack.Screen
            name="index"
            options={{
              title: "Welcome",
              headerShown: false,
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
            name="registerPage"
            options={{
              title: "Register",
              headerBackVisible: true,
            }}
          />
          <Stack.Screen
            name="home"
            options={{
            title: "Home",
            headerBackVisible: true,
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
      <NavBar />
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
});