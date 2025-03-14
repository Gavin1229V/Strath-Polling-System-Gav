import React, { useEffect } from "react";
import { Stack, usePathname, useRouter } from "expo-router";
import { View, StyleSheet } from "react-native";
import { AuthProvider, useAuth } from "./userDetails";
import NavBar from "../components/NavBar"; // updated import path

function InnerLayout() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();

  // Redirect to home if logged in and on index route
  useEffect(() => {
    if (user && (pathname === "/" || pathname === "/index")) {
      router.replace("/home");
    }
  }, [user, pathname]);

  const hideNavBarRoutes = ["/", "/login", "/registerPage"];
  const shouldHideNavBar = hideNavBarRoutes.includes(pathname);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Stack
          screenOptions={{
            animation: "none",
            headerStyle: { backgroundColor: "#094183" },
            headerTintColor: "#ffffff",
          }}
        >
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
              headerBackVisible: false,
              headerLeft: () => null,
            }}
          />
          <Stack.Screen
            name="classChooser"
            options={{
              title: "Choose Your Classes Here",
              headerBackVisible: true,
            }}
          />
          <Stack.Screen
            name="pollCreator"
            options={{
              title: "Poll Creation",
              headerBackVisible: false,
              headerLeft: () => null,
            }}
          />
          <Stack.Screen
            name="pollView"
            options={{
              title: "Your Polls",
              headerBackVisible: false,
              headerLeft: () => null,
            }}
          />
          <Stack.Screen
            name="settings"
            options={{
              title: "Settings",
              headerBackVisible: true,
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