import React from "react";
import { Stack, usePathname, Link, useRouter } from "expo-router";
import { View, StyleSheet, TouchableOpacity, Text } from "react-native";
import { AuthProvider, useAuth } from "./AuthContext";

function InnerLayout() {
  const { user, setUser } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const hideNavBarRoutes = ["/", "/login", "/registerPage"];
  const shouldHideNavBar = hideNavBarRoutes.includes(pathname);

  return (
    <View style={styles.container}>
      {user && pathname === "/home" && (
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={() => {
            setUser(null);
            router.replace("/"); // Redirect to index on logout
          }}
        >
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      )}
      <View style={styles.content}>
        <Stack>
          <Stack.Screen
            name="index"
            options={{
              title: "Welcome",
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
            headerShown: false,
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
  logoutButton: {
    position: "absolute",
    top: 10,
    right: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#FF3B30",
    borderRadius: 5,
    zIndex: 1,
  },
  logoutText: {
    color: "#fff",
    fontWeight: "bold",
  },
});