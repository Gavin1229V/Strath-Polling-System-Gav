import React, { useEffect, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert } from "react-native";
import styles from "../styles/styles";
import { fetchPolls } from "./global";
import { SERVER_IP } from "./config";
import { useFirstName, useLastName, useAuth } from "./userDetails"; // updated: import useAuth

const PollScreen = () => {
  interface PollOption {
    id: number;
    text: string;
    votes: number;
  }

  // Updated Poll interface with extra fields.
  interface Poll {
    id: number;
    question: string;
    created_by: string;
    created_at: string;
    options: PollOption[];
  }

  const [polls, setPolls] = useState<Poll[]>([]);
  const [newPoll, setNewPoll] = useState({ question: "", options: ["", ""] });
  const [voteStatus, setVoteStatus] = useState("");

  const { user } = useAuth(); // Get auth details including token

  // Get poll author from auth context
  const firstName = useFirstName();
  const lastName = useLastName();
  const author = `${firstName} ${lastName}`.trim();

  useEffect(() => {
    fetchPolls(setPolls);
  }, []);

  // Create a new poll
  const createPoll = async () => {
    const filteredOptions = newPoll.options.filter((option) => option.trim() !== "");
    if (!newPoll.question.trim() || filteredOptions.length < 2) {
      Alert.alert("Validation Error", "Poll must have a question and at least two valid options.");
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
          created_by: `${firstName} ${lastName}`.trim(), // same as author
          created_by_id: user?.user_id,
          class: user?.classes || "",
          global: false,
        }),
      });
      if (!response.ok) {
        throw new Error(`Error creating poll: ${response.statusText}`);
      }
      setNewPoll({ question: "", options: ["", ""] });
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
        <TextInput
          style={[styles.input, { flex: 1 }]}
          placeholder="Poll question"
          value={newPoll.question}
          onChangeText={(text) => setNewPoll({ ...newPoll, question: text })}
        />
        {newPoll.options.map((option, index) => (
          <View key={index} style={styles.optionContainer}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
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
                style={styles.removeButton}
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