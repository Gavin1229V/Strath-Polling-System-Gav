import React, { useState, useEffect, useCallback, useRef } from "react";
import { View, Text, TouchableOpacity, Image, Dimensions, Platform, StatusBar, RefreshControl, ScrollView, ActivityIndicator } from "react-native";
import { useAuth, useFirstName, useLastName } from "./userDetails";
import { useRouter } from "expo-router";
import { SERVER_IP } from "../config";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from "react-native-safe-area-context";
import { getSocket, convertToBase64Uri, processProfilePicture } from "./global";
import { Ionicons } from "@expo/vector-icons";
import styles from "../../styles/styles";


const HomeScreen = () => {
  const { user, setUser } = useAuth();
  const router = useRouter();
  const [dbClasses, setDbClasses] = useState<string>("");
  const [profilePicture, setProfilePicture] = useState<string | null>(user?.profile_picture || null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [localClasses, setLocalClasses] = useState<string[]>([]);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  
  // Add refs to track mounted state and prevent updates after unmount
  const isMountedRef = useRef(true);
  // Track if initial load is complete
  const initialLoadCompleteRef = useRef(false);
  
  const firstName = useFirstName();
  const lastName = useLastName();
  
  // Get screen dimensions for responsive design
  const { width } = Dimensions.get('window');
  const profileSize = Math.min(100, width * 0.25);
  
  // Connect to the socket only once when the component mounts
  useEffect(() => {
    // Only initialize socket once
    getSocket();
    
    return () => {
      isMountedRef.current = false;
    };
  }, []);
  
  // Parse classes string into array once
  const parseClasses = useCallback((classesString?: string) => {
    if (!classesString) return [];
    return classesString.split(",").map(cls => cls.trim()).filter(Boolean);
  }, []);
  
  // Memoized loadUserProfile function with better dependency tracking
  const loadUserProfile = useCallback(async () => {
    if (!user || !isMountedRef.current) return;
    
    if (!refreshing) {
      setLoading(true);
    }
    
    try {
      // Only fetch if we need to
      if (!user.classes || !user.profile_picture) {
        const promises = [];
        
        if (!user.classes) {
          promises.push(
            fetch(`${SERVER_IP}/accountDetails?userId=${user.user_id}`)
              .then(res => res.json())
              .then(details => {
                if (!isMountedRef.current) return;
                
                if (details && details.length > 0) {
                  const account = details[0];
                  if (account.classes && account.classes !== user.classes) {
                    setDbClasses(account.classes);
                    setLocalClasses(parseClasses(account.classes));
                    // Direct object update instead of functional update
                    if (user) {
                      setUser({ ...user, classes: account.classes });
                    }
                  }
                }
              })
              .catch(err => console.error("Error fetching account details:", err))
          );
        }
        
        if (!user.profile_picture) {
          promises.push(
            fetch(`${SERVER_IP}/api/profilePicture?userId=${user.user_id}`)
              .then(res => res.json())
              .then(data => {
                if (!isMountedRef.current) return;
                
                if (data && data.profile_picture) {
                  try {
                    let pic = convertToBase64Uri(data.profile_picture);
                    if (pic && user) {
                      // Direct object update instead of functional update
                      setUser({ ...user, profile_picture: pic });
                    }
                  } catch (error) {
                    console.error("Failed to process profile picture:", error);
                    // Set default or empty profile picture
                  }
                }
              })
              .catch((err: Error) => {
                console.error("Error fetching profile picture:", err);
                if (isMountedRef.current) {
                  setErrorMsg("Failed to load profile picture");
                }
              })
          );
        }
        
        await Promise.all(promises);
      }
    } catch (e: unknown) {
      console.error("Error loading user profile:", e);
      if (isMountedRef.current) {
        setErrorMsg("Failed to load user data");
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        setRefreshing(false);
        initialLoadCompleteRef.current = true;
      }
    }
  }, [user, setUser, parseClasses]);

  // Initial data loading only on mount
  useEffect(() => {
    if (!initialLoadCompleteRef.current) {
      loadUserProfile();
    }
  }, [loadUserProfile]);

  // Remove the useFocusEffect that duplicates fetching functionality
  // and replace with a simpler version that only runs when tab is focused
  useFocusEffect(
    React.useCallback(() => {
      // Only refresh if we've done the initial load but the user returns to this screen
      if (initialLoadCompleteRef.current && user) {
        setRefreshing(true);
        loadUserProfile();
      }
      return () => {};
    }, [loadUserProfile, user])
  );

  // Update local classes when user.classes changes, but don't trigger a fetch
  useEffect(() => {
    if (user?.classes) {
      setLocalClasses(parseClasses(user.classes));
    }
  }, [user?.classes, parseClasses]);

  // Keep profilePicture in sync with user state
  useEffect(() => {
    setProfilePicture(user?.profile_picture || null);
  }, [user?.profile_picture]);

  // Add navigation function to view polls filtered by class
  const navigateToFilteredPolls = (classCode: string) => {
    router.push({
      pathname: "/polling/pollView",
      params: { activeFilter: classCode }
    });
  };

  // Simplified image picker function
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    
    if (result.canceled || !user) return;
    
    setRefreshing(true);
    
    try {
      const response = await fetch(result.assets[0].uri);
      const blob = await response.blob();
      
      const formData = new FormData();
      formData.append("user_id", user.user_id.toString());
      formData.append("profile_picture", blob, "profile.jpg");
      
      const uploadResponse = await fetch(`${SERVER_IP}/api/uploadProfilePicture`, {
        method: "POST",
        body: formData,
      });
      
      const data = await uploadResponse.json();
      
      if (data.success && user) {
        const pic = convertToBase64Uri(data.profile_picture);
        setProfilePicture(pic);
        // Use direct update instead of functional update to avoid typing issues
        setUser({ ...user, profile_picture: pic });
      }
    } catch (error) {
      console.error("Error with profile picture:", error);
      setErrorMsg("Upload failed");
    } finally {
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    loadUserProfile();
  }, [loadUserProfile]);

  // Simplified profile image component using processProfilePicture
  const renderProfileImage = () => {
    if (!profilePicture) {
      return (
        <Text style={{
          fontSize: Math.max(10, Math.min(12, width * 0.03)),
          color: "#094183", // Already updated to match navbar
          textAlign: "center",
          padding: 5
        }}>
          Tap to upload
        </Text>
      );
    }
    
    // Process the profile picture URL - ensure we have a clean string
    let processedUrl;
    try {
      // Handle case where profilePicture might be any format
      const picValue = typeof profilePicture === 'string' 
        ? profilePicture 
        : JSON.stringify(profilePicture);
        
      processedUrl = processProfilePicture(picValue);
    } catch (error) {
      console.error("Error processing profile picture:", error);
      return (
        <Text style={{
          fontSize: Math.max(10, Math.min(12, width * 0.03)),
          color: "red",
          textAlign: "center",
          padding: 5
        }}>
          Error loading image
        </Text>
      );
    }
    
    return (
      <Image 
        resizeMode="cover" 
        source={{ uri: processedUrl || undefined }} 
        style={{
          width: profileSize,
          height: profileSize,
          borderRadius: profileSize / 2
        }}
        accessibilityLabel="Profile picture"
        onError={() => {
          console.warn("Image loading error, resetting profile picture");
          setProfilePicture(null);
        }}
      />
    );
  };

  // If loading, show the loading screen similar to elections screen
  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={{ marginTop: 16 }}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F5F5F5" }} edges={['left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F5F5" />
      <ScrollView 
        contentContainerStyle={{ 
          flexGrow: 1, 
          paddingBottom: 100, // Space for navbar
          alignItems: "center", 
        }}
        contentInsetAdjustmentBehavior="never"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={{
          width: '100%',
          maxWidth: 500,
          paddingHorizontal: width * 0.05,
          paddingTop: 0, // Removed top padding
          alignItems: 'center'
        }}>
          <TouchableOpacity
            style={{
              width: profileSize,
              height: profileSize,
              borderRadius: profileSize / 2,
              borderWidth: 2,
              borderColor: "#094183", // Changed from #007AFF to match navbar
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
              style={[
                styles.blueButton, // Using the new global style
                { marginTop: 20, minWidth: width * 0.3 }
              ]}
              onPress={() => router.push("/components/settings")}
              accessibilityLabel="Settings"
              accessibilityRole="button"
            >
              <Text style={styles.blueButtonText}>
                Settings
              </Text>
            </TouchableOpacity>
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
          
          {/* Student Elections Section - updated for roles */}
          <TouchableOpacity
            onPress={() => router.push("/election/elections")}
            style={{
              width: '100%',
              backgroundColor: "#fff",
              borderRadius: 12,
              padding: 20,
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
<<<<<<< HEAD:PollingApp/app/components/home.tsx
                  onPress={() => router.push("../creation/electionCreator")}
=======
                  onPress={() => router.push("/election/createElection")}
>>>>>>> 91e3ab4ccfdbe377b93895ad23221f34484e5d2c:PollingApp/app/home.tsx
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

          {/* Add Expired Polls Section for Student Reps and Lecturers */}
          {user && (user.role === 2 || user.role === 3) && (
            <TouchableOpacity
              onPress={() => router.push("/polling/expiredPolls")}
              style={{
                width: '100%',
                backgroundColor: "#fff",
                borderRadius: 12,
                padding: 20,
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
                <Ionicons name="time-outline" size={24} color="#9C27B0" />
                <Text style={{ fontSize: 20, fontWeight: "600", marginLeft: 12 }}>
                  Expired Polls
                </Text>
              </View>
              <Text style={{ color: "#666", marginTop: 8, lineHeight: 20 }}>
                View results from polls that have ended. Access historical voting data and statistics.
              </Text>
              <View style={{ 
                backgroundColor: "#F3E5F5", 
                padding: 10, 
                borderRadius: 8, 
                marginTop: 12,
                flexDirection: "row",
                alignItems: "center"
              }}>
                <Ionicons name="information-circle" size={20} color="#9C27B0" style={{ marginRight: 8 }} />
                <Text style={{ color: "#6A1B9A", flex: 1 }}>
                  {user.role === 2 
                    ? "As a student representative, you can see expired polls for your year group." 
                    : "As a lecturer, you can access your expired polls."}
                </Text>
              </View>
            </TouchableOpacity>
          )}
          
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default HomeScreen;