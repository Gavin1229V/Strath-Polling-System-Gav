import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  Platform,
  StyleSheet,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { fetchPolls } from "./global";
import { SERVER_IP } from "./config";
import { useFirstName, useLastName, useAuth, useUserClasses } from "./userDetails";
import { Poll } from "./global";
import styles from "../styles/styles"; // Use global styles

////////////////////////////////////////////////////////////////////////////////
// Compute default expiry value (one day ahead)
////////////////////////////////////////////////////////////////////////////////
const getDefaultExpiry = () => {
  const defaultExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const year = defaultExpiry.getFullYear();
  const month = ("0" + (defaultExpiry.getMonth() + 1)).slice(-2);
  const day = ("0" + defaultExpiry.getDate()).slice(-2);
  const hours = ("0" + defaultExpiry.getHours()).slice(-2);
  const minutes = ("0" + defaultExpiry.getMinutes()).slice(-2);
  return { date: `${year}-${month}-${day}`, time: `${hours}:${minutes}` };
};

const defaultExpiry = getDefaultExpiry();

////////////////////////////////////////////////////////////////////////////////
// Main component
////////////////////////////////////////////////////////////////////////////////
const PollScreen = () => {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [newPoll, setNewPoll] = useState({
    question: "",
    options: ["", ""],
    pollClass: "",
    expiryDate: defaultExpiry.date,
    expiryTime: defaultExpiry.time,
  });
  const [voteStatus, setVoteStatus] = useState("");
  const [isPollClassModalVisible, setPollClassModalVisible] = useState(false);

  // Auth / user details
  const { user } = useAuth();
  const [dbClasses, setDbClasses] = useState<string>("");
  const userClassesFromContext = useUserClasses();

  // Classes list
  const classesList = dbClasses
    ? dbClasses
        .split(",")
        .map((cls) => cls.trim())
        .filter(Boolean)
    : userClassesFromContext;

  const firstName = useFirstName();
  const lastName = useLastName();
  const author = `${firstName} ${lastName}`.trim();

  // Load polls initially
  useEffect(() => {
    fetchPolls(setPolls);
  }, []);

  // Fetch account details for classes
  useEffect(() => {
    if (user) {
      fetch(`${SERVER_IP}/accountDetails?userId=${user.user_id}`)
        .then((res) => res.json())
        .then((details) => {
          if (details && details.length > 0) {
            const account = details[0];
            setDbClasses(account.classes || "");
          }
        })
        .catch((err) => console.error("Error fetching account details:", err));
    }
  }, [user]);

  // Create a new poll
  const createPoll = async () => {
    const filteredOptions = newPoll.options.filter(
      (option) => option.trim() !== ""
    );
    if (
      !newPoll.pollClass.trim() ||
      !newPoll.question.trim() ||
      filteredOptions.length < 2
    ) {
      Alert.alert(
        "Validation Error",
        "Poll must have a poll class, a question, and at least two valid options."
      );
      return;
    }
    try {
      const response = await fetch(`${SERVER_IP}/api/polls`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: user ? `Bearer ${user.token}` : "",
        },
        body: JSON.stringify({
          question: newPoll.question,
          options: filteredOptions,
          created_by: author,
          created_by_id: user?.user_id,
          class: newPoll.pollClass,
          expiry: `${newPoll.expiryDate} ${newPoll.expiryTime}:00`,
          global: false,
        }),
      });
      if (!response.ok) {
        throw new Error(`Error creating poll: ${response.statusText}`);
      }
      // Reset newPoll: set expiryDate and expiryTime back to default values instead of empty strings.
      setNewPoll({
        question: "",
        options: ["", ""],
        pollClass: "",
        expiryDate: defaultExpiry.date,
        expiryTime: defaultExpiry.time,
      });
      fetchPolls(setPolls);
    } catch (err) {
      console.error("Error creating poll:", err);
      Alert.alert("Error", "An error occurred while creating the poll.");
    }
  };

  // Remove an option
  const removeOption = (index: number) => {
    const options = [...newPoll.options];
    options.splice(index, 1);
    setNewPoll({ ...newPoll, options });
  };

  // For native date/time pickers
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  return (
    <View style={styles.pollCreatorContainer}>
      <Text style={styles.pollCreatorHeader}>Create a New Poll</Text>

      {/* Poll question */}
      <TextInput
        style={styles.pollCreatorInput}
        placeholder="Poll question"
        placeholderTextColor="#333"
        value={newPoll.question}
        onChangeText={(text) => setNewPoll({ ...newPoll, question: text })}
      />

      {/* Poll options */}
      {newPoll.options.map((option, index) => (
        <View
          key={index}
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <TextInput
            style={[styles.pollCreatorInput, { flex: 1 }]}
            placeholder={`Option ${index + 1}`}
            placeholderTextColor="#333"
            value={option}
            onChangeText={(text) => {
              const options = [...newPoll.options];
              options[index] = text;
              setNewPoll({ ...newPoll, options });
            }}
          />
          {newPoll.options.length > 2 && (
            <TouchableOpacity
              style={styles.pollCreatorRemoveButton}
              onPress={() => removeOption(index)}
            >
              <Text style={styles.pollCreatorRemoveButtonText}>Remove</Text>
            </TouchableOpacity>
          )}
        </View>
      ))}

      {newPoll.options.length < 5 && (
        <TouchableOpacity
          style={styles.pollCreatorButton}
          onPress={() =>
            setNewPoll({ ...newPoll, options: [...newPoll.options, ""] })
          }
        >
          <Text style={styles.pollCreatorButtonText}>Add Another Option</Text>
        </TouchableOpacity>
      )}

      {/* Poll class dropdown */}
      <TouchableOpacity
        style={[
          styles.pollCreatorInput,
          { justifyContent: "center", marginBottom: 16 },
        ]}
        onPress={() => setPollClassModalVisible(true)}
      >
        <Text style={{ color: newPoll.pollClass ? "#000" : "#999" }}>
          {newPoll.pollClass ? newPoll.pollClass : "Select poll class"}
        </Text>
      </TouchableOpacity>

      {isPollClassModalVisible && (
        <View
          style={{
            position: "absolute",
            top: 140,
            left: 20,
            right: 20,
            backgroundColor: "#fff",
            borderWidth: 1,
            borderColor: "#ccc",
            borderRadius: 5,
            zIndex: 100,
            paddingVertical: 5,
          }}
        >
          <ScrollView style={styles.pollCreatorModalScroll}>
            {classesList.map((cls, idx) => (
              <TouchableOpacity
                key={idx}
                onPress={() => {
                  setNewPoll({ ...newPoll, pollClass: cls });
                  setPollClassModalVisible(false);
                }}
                style={styles.pollCreatorModalOption}
              >
                <Text>{cls}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              onPress={() => setPollClassModalVisible(false)}
              style={styles.pollCreatorModalCancel}
            >
              <Text style={{ fontWeight: "bold" }}>Cancel</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      {/* Expires heading */}
      <Text style={[styles.pollCreatorLabel, { marginTop: 10 }]}>Expires at:</Text>

      {Platform.OS === "web" ? (
        // Web: show input fields
        <View style={{ marginBottom: 16, width: "100%" }}>
          <input
            type="date"
            value={newPoll.expiryDate}
            onChange={(e) =>
              setNewPoll({ ...newPoll, expiryDate: e.target.value })
            }
            style={{
              width: "100%",
              padding: 10,
              borderRadius: 6,
              border: "1px solid #ccc",
              backgroundColor: "#fafafa",
              marginBottom: 10,
            }}
          />
          <input
            type="time"
            value={newPoll.expiryTime}
            onChange={(e) =>
              setNewPoll({ ...newPoll, expiryTime: e.target.value })
            }
            style={{
              width: "100%",
              padding: 10,
              borderRadius: 6,
              border: "1px solid #ccc",
              backgroundColor: "#fafafa",
            }}
          />
        </View>
      ) : Platform.OS === "ios" ? (
        // iOS: show inline DateTimePickers
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16, width: "100%" }}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <DateTimePicker
              mode="date"
              display="default"
              value={
                newPoll.expiryDate
                  ? new Date(newPoll.expiryDate)
                  : new Date(Date.now() + 24 * 60 * 60 * 1000)
              }
              onChange={(event, selectedDate) => {
                if (selectedDate) {
                  const year = selectedDate.getFullYear();
                  const month = ("0" + (selectedDate.getMonth() + 1)).slice(-2);
                  const day = ("0" + selectedDate.getDate()).slice(-2);
                  setNewPoll((prev) => ({
                    ...prev,
                    expiryDate: `${year}-${month}-${day}`,
                  }));
                }
              }}
            />
          </View>
          <View style={{ flex: 1, marginLeft: 8 }}>
            <DateTimePicker
              mode="time"
              display="default"
              is24Hour={true}
              value={
                newPoll.expiryTime
                  ? new Date(`1970-01-01T${newPoll.expiryTime}:00`)
                  : new Date()
              }
              onChange={(event, selectedTime) => {
                if (selectedTime) {
                  const hours = ("0" + selectedTime.getHours()).slice(-2);
                  const minutes = ("0" + selectedTime.getMinutes()).slice(-2);
                  setNewPoll((prev) => ({
                    ...prev,
                    expiryTime: `${hours}:${minutes}`,
                  }));
                }
              }}
            />
          </View>
        </View>
      ) : (
        // Other platforms (e.g., Android): use toggle buttons
        <>
          <TouchableOpacity
            onPress={() => setShowDatePicker(true)}
            style={{
              padding: 12,
              backgroundColor: "#fafafa",
              borderWidth: 1,
              borderColor: "#ccc",
              borderRadius: 8,
              marginBottom: 10,
              width: "100%",
            }}
          >
            <Text style={{ color: newPoll.expiryDate ? "#000" : "#999" }}>
              {newPoll.expiryDate
                ? newPoll.expiryDate
                : "Select Expiry Date (YYYY-MM-DD)"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setShowTimePicker(true)}
            style={{
              padding: 12,
              backgroundColor: "#fafafa",
              borderWidth: 1,
              borderColor: "#ccc",
              borderRadius: 8,
              marginBottom: 16,
              width: "100%",
            }}
          >
            <Text style={{ color: newPoll.expiryTime ? "#000" : "#999" }}>
              {newPoll.expiryTime
                ? newPoll.expiryTime
                : "Select Expiry Time (HH:MM 24hr)"}
            </Text>
          </TouchableOpacity>
          {showDatePicker && (
            <View style={{ marginBottom: 16, width: "100%" }}>
              <DateTimePicker
                mode="date"
                display="spinner"
                value={
                  newPoll.expiryDate
                    ? new Date(newPoll.expiryDate)
                    : new Date(Date.now() + 24 * 60 * 60 * 1000)
                }
                onChange={(event, selectedDate) => {
                  if (selectedDate) {
                    const year = selectedDate.getFullYear();
                    const month = ("0" + (selectedDate.getMonth() + 1)).slice(-2);
                    const day = ("0" + selectedDate.getDate()).slice(-2);
                    setNewPoll((prev) => ({
                      ...prev,
                      expiryDate: `${year}-${month}-${day}`,
                    }));
                  }
                }}
              />
              <TouchableOpacity
                style={styles.pollCreatorButton}
                onPress={() => setShowDatePicker(false)}
              >
                <Text style={styles.pollCreatorButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          )}
          {showTimePicker && (
            <View style={{ marginBottom: 16, width: "100%" }}>
              <DateTimePicker
                mode="time"
                display="spinner"
                is24Hour={true}
                value={
                  newPoll.expiryTime
                    ? new Date(`1970-01-01T${newPoll.expiryTime}:00`)
                    : new Date()
                }
                onChange={(event, selectedTime) => {
                  if (selectedTime) {
                    const hours = ("0" + selectedTime.getHours()).slice(-2);
                    const minutes = ("0" + selectedTime.getMinutes()).slice(-2);
                    setNewPoll((prev) => ({
                      ...prev,
                      expiryTime: `${hours}:${minutes}`,
                    }));
                  }
                }}
              />
              <TouchableOpacity
                style={styles.pollCreatorButton}
                onPress={() => setShowTimePicker(false)}
              >
                <Text style={styles.pollCreatorButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      )}

      {/* Create poll button */}
      <TouchableOpacity
        style={styles.pollCreatorButton}
        onPress={createPoll}
      >
        <Text style={styles.pollCreatorButtonText}>Create Poll</Text>
      </TouchableOpacity>

      {voteStatus ? <Text style={styles.pollCreatorStatus}>{voteStatus}</Text> : null}
    </View>
  );
};

export default PollScreen;