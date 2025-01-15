import React, { useEffect, useState } from "react";
import { View, Text, TextInput, Button, FlatList, Alert, Dimensions } from "react-native";
import { BarChart } from "react-native-chart-kit";
import { Link } from "expo-router";
import styles from "./styles"; // Import styles from styles.js

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

    const screenWidth = Dimensions.get("window").width;

    // Fetch all polls from the server
    const fetchPolls = async () => {
        try {
            const response = await fetch("http://10.12.41.152:3001/api/polls"); // Ensure the URL includes the protocol
            if (!response.ok) {
                throw new Error(`Error fetching polls: ${response.statusText}`);
            }
            const data = await response.json();
            setPolls(data);
        } catch (err) {
            console.error("Error fetching polls:", err);
        }
    };

    // Create a new poll
    const createPoll = async () => {
        const filteredOptions = newPoll.options.filter((option) => option.trim() !== "");

        if (!newPoll.question.trim() || filteredOptions.length < 2) {
            Alert.alert("Validation Error", "Poll must have a question and at least two valid options.");
            return;
        }

        try {
            const response = await fetch("http://10.12.41.152:3001/api/polls", {
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
            fetchPolls();
        } catch (err) {
            console.error("Error creating poll:", err);
        }
    };

    // Cast a vote for an option
    const vote = async (optionId: number) => {
        try {
            const response = await fetch(`http://10.12.41.152:3001/api/vote/${optionId}`, {
                method: "POST",
            });
            if (!response.ok) {
                throw new Error(`Error voting: ${response.statusText}`);
            }
            setVoteStatus("Vote successfully recorded!");
            fetchPolls();
        } catch (err) {
            console.error("Error voting:", err);
            setVoteStatus("Failed to record vote.");
        }
    };

    useEffect(() => {
        fetchPolls();
    }, []);

    const renderBarChart = (poll: Poll) => {
        return (
            <BarChart
                data={{
                    labels: poll.options.map((option) => option.text),
                    datasets: [
                        {
                            data: poll.options.map((option) => option.votes),
                        },
                    ],
                }}
                width={screenWidth - 40}
                height={220}
                chartConfig={{
                    backgroundGradientFrom: "#ffffff",
                    backgroundGradientTo: "#ffffff",
                    color: (opacity = 1) => `rgba(54, 162, 235, ${opacity})`,
                    barPercentage: 0.5,
                }}
                verticalLabelRotation={30}
                yAxisLabel=""
                yAxisSuffix=""
                fromZero={true} // Ensure the lowest value on the axis is 0
            />
        );
    };

    return (
        <FlatList
            style={styles.container}
            data={polls}
            keyExtractor={(item) => item.id.toString()}
            ListHeaderComponent={
                <>
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

                    <Text style={styles.subHeader}>Available Polls</Text>
                </>
            }
            renderItem={({ item: poll }) => (
                <View style={styles.pollCard}>
                    <Text style={styles.pollQuestion}>{poll.question}</Text>
                    {renderBarChart(poll)}
                    <FlatList
                        data={poll.options}
                        renderItem={({ item }) => (
                            <View style={styles.option}>
                                <Text>{item.text}</Text>
                                <Button title="Vote" onPress={() => vote(item.id)} />
                            </View>
                        )}
                        keyExtractor={(item) => item.id.toString()}
                    />
                </View>
            )}
            ListFooterComponent={voteStatus ? <Text style={styles.status}>{voteStatus}</Text> : null}
        />
    );
};

export default PollScreen;