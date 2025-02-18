import React, { useEffect, useState } from "react";
import { View, Text, TextInput, Button, Alert, Dimensions } from "react-native";
import styles from "./styles";
import { fetchPolls } from "./global";
import { SERVER_IP } from "./config";

const PollScreen = () => {
    interface PollOption {
        id: number;
        text: string;
        votes: number;
    }
    
    interface Poll {
        id: number;
        question: string;
        options: PollOption[];
    }
    
    const [polls, setPolls] = useState<Poll[]>([]);
    const [newPoll, setNewPoll] = useState({ question: "", options: ["", ""] });
    const [voteStatus, setVoteStatus] = useState("");


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
                },
                body: JSON.stringify({ ...newPoll, options: filteredOptions }),
            });
            if (!response.ok) {
                throw new Error(`Error creating poll: ${response.statusText}`);
            }
            setNewPoll({ question: "", options: ["", ""] }); // Reset to two blank options
            fetchPolls(setPolls);
        } catch (err) {
            console.error("Error creating poll:", err);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.header}>University Polling System</Text>

            {/* Create Poll Section */}
            <View style={styles.pollSection}>
                <Text style={styles.subHeader}>Create a New Poll</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Poll question"
                    value={newPoll.question}
                    onChangeText={(text) => setNewPoll({ ...newPoll, question: text })}
                />
                {newPoll.options.map((option, index) => (
                    <TextInput
                        key={index}
                        style={styles.input}
                        placeholder={`Option ${index + 1}`}
                        value={option}
                        onChangeText={(text) => {
                            const options = [...newPoll.options];
                            options[index] = text;
                            setNewPoll({ ...newPoll, options });
                        }}
                    />
                ))}
                <Button title="Add another option" onPress={() => setNewPoll({ ...newPoll, options: [...newPoll.options, ""] })} />
                <Button title="Create Poll" onPress={createPoll} />
            </View>
            {voteStatus ? <Text style={styles.status}>{voteStatus}</Text> : null}
        </View>
    );
};

export default PollScreen;