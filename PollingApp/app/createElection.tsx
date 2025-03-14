import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useRouter } from "expo-router";
import { useAuth } from "./userDetails";
import { SERVER_IP } from "./config";
import styles from "../styles/styles";

// Default end date (2 weeks from now)
const getDefaultEndDate = () => {
  const date = new Date();
  date.setDate(date.getDate() + 14); // 2 weeks from now
  return date;
};

const CreateElectionScreen = () => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [yearGroup, setYearGroup] = useState<number>(1);
  const [endDate, setEndDate] = useState(getDefaultEndDate());
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const { user } = useAuth();
  const router = useRouter();

  // Format date for display
  const formatDate = (date: Date) => {
    return date.toLocaleDateString() + " " + date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Check for form validity
  const isFormValid = () => {
    return title.trim() !== "" && yearGroup > 0;
  };

  // Create the election
  const handleCreateElection = async () => {
    if (!isFormValid()) {
      Alert.alert("Error", "Please fill in all required fields.");
      return;
    }

    if (!user) {
      Alert.alert("Error", "You must be logged in to create an election.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(`${SERVER_IP}/api/elections`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          title,
          description,
          year_group: yearGroup,
          end_date: endDate.toISOString().slice(0, 19).replace("T", " "), // Format: YYYY-MM-DD HH:MM:SS
          userId: user.user_id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create election");
      }

      Alert.alert(
        "Success",
        "Election created successfully",
        [{ text: "OK", onPress: () => router.push("/elections") }]
      );
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to create election. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Year group options
  const yearGroups = [
    { label: "Year 1", value: 1 },
    { label: "Year 2", value: 2 },
    { label: "Year 3", value: 3 },
    { label: "Year 4", value: 4 },
    { label: "Year 5", value: 5 },
  ];

  return (
    <View style={styles.electionContainer}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <Text style={styles.electionHeader}>Create Student Representative Election</Text>
        
        {/* Lecturer info card */}
        <View style={{
          backgroundColor: "#E3F2FD", 
          padding: 16, 
          borderRadius: 8, 
          marginBottom: 20,
          marginHorizontal: 16,
          flexDirection: "row",
          alignItems: "center"
        }}>
          <Ionicons name="information-circle" size={24} color="#1976D2" style={{ marginRight: 10 }} />
          <Text style={{ color: "#1976D2", flex: 1 }}>
            As a lecturer, you can create elections for specific year groups. 
            Students will only be able to nominate themselves or vote in elections for their own year group.
          </Text>
        </View>
        
        <View style={styles.electionForm}>
          {/* Election Title */}
          <Text style={styles.formLabel}>
            Election Title <Text style={{ color: "#e53935" }}>*</Text>
          </Text>
          <TextInput
            style={styles.formField}
            placeholder="Enter election title"
            value={title}
            onChangeText={setTitle}
            maxLength={100}
          />
          
          {/* Election Description */}
          <Text style={styles.formLabel}>Description</Text>
          <TextInput
            style={[styles.formField, styles.formTextArea]}
            placeholder="Enter election description (optional)"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={5}
          />
          
          {/* Year Group Selection */}
          <Text style={[styles.formLabel, { fontSize: 18, fontWeight: "700", marginTop: 10 }]}>
            Year Group <Text style={{ color: "#e53935" }}>*</Text>
          </Text>
          <Text style={{ marginBottom: 10, color: "#666", fontStyle: "italic" }}>
            Select which year group can participate in this election
          </Text>
          <TouchableOpacity
            style={{
              borderWidth: 1,
              borderColor: "#1976D2",
              borderRadius: 8,
              padding: 12,
              marginBottom: 16,
              backgroundColor: "#E3F2FD",
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
            onPress={() => setShowYearPicker(true)}
          >
            <Text style={{ fontSize: 16, fontWeight: "600", color: "#1976D2" }}>
              Year {yearGroup}
            </Text>
            <Ionicons name="chevron-down" size={20} color="#1976D2" />
          </TouchableOpacity>

          {/* End Date Selection */}
          <Text style={styles.formLabel}>Election End Date</Text>
          <TouchableOpacity
            style={{
              borderWidth: 1,
              borderColor: "#ddd",
              borderRadius: 8,
              padding: 12,
              marginBottom: 16,
              backgroundColor: "#fafafa",
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
            onPress={() => setShowDatePicker(true)}
          >
            <Text>{formatDate(endDate)}</Text>
            <Ionicons name="calendar-outline" size={20} color="#666" />
          </TouchableOpacity>

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.formSubmitButton,
              !isFormValid() && { backgroundColor: "#ccc" },
              submitting && { opacity: 0.7 },
            ]}
            onPress={handleCreateElection}
            disabled={!isFormValid() || submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.formSubmitText}>Create Election</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Year Group Picker Modal */}
        {showYearPicker && (
          <View
            style={{
              position: "absolute",
              top: "30%",
              left: 20,
              right: 20,
              backgroundColor: "#fff",
              borderRadius: 8,
              padding: 16,
              elevation: 5,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 3.84,
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: "600", marginBottom: 16 }}>
              Select Year Group
            </Text>
            {yearGroups.map((year) => (
              <TouchableOpacity
                key={year.value}
                style={{
                  paddingVertical: 12,
                  borderBottomWidth: 1,
                  borderBottomColor: "#eee",
                }}
                onPress={() => {
                  setYearGroup(year.value);
                  setShowYearPicker(false);
                }}
              >
                <Text style={{ fontSize: 16 }}>{year.label}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={{
                marginTop: 16,
                padding: 12,
                backgroundColor: "#f5f5f5",
                borderRadius: 8,
                alignItems: "center",
              }}
              onPress={() => setShowYearPicker(false)}
            >
              <Text style={{ color: "#666", fontWeight: "600" }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Date Picker */}
        {showDatePicker && Platform.OS !== "web" && (
          <DateTimePicker
            value={endDate}
            mode="datetime"
            display="default"
            minimumDate={new Date()}
            onChange={(event, selectedDate) => {
              setShowDatePicker(false);
              if (selectedDate) {
                setEndDate(selectedDate);
              }
            }}
          />
        )}

        {/* Web Date Picker */}
        {showDatePicker && Platform.OS === "web" && (
          <View
            style={{
              position: "absolute",
              top: "30%",
              left: 20,
              right: 20,
              backgroundColor: "#fff",
              borderRadius: 8,
              padding: 16,
              elevation: 5,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 3.84,
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: "600", marginBottom: 16 }}>
              Select End Date and Time
            </Text>
            <input
              type="datetime-local"
              style={{
                width: "100%",
                padding: "10px",
                fontSize: "16px",
                marginBottom: "16px",
              }}
              min={new Date().toISOString().slice(0, 16)}
              value={endDate.toISOString().slice(0, 16)}
              onChange={(e) => {
                const newDate = new Date(e.target.value);
                setEndDate(newDate);
              }}
            />
            <TouchableOpacity
              style={{
                marginTop: 16,
                padding: 12,
                backgroundColor: "#007AFF",
                borderRadius: 8,
                alignItems: "center",
              }}
              onPress={() => setShowDatePicker(false)}
            >
              <Text style={{ color: "#fff", fontWeight: "600" }}>Done</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

export default CreateElectionScreen;
