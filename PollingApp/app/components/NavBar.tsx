import React from "react";
import { View, StyleSheet, TouchableOpacity, Text, Dimensions } from "react-native";
import { usePathname, useRouter } from "expo-router";
import { useUserRole } from "./userDetails";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from '@expo/vector-icons';

const hideNavBarRoutes = ["/", "/auth/index", "/auth/login", "/auth/registerPage"];

const NavBar = () => {
  const pathname = usePathname();
  const router = useRouter();
  const userRole = useUserRole();
  const shouldHideNavBar = hideNavBarRoutes.includes(pathname);
  if (shouldHideNavBar) return null;

  // Check if user is a student (role === 1)
  const isStudent = userRole === 1;
  
  // Check if user is a student rep (role === 2)
  const isStudentRep = userRole === 2;
  
  // Check if user is a lecturer (role === 3)
  const isLecturer = userRole === 3;
  
<<<<<<< HEAD:PollingApp/app/components/NavBar.tsx
  // Check if user is an instructor (specifically role === 3)
  const isInstructor = userRole === 3;
  
  // Update path checks to match the file structure
=======
  // Updated isActive function to check if pathname includes the route segment
>>>>>>> 91e3ab4ccfdbe377b93895ad23221f34484e5d2c:PollingApp/components/NavBar.tsx
  const isActive = (route: string): boolean => pathname.includes(route);

  return (
    <SafeAreaView edges={["bottom"]} style={styles.safeArea}>
      <View style={styles.navbar}>
        <TouchableOpacity 
          style={[styles.navButton, isActive("/components/home") && styles.activeNavButton]} 
          onPress={() => router.replace("/components/home")}
          accessibilityLabel="Home"
        >
          <Ionicons 
            name="home" 
            size={24} 
            color={isActive("/components/home") ? "#007bff" : "#ffffff"} 
          />
          <Text style={[styles.navText, isActive("/components/home") && styles.activeNavText]}>
            Home
          </Text>
        </TouchableOpacity>
        
        {(isLecturer || isStudentRep) && (
          <TouchableOpacity 
<<<<<<< HEAD:PollingApp/app/components/NavBar.tsx
            style={[styles.navButton, isActive("/creation/pollCreator") && styles.activeNavButton]} 
            onPress={() => router.replace("/creation/pollCreator")}
=======
            style={[styles.navButton, isActive("/polling/pollCreator") && styles.activeNavButton]} 
            onPress={() => router.replace("/polling/pollCreator")}
>>>>>>> 91e3ab4ccfdbe377b93895ad23221f34484e5d2c:PollingApp/components/NavBar.tsx
            accessibilityLabel="Create Poll"
          >
            <Ionicons 
              name="create" 
              size={24} 
<<<<<<< HEAD:PollingApp/app/components/NavBar.tsx
              color={isActive("/creation/pollCreator") ? "#007bff" : "#ffffff"} 
            />
            <Text style={[styles.navText, isActive("/creation/pollCreator") && styles.activeNavText]}>
=======
              color={isActive("/polling/pollCreator") ? "#007bff" : "#ffffff"} 
            />
            <Text style={[styles.navText, isActive("/polling/pollCreator") && styles.activeNavText]}>
>>>>>>> 91e3ab4ccfdbe377b93895ad23221f34484e5d2c:PollingApp/components/NavBar.tsx
              Create
            </Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity 
          style={[styles.navButton, isActive("/polling/pollView") && styles.activeNavButton]} 
          onPress={() => router.replace("/polling/pollView")}
          accessibilityLabel="View Polls"
        >
          <Ionicons 
            name="list" 
            size={24} 
            color={isActive("/polling/pollView") ? "#007bff" : "#ffffff"} 
          />
          <Text style={[styles.navText, isActive("/polling/pollView") && styles.activeNavText]}>
            Polls
          </Text>
        </TouchableOpacity>
        
        {/* Elections tab - visible for students (role === 1), student reps (role === 2) and lecturers (role === 3) */}
        {(isStudent || isStudentRep || isLecturer) && (
          <TouchableOpacity 
            style={[styles.navButton, isActive("/election/elections") && styles.activeNavButton]} 
            onPress={() => router.replace("/election/elections")}
            accessibilityLabel="Student Elections"
          >
            <Ionicons 
              name="people" 
              size={24} 
              color={isActive("/election/elections") ? "#007bff" : "#ffffff"} 
            />
            <Text style={[styles.navText, isActive("/election/elections") && styles.activeNavText]}>
              Elections
            </Text>
          </TouchableOpacity>
        )}
        
        {/* Add a new tab for Expired Polls - visible only for student reps and lecturers */}
        {(isStudentRep || isLecturer) && (
          <TouchableOpacity 
            style={[styles.navButton, isActive("/polling/expiredPolls") && styles.activeNavButton]} 
            onPress={() => router.replace("/polling/expiredPolls")}
            accessibilityLabel="Expired Polls"
          >
            <Ionicons 
              name="time" 
              size={24} 
              color={isActive("/polling/expiredPolls") ? "#007bff" : "#ffffff"} 
            />
            <Text style={[styles.navText, isActive("/polling/expiredPolls") && styles.activeNavText]}>
              Expired
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  content: {
    flex: 1,
  },
  safeArea: {
    backgroundColor: "#094183",
    width: "100%",
    position: "absolute",
    bottom: 0,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  navbar: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 8,
    backgroundColor: "#094183",
    width: "100%",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
  },
  navButton: {
    padding: Math.min(12, width * 0.03),
    minWidth: 80,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
  },
  activeNavButton: {
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    transform: [{ translateY: -5 }],
    borderRadius: 20,
    paddingHorizontal: 16,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  navText: {
    color: "#ffffff",
    fontSize: Math.max(12, Math.min(14, width * 0.035)),
    fontWeight: "bold",
    textAlign: "center",
    marginTop: 4,
  },
  activeNavText: {
    color: "#007bff",
  }
});

export default NavBar;
