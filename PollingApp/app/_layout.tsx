import React, { useEffect } from "react";
import { Stack, usePathname, useRouter } from "expo-router";
import { View, StyleSheet } from "react-native";
import { AuthProvider, useAuth } from "./components/userDetails";
import NavBar from "./components/NavBar";

function InnerLayout() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();

  // Redirect to home if logged in and on index route
  useEffect(() => {
    if (user && (pathname === "/" || pathname === "/auth/index")) {
      router.replace("/components/home");
    }
  }, [user, pathname]);


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
            name="auth/login"
            options={{
              title: "Login",
              headerBackVisible: true,
            }}
          />
          <Stack.Screen
            name="auth/registerPage"
            options={{
              title: "Register",
              headerBackVisible: true,
            }}
          />
          <Stack.Screen
            name="components/home"
            options={{
              title: "Home",
              headerBackVisible: false,
              headerLeft: () => null,
            }}
          />
          <Stack.Screen
            name="components/classChooser"
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
            name="polling/pollView"
            options={{
              title: "Your Polls",
              headerBackVisible: false,
              headerLeft: () => null,
            }}
          />
          <Stack.Screen
            name="components/settings"
            options={{
              title: "Settings",
              headerBackVisible: true,
            }}
          />
          <Stack.Screen
            name="election/elections"
            options={{
              title: "Student Elections",
              headerBackVisible: false,
              headerLeft: () => null,
            }}
          />
          <Stack.Screen
            name="election/electionDetail"
            options={{
              title: "Election Details",
              headerBackVisible: true,
            }}
          />
          <Stack.Screen
            name="createElection"
            options={{
              title: "Create Election",
              headerBackVisible: true,
            }}
          />
          <Stack.Screen
            name="polling/expiredPolls"
            options={{
              title: "Expired Polls",
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