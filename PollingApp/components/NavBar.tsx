import React from "react";
import { View, StyleSheet, TouchableOpacity, Text } from "react-native";
import { usePathname, useRouter } from "expo-router";
// Replace useAuth import with the role hook import
import { useUserRole } from "../app/userDetails";

const hideNavBarRoutes = ["/", "/login", "/registerPage"];

const NavBar = () => {
  const pathname = usePathname();
  const router = useRouter();
  // Fetch the role using the hook
  const userRole = useUserRole();
  const shouldHideNavBar = hideNavBarRoutes.includes(pathname);
  if (shouldHideNavBar) return null;

  return (
    <View style={styles.navbar}>
      <TouchableOpacity style={styles.navButton} onPress={() => router.replace("/home")}>
        <Text style={styles.navText}>Home</Text>
      </TouchableOpacity>
      {userRole !== 1 && (
        <TouchableOpacity style={styles.navButton} onPress={() => router.replace("/pollCreator")}>
          <Text style={styles.navText}>Create Poll</Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity style={styles.navButton} onPress={() => router.replace("/pollView")}>
        <Text style={styles.navText}>View Polls</Text>
      </TouchableOpacity>
    </View>
  );
};

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
    paddingTop: 20,
    height: 80,
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

export default NavBar;
