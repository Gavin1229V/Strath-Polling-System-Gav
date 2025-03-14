if (typeof global.Buffer === "undefined") {
  global.Buffer = require("buffer").Buffer;
}

import React, { useState, useEffect, useCallback } from "react";
import { View, Text, TouchableOpacity, Image, Dimensions, Platform, StatusBar, RefreshControl, ScrollView } from "react-native";
import { useAuth, useFirstName, useLastName } from "./userDetails";
import { useRouter } from "expo-router";
import { SERVER_IP } from "./config";
import * as ImagePicker from "expo-image-picker";
import { Buffer } from "buffer";
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from "react-native-safe-area-context";
import { getSocket } from "./global";
import { Ionicons } from "@expo/vector-icons";

export const convertToBase64Uri = (pic: any): string => {
  if (!pic) return "";
  if (typeof pic === "string") {
    return pic.startsWith("data:") ? pic : "data:image/jpeg;base64," + pic;
  }
  if (pic.data) {
    let byteArray: Uint8Array;
    if (pic.data instanceof Uint8Array) {
      byteArray = pic.data;
    } else if (Array.isArray(pic.data)) {
      byteArray = new Uint8Array(pic.data);
    } else {
      try {
        byteArray = new Uint8Array(Object.values(pic.data));
      } catch (e) {
        console.error("Invalid pic.data format:", e);
        return "";
      }
    }
    const base64String = Buffer.from(byteArray).toString("base64");
    return "data:image/jpeg;base64," + base64String;
  }
  return "";
};

