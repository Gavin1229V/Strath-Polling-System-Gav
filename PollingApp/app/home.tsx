// Add Buffer polyfill for Expo if not already present:
if (typeof global.Buffer === "undefined") {
  global.Buffer = require("buffer").Buffer;
}

import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import { useAuth, useFirstName, useLastName } from "./userDetails";
import { useRouter } from "expo-router";
import { SERVER_IP } from "./config";
import * as ImagePicker from "expo-image-picker"; // New import
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Buffer } from "buffer"; // NEW: import Buffer to convert buffers
import { useFocusEffect } from '@react-navigation/native'; // NEW import

const convertToBase64Uri = (pic: any): string => {
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

  const firstName = useFirstName();
  const lastName = useLastName();

  useEffect(() => {
    const loadUserProfile = async () => {
      if (user) {
        // Only fetch account details if classes are missing.
        if (!user.classes) {
          try {
            const res = await fetch(`${SERVER_IP}/accountDetails?userId=${user.user_id}`);
            const details = await res.json();
            if (details && details.length > 0) {
              const account = details[0];
              if (account.classes) {
                setDbClasses(account.classes);
                setUser({ ...user, classes: account.classes });
              }
            }
          } catch (e) {
            console.error("Error fetching account details:", e);
          }
        }
        // Fetch profile picture only if missing.
        if (!user.profile_picture) {
          try {
            const res2 = await fetch(`${SERVER_IP}/api/profilePicture?userId=${user.user_id}`);
            const data = await res2.json();
            if (data && data.profile_picture) {
              let pic = data.profile_picture;
              pic = convertToBase64Uri(pic);
              if (pic) {
                setProfilePicture(pic);
                setUser({ ...user, profile_picture: pic });
              }
            }
          } catch (e) {
            console.error("Error fetching profile picture:", e);
          }
        }
      }
    };
    loadUserProfile();
  }, [user]);

  // Add useFocusEffect hook to refresh profile picture on screen focus:
  useFocusEffect(
    React.useCallback(() => {
      if (user) {
        fetch(`${SERVER_IP}/api/profilePicture?userId=${user.user_id}`)
          .then((res) => res.json())
          .then((data) => {
            // Removed verbose log: "Focus fetched profilePicture data:" 
            if (data && data.profile_picture) {
              let pic = data.profile_picture;
              pic = convertToBase64Uri(pic);
              if (pic) {
                setProfilePicture(pic);
                setUser({ ...user, profile_picture: pic });
              }
            }
          })
          .catch((err) => {
            console.error("Error fetching profile picture on focus:", err);
          });
      }
      return () => {};
    }, [user])
  );

  // New useEffect to update profilePicture in local state if removed
  useEffect(() => {
    if (user && !user.profile_picture) {
      setProfilePicture(null);
    }
  }, [user?.profile_picture]);

  // Update localClasses whenever user.classes changes
  useEffect(() => {
    if (user?.classes) {
      setLocalClasses(
        user.classes.split(",").map(cls => cls.trim()).filter(Boolean)
      );
    } else {
      setLocalClasses([]);
    }
  }, [user?.classes]);

  // New useFocusEffect to refresh classes on home focus
  useFocusEffect(
    React.useCallback(() => {
      if (user) {
        fetch(`${SERVER_IP}/accountDetails?userId=${user.user_id}`)
          .then(res => res.json())
          .then(details => {
            if (details && details.length > 0) {
              const account = details[0];
              if (account.classes) {
                // Only update if the fetched classes differ from current user.classes
                if (account.classes !== user.classes) {
                  interface Account {
                    classes: string;
                  }

                  const updatedClasses: string[] = (account as Account).classes
                    .split(",")
                    .map((cls: string): string => cls.trim())
                    .filter(Boolean);
                  setLocalClasses(updatedClasses);
                  setUser({ ...user, classes: account.classes });
                }
              }
            }
          })
          .catch(err => console.error("Error refreshing classes:", err));
      }
      return () => {};
    }, [user])
  );

  // New function to pick image with blob conversion
  const pickImage = async () => {
    try {
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.5,  // lowered quality for iOS
      });
      if (!result.canceled && user) {
        const response = await fetch(result.assets[0].uri);
        const blob = await response.blob();
        const formData = new FormData();
        formData.append("user_id", user.user_id.toString());
        formData.append("profile_picture", blob, "profile.jpg");
        fetch(`${SERVER_IP}/api/uploadProfilePicture`, {
          method: "POST",
          body: formData,
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.success) {
              let pic = data.profile_picture;
              pic = convertToBase64Uri(pic);
              if (pic) {
                setProfilePicture(pic);
                setUser({ ...user, profile_picture: pic });
              }
            } else {
              console.error("Upload failed", data.error);
            }
          })
          .catch((err) => {
            console.error("Error uploading profile picture:", err);
          });
      }
    } catch (error) {
      console.error("Error picking/uploading image:", error);
      // Optionally alert the user
      alert("There was an error uploading your profile picture. Please try again.");
    }
  };

  return (
    <View style={styles.homeContainer}>
      <View style={styles.profileContainer}>
        {/* Replace separate conditional rendering with a single touchable wrapper */}
        <TouchableOpacity
          style={styles.uploadProfilePic}
          onPress={pickImage}
        >
          {profilePicture ? (
            <Image 
              resizeMode="cover" 
              source={{ uri: profilePicture }} 
              style={styles.profilePic} 
            />
          ) : (
            <Text style={styles.uploadProfilePicText}>Click to upload</Text>
          )}
        </TouchableOpacity>
        <Text style={styles.profileName}>
          Welcome, {firstName} {lastName}
        </Text>
        {user && (
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={() => router.push("/settings")}
          >
            <Text style={styles.logoutText}>Settings</Text>
          </TouchableOpacity>
        )}
      </View>
      {user && (
        <View style={styles.classesContainer}>
          <Text style={styles.classesTitle}>Your current classes are:</Text>
          <View style={styles.table}>
            {localClasses.map((cls, i) => (
              <View key={i} style={styles.tableRow}>
                <Text style={styles.tableCell}>{cls}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  homeContainer: {
    flex: 1,
    justifyContent: "flex-start",
    alignItems: "center",
    paddingTop: 50,
  },
  profileContainer: {
    alignItems: "center",
  },
  profilePic: {
    width: 100,         // updated to match upload circle
    height: 100,        // updated to match upload circle
    borderRadius: 50,   // ensures it's a circle
  },
  profileName: {
    fontSize: 24,
    marginTop: 16,
  },
  classesContainer: {
    marginTop: 20,
    alignItems: "center",
  },
  classesTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  classesText: {
    fontSize: 16,
    marginTop: 8,
  },
  logoutButton: {
    backgroundColor: "#FF3B30",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 5,
    marginTop: 20,
  },
  logoutText: {
    color: "#FFF",
    fontWeight: "bold",
  },
  classChooserButton: {
    width: "90%",
    alignSelf: "center",
    backgroundColor: "#007AFF",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 5,
    marginTop: 20,
  },
  classChooserButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
    textAlign: "center",
  },
  // New styles for table display
  table: {
    marginTop: 10,
    width: "100%",
    paddingHorizontal: 20,
  },
  tableRow: {
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
    paddingVertical: 8,
  },
  tableCell: {
    fontSize: 16,
  },
  // New styles for upload profile picture circle
  uploadProfilePic: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: "#007AFF",
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 10,
  },
  uploadProfilePicText: {
    fontSize: 12,
    color: "#007AFF",
    textAlign: "center",
  },
});

export default HomeScreen;