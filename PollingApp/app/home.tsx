import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import { useAuth, useFirstName, useLastName } from "./userDetails";
import { useRouter } from "expo-router";
import { SERVER_IP } from "./config";
import * as ImagePicker from "expo-image-picker"; // New import
import AsyncStorage from "@react-native-async-storage/async-storage";

const HomeScreen = () => {
  const { user, setUser } = useAuth();
  const router = useRouter();
  const [dbClasses, setDbClasses] = useState<string>("");
  const [profilePicture, setProfilePicture] = useState<string | null>(null);

  const firstName = useFirstName();
  const lastName = useLastName();

  // Parse comma-separated classes into an array
  const classesList = dbClasses.split(",").map(cls => cls.trim()).filter(Boolean);

  useEffect(() => {
    if (user && !profilePicture) {
      // Attempt to load stored profile picture from AsyncStorage
      AsyncStorage.getItem("profile_picture")
        .then(storedPic => {
          if (storedPic) {
            setProfilePicture(storedPic);
            setUser({ ...user, profile_picture: storedPic });
          }
        })
        .catch(err => console.error("Error loading profile picture from storage:", err));

      // Existing fetch logic to get account details & picture from backend
      fetch(`${SERVER_IP}/accountDetails?userId=${user.user_id}`)
        .then(res => res.json())
        .then(details => {
          if (details && details.length > 0) {
            const account = details[0];
            setDbClasses(account.classes || "");
            if (account.profile_picture && !user.profile_picture) {
              setProfilePicture(account.profile_picture);
              setUser({ ...user, profile_picture: account.profile_picture });
            }
          }
        })
        .catch(err => {
          console.error("Error fetching account details:", err);
        });
  
      // Also fetch profile picture separately if missing
      if (!user.profile_picture) {
        fetch(`${SERVER_IP}/api/profilePicture?userId=${user.user_id}`)
          .then(res => res.json())
          .then(data => {
            console.log("Fetched profilePicture data:", data);
            if (data && data.profile_picture && !user.profile_picture) {
              let pic = data.profile_picture;
              if (!pic.startsWith("data:")) {
                pic = "data:image/jpeg;base64," + pic;
              }
              setProfilePicture(pic);
              setUser({ ...user, profile_picture: pic });
            }
          })
          .catch(err => {
            console.error("Error fetching profile picture:", err);
          });
      }
    }
  }, [user, profilePicture]);

  useEffect(() => {
    if (user) {
      // Sync local state with updated user context
      setProfilePicture(user.profile_picture || null);
    }
  }, [user]);

  // New function to pick image with blob conversion
  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
      // Remove base64 option
    });
    if (!result.canceled && user) {
      console.log("Picked image:", result.assets[0]); // Debug log
      // Convert image URI to a blob
      const response = await fetch(result.assets[0].uri);
      const blob = await response.blob();
      // Prepare form data for upload
      const formData = new FormData();
      formData.append("user_id", user.user_id.toString());
      formData.append("profile_picture", blob, "profile.jpg");
      console.log("Uploading profile picture for user:", user.user_id); // Debug log
      fetch(`${SERVER_IP}/api/uploadProfilePicture`, {
        method: "POST",
        body: formData,
        // Do not set Content-Type header in React Native
      })
        .then((res) => res.json())
        .then((data) => {
          console.log("Upload response:", data); // Debug log
          if (data.success) {
            setProfilePicture(data.profile_picture);
          } else {
            console.error("Upload failed", data.error);
          }
        })
        .catch((err) => {
          console.error("Error uploading profile picture:", err);
        });
    }
  };

  return (
    <View style={styles.homeContainer}>
      <View style={styles.profileContainer}>
        {profilePicture && (
          <Image 
            resizeMode="cover" 
            source={{ uri: profilePicture }} 
            style={styles.profilePic} 
          />
        )}
        {/* Conditionally show upload button only if profilePicture is not set */}
        {!profilePicture && (
          <TouchableOpacity
            style={styles.uploadProfilePic}
            onPress={pickImage}
          >
            <Text style={styles.uploadProfilePicText}>Click to upload</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.profileName}>
          Welcome, {firstName} {lastName}
        </Text>
        {user && (
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={() => {
              router.push("/settings");
            }}
          >
            <Text style={styles.logoutText}>Settings</Text>
          </TouchableOpacity>
        )}
      </View>
      {user && (
        <View style={styles.classesContainer}>
          <Text style={styles.classesTitle}>Your current classes are:</Text>
          <View style={styles.table}>
            {classesList.map((cls, i) => (
              <View key={i} style={styles.tableRow}>
                <Text style={styles.tableCell}>{cls}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
      <TouchableOpacity 
        style={styles.classChooserButton} 
        onPress={() => router.push("/classChooser")}
      >
        <Text style={styles.classChooserButtonText}>Choose Class</Text>
      </TouchableOpacity>
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