const HomeScreen = () => {
  const { user, setUser } = useAuth();
  const router = useRouter();
  const [dbClasses, setDbClasses] = useState<string>("");
  const [profilePicture, setProfilePicture] = useState<string | null>(user?.profile_picture || null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [localClasses, setLocalClasses] = useState<string[]>([]);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  
  const firstName = useFirstName();
  const lastName = useLastName();
  
  // Get screen dimensions for responsive design
  const { width } = Dimensions.get('window');
  const profileSize = Math.min(100, width * 0.25); // Responsive profile size
  
  // Connect to the socket when the app loads
  useEffect(() => {
    // Initialize the socket connection
    const socket = getSocket();
    
    // Return a cleanup function
    return () => {
      // Socket will stay connected for other components
    };
  }, []);
  
  // Memoized loadUserProfile function to prevent unnecessary recreations
  const loadUserProfile = useCallback(async () => {
    if (!user) return;
    
    setRefreshing(true);
    try {
      const fetchPromises = [];
      
      // Only fetch account details if classes are missing
      if (!user.classes) {
        fetchPromises.push(
          fetch(`${SERVER_IP}/accountDetails?userId=${user.user_id}`)
            .then(res => res.json())
            .then(details => {
              if (details && details.length > 0) {
                const account = details[0];
                if (account.classes) {
                  setDbClasses(account.classes);
                  // Direct object update instead of functional update
                  if (user) {
                    setUser({ ...user, classes: account.classes });
                  }
                }
              }
            })
        );
      }
      
      // Fetch profile picture only if missing
      if (!user.profile_picture) {
        fetchPromises.push(
          fetch(`${SERVER_IP}/api/profilePicture?userId=${user.user_id}`)
            .then(res => res.json())
            .then(data => {
              if (data && data.profile_picture) {
                let pic = convertToBase64Uri(data.profile_picture);
                if (pic && user) {
                  setProfilePicture(pic);
                  // Direct object update
                  setUser({ ...user, profile_picture: pic });
                }
              }
            })
        );
      }
      
      await Promise.all(fetchPromises);
    } catch (e) {
      console.error("Error loading user profile:", e);
      setErrorMsg("Failed to load user data");
    } finally {
      setRefreshing(false);
    }
  }, [user, setUser]);

  // Initial data loading
  useEffect(() => {
    loadUserProfile();
  }, [loadUserProfile]);

  // Combined useFocusEffect with optimized fetch
  useFocusEffect(
    React.useCallback(() => {
      if (!user) return;
      
      const fetchProfileAndClasses = async () => {
        try {
          const [picRes, accountRes] = await Promise.all([
            fetch(`${SERVER_IP}/api/profilePicture?userId=${user.user_id}`).then(res => res.json()),
            fetch(`${SERVER_IP}/accountDetails?userId=${user.user_id}`).then(res => res.json())
          ]);
          
          // Update profile picture if available
          if (picRes && picRes.profile_picture && user) {
            let pic = convertToBase64Uri(picRes.profile_picture);
            if (pic) {
              setProfilePicture(pic);
              // Direct object update
              setUser({ ...user, profile_picture: pic });
            }
          }
          
          // Update classes if available and changed
          if (accountRes && accountRes.length > 0) {
            const account = accountRes[0];
            if (account.classes && account.classes !== user.classes) {
              const updatedClasses = account.classes
                .split(",")
                .map((cls: string) => cls.trim())
                .filter(Boolean);
              setLocalClasses(updatedClasses);
              // Direct object update
              setUser({ ...user, classes: account.classes });
            }
          }
        } catch (err) {
          console.error("Error in useFocusEffect:", err);
        }
      };
      
      fetchProfileAndClasses();
      return () => {};
    }, [user])
  );

  // Update local state when user data changes
  useEffect(() => {
    if (user && !user.profile_picture) {
      setProfilePicture(null);
    }
    
    if (user?.classes) {
      setLocalClasses(
        user.classes.split(",").map(cls => cls.trim()).filter(Boolean)
      );
    } else {
      setLocalClasses([]);
    }
  }, [user?.profile_picture, user?.classes]);

  // Add navigation function to view polls filtered by class
  const navigateToFilteredPolls = (classCode: string) => {
    router.push({
      pathname: "/pollView",
      params: { activeFilter: classCode }
    });
  };

  // Optimized image picker function
  const pickImage = async () => {
    try {
      // Request permissions first on iOS
      if (Platform.OS === 'ios') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          alert('Sorry, we need camera roll permissions to upload photos.');
          return;
        }
      }
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: Platform.OS === 'ios' ? 0.5 : 0.7,
      });
      
      if (result.canceled || !user) return;
      
      const response = await fetch(result.assets[0].uri);
      const blob = await response.blob();
      
      const formData = new FormData();
      formData.append("user_id", user.user_id.toString());
      formData.append("profile_picture", blob, "profile.jpg");
      
      fetch(`${SERVER_IP}/api/uploadProfilePicture`, {
        method: "POST",
        body: formData,
      })
        .then(res => res.json())
        .then(data => {
          if (data.success && user) {
            const pic = convertToBase64Uri(data.profile_picture);
            if (pic) {
              setProfilePicture(pic);
              // Direct object update
              setUser({ ...user, profile_picture: pic });
            }
          } else {
            setErrorMsg("Failed to upload profile picture");
          }
        })
        .catch(err => {
          console.error("Error uploading profile picture:", err);
          setErrorMsg("Error uploading profile picture");
        });
    } catch (error) {
      console.error("Error picking/uploading image:", error);
      setErrorMsg("Error selecting or uploading image");
    }
  };

  const onRefresh = useCallback(() => {
    loadUserProfile();
  }, [loadUserProfile]);

  // Enhanced profile image component with error handling
  const renderProfileImage = () => {
    if (!profilePicture) {
      return (
        <Text style={{
          fontSize: Math.max(10, Math.min(12, width * 0.03)),
          color: "#007AFF",
          textAlign: "center",
          padding: 5
        }}>
          Tap to upload
        </Text>
      );
    }

    return (
      <Image 
        resizeMode="cover" 
        source={{ uri: profilePicture }} 
        style={{
          width: profileSize,
          height: profileSize,
          borderRadius: profileSize / 2
        }}
        accessibilityLabel="Profile picture"
        // Add onError handler to fallback if image fails to load
        onError={() => {
          console.log("Error loading profile image");
          setProfilePicture(null);
        }}
      />
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F5F5F5" }} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F5F5" />
      <ScrollView 
        contentContainerStyle={{ 
          flexGrow: 1, 
          paddingBottom: 100, // Space for navbar
          alignItems: "center", 
        }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={{
          width: '100%',
          maxWidth: 500,
          paddingHorizontal: width * 0.05,
          paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 20 : 20,
          alignItems: 'center'
        }}>
          <TouchableOpacity
            style={{
              width: profileSize,
              height: profileSize,
              borderRadius: profileSize / 2,
              borderWidth: 2,
              borderColor: "#007AFF",
              justifyContent: "center",
              alignItems: "center",
              marginVertical: 10,
              overflow: 'hidden',
              backgroundColor: '#f0f0f0' // Light background for empty state
            }}
            onPress={pickImage}
            accessibilityLabel="Upload profile picture"
            accessibilityRole="button"
          >
            {renderProfileImage()}
          </TouchableOpacity>
          
          <Text style={{
            fontSize: Math.min(24, width * 0.06),
            fontWeight: "600",
            marginTop: 16,
            textAlign: 'center'
          }}>
            Welcome, {firstName} {lastName}
          </Text>
          
          {user && (
            <TouchableOpacity
              style={{
                backgroundColor: "#007AFF",
                paddingVertical: 10,
                paddingHorizontal: 20,
                borderRadius: 8,
                marginTop: 20,
                minWidth: width * 0.3,
                alignItems: 'center'
              }}
              onPress={() => router.push("/settings")}
              accessibilityLabel="Settings"
              accessibilityRole="button"
            >
              <Text style={{
                color: "#FFF",
                fontWeight: "600",
                fontSize: Math.min(16, width * 0.04)
              }}>
                Settings
              </Text>
            </TouchableOpacity>
          )}
          
          {user && (
            <View style={{
              marginTop: 30,
              width: '100%',
              alignItems: "center"
            }}>
              <Text style={{
                fontSize: Math.min(18, width * 0.05),
                fontWeight: "bold",
                marginBottom: 10
              }}>
                Your current classes are:
              </Text>
              
              {localClasses.length > 0 ? (
                <View style={{
                  width: '100%',
                  backgroundColor: '#fff',
                  borderRadius: 10,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 4,
                  elevation: 3,
                  marginTop: 10
                }}>
                  {localClasses.map((cls, i) => (
                    <View 
                      key={i} 
                      style={{
                        paddingVertical: 12,
                        paddingHorizontal: 15,
                        borderBottomWidth: i < localClasses.length - 1 ? 1 : 0,
                        borderBottomColor: "#eee",
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center"
                      }}
                    >
                      <Text 
                        style={{
                          fontSize: Math.min(16, width * 0.045),
                          flex: 1
                        }}
                        accessibilityLabel={`Class ${cls}`}
                      >
                        {cls}
                      </Text>
                      <TouchableOpacity
                        style={{
                          backgroundColor: "#007AFF",
                          paddingVertical: 6,
                          paddingHorizontal: 10,
                          borderRadius: 6
                        }}
                        onPress={() => navigateToFilteredPolls(cls)}
                        accessibilityLabel={`View polls for ${cls}`}
                        accessibilityRole="button"
                      >
                        <Text style={{
                          color: "#FFFFFF",
                          fontSize: Math.min(14, width * 0.035),
                          fontWeight: "500"
                        }}>
                          View Polls
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={{
                  fontSize: 16,
                  marginTop: 20,
                  fontStyle: 'italic',
                  color: '#666'
                }}>
                  No classes added yet
                </Text>
              )}
            </View>
          )}
          
          {errorMsg && (
            <Text style={{
              color: 'red',
              marginTop: 20,
              textAlign: 'center'
            }}>
              {errorMsg}
            </Text>
          )}
        </View>
        {/* Student Elections Section - updated for roles */}
        <TouchableOpacity
          onPress={() => router.push("/elections")}
          style={{
            backgroundColor: "#fff",
            borderRadius: 12,
            padding: 20,
            marginHorizontal: 20,
            marginTop: 20,
            marginBottom: 16,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Ionicons name="people" size={24} color="#FF9800" />
            <Text style={{ fontSize: 20, fontWeight: "600", marginLeft: 12 }}>
              Student Rep Elections
            </Text>
          </View>
          <Text style={{ color: "#666", marginTop: 8, lineHeight: 20 }}>
            {user && user.role === 1 
              ? "Nominate yourself or vote for student representatives for your year."
              : user && user.role === 2
                ? "View and participate in student representative elections."
                : "Manage student representative elections and view results."}
          </Text>
          {user && user.role === 1 && (
            <View style={{ 
              backgroundColor: "#FFF8E1", 
              padding: 10, 
              borderRadius: 8, 
              marginTop: 12,
              flexDirection: "row",
              alignItems: "center"
            }}>
              <Ionicons name="information-circle" size={20} color="#FF9800" style={{ marginRight: 8 }} />
              <Text style={{ color: "#795548", flex: 1 }}>
                Students can only run as representatives for their own year group.
              </Text>
            </View>
          )}
          {user && user.role === 3 && (
            <View style={{ marginTop: 12 }}>
              <View style={{ 
                backgroundColor: "#E8F5E9", 
                padding: 10, 
                borderRadius: 8, 
                marginBottom: 12,
                flexDirection: "row",
                alignItems: "center"
              }}>
                <Ionicons name="create" size={20} color="#4CAF50" style={{ marginRight: 8 }} />
                <Text style={{ color: "#2E7D32", flex: 1 }}>
                  As a lecturer, you can create elections for specific year groups.
                </Text>
              </View>
              
              <TouchableOpacity
                onPress={() => router.push("/createElection")}
                style={{
                  backgroundColor: "#4CAF50",
                  padding: 12,
                  borderRadius: 8,
                  flexDirection: "row",
                  justifyContent: "center",
                  alignItems: "center"
                }}
                accessibilityLabel="Create Election"
                accessibilityRole="button"
              >
                <Ionicons name="add-circle-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={{ color: "#FFFFFF", fontWeight: "600" }}>
                  Create New Election
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export default HomeScreen;