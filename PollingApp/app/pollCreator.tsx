import React, { useEffect, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert, ScrollView } from "react-native";
import styles from "../styles/styles";
import { fetchPolls } from "./global";
import { SERVER_IP } from "./config";
import { useFirstName, useLastName, useAuth, useUserClasses } from "./userDetails"; 

import { Poll } from "./global";

const PollScreen = () => {

  // Extend poll state to include pollClass
  const [polls, setPolls] = useState<Poll[]>([]);
  const [newPoll, setNewPoll] = useState({ question: "", options: ["", ""], pollClass: "" });
  const [voteStatus, setVoteStatus] = useState("");
  const [isPollClassModalVisible, setPollClassModalVisible] = useState(false); // new state

  const { user } = useAuth(); // Get auth details including token
  // New state to store classes fetched from account details (like in Home)
  const [dbClasses, setDbClasses] = useState<string>("");
  const userClassesFromContext = useUserClasses();
  // Derive the list of classes: prefer dbClasses if available, fallback to user details hook.
  const classesList = dbClasses
    ? dbClasses.split(",").map(cls => cls.trim()).filter(Boolean)
    : userClassesFromContext;

  // Get poll author from auth context
  const firstName = useFirstName();
  const lastName = useLastName();
  const author = `${firstName} ${lastName}`.trim();

  useEffect(() => {
    fetchPolls(setPolls);
  }, []);

  // New useEffect to fetch account details similar to Home
  useEffect(() => {
    if (user) {
      fetch(`${SERVER_IP}/accountDetails?userId=${user.user_id}`)
        .then(res => res.json())
        .then(details => {
          if (details && details.length > 0) {
            const account = details[0];
            setDbClasses(account.classes || "");
          }
        })
        .catch(err => console.error("Error fetching account details:", err));
    }
  }, [user]);

  // Create a new poll
  const createPoll = async () => {
    const filteredOptions = newPoll.options.filter((option) => option.trim() !== "");
    if (!newPoll.pollClass.trim() || !newPoll.question.trim() || filteredOptions.length < 2) {
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
          "Authorization": user ? `Bearer ${user.token}` : "",
        },
        body: JSON.stringify({
          question: newPoll.question,
          options: filteredOptions,
          created_by: `${firstName} ${lastName}`.trim(),
          created_by_id: user?.user_id,
          class: newPoll.pollClass, // use "class" key to match polls table column
          global: false,
        }),
      });
      if (!response.ok) {
        throw new Error(`Error creating poll: ${response.statusText}`);
      }
      setNewPoll({ question: "", options: ["", ""], pollClass: "" });
      fetchPolls(setPolls);
    } catch (err) {
      console.error("Error creating poll:", err);
      Alert.alert("Error", "An error occurred while creating the poll.");
    }
  };

  const removeOption = (index: number) => {
    const options = [...newPoll.options];
    options.splice(index, 1);
    setNewPoll({ ...newPoll, options });
  };

  return (
    <View style={styles.container}>
      <View style={{ width: "100%" }}>
        <Text style={styles.header}>Create a New Poll</Text>
        {/* Dropdown for selecting poll class */}
        <TouchableOpacity 
          style={[styles.input, { justifyContent: "center", marginBottom: 18 }]} 
          onPress={() => setPollClassModalVisible(true)}
        >
          <Text style={{ color: newPoll.pollClass ? "#000" : "#999" }}>
            {newPoll.pollClass ? newPoll.pollClass : "Select poll class"}
          </Text>
        </TouchableOpacity>
        {isPollClassModalVisible && (
          <View style={{ position: "absolute", top: 100, left: 20, right: 20, backgroundColor: "#fff", borderWidth: 1, borderColor: "#ccc", borderRadius: 5, maxHeight: 200, zIndex: 100 }}>
            <ScrollView>
              {classesList.map((cls, idx) => (
                <TouchableOpacity 
                  key={idx} 
                  onPress={() => { 
                    setNewPoll({ ...newPoll, pollClass: cls });
                    setPollClassModalVisible(false);
                  }}
                  style={{ padding: 10, borderBottomWidth: 1, borderBottomColor: "#eee" }}
                >
                  <Text>{cls}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity 
                onPress={() => setPollClassModalVisible(false)}
                style={{ padding: 10, alignItems:"center" }}
              >
                <Text style={{ fontWeight: "bold" }}>Cancel</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        )}
        <TextInput
          style={[styles.input, { marginBottom: 18 }]}
          placeholder="Poll question"
          value={newPoll.question}
          onChangeText={(text) => setNewPoll({ ...newPoll, question: text })}
        />
        {newPoll.options.map((option, index) => (
          <View key={index} style={{ position: "relative", marginBottom: 10 }}>
            <TextInput
              style={styles.input}
              placeholder={`Option ${index + 1}`}
              value={option}
              onChangeText={(text) => {
                const options = [...newPoll.options];
                options[index] = text;
                setNewPoll({ ...newPoll, options });
              }}
            />
            {newPoll.options.length > 2 && (
              <TouchableOpacity
                style={styles.removeButtonAbsolute}
                onPress={() => removeOption(index)}
              >
                <Text style={styles.removeButtonText}>Remove</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
        {newPoll.options.length < 5 && (
          <TouchableOpacity
            style={styles.button}
            onPress={() =>
              setNewPoll({ ...newPoll, options: [...newPoll.options, ""] })
            }
          >
            <Text style={styles.buttonText}>Add Another Option</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.button} onPress={createPoll}>
          <Text style={styles.buttonText}>Create Poll</Text>
        </TouchableOpacity>
      </View>
      {voteStatus ? <Text style={styles.status}>{voteStatus}</Text> : null}
    </View>
  );
};

export default PollScreen;