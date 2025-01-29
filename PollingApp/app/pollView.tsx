import React, { useEffect, useState } from "react";
import { View, Text, FlatList, Button, Dimensions } from "react-native";
import { BarChart } from "react-native-chart-kit";
import { io } from "socket.io-client";
import styles from "./styles";
import { fetchPolls } from "./global";
import { SERVER_IP } from "./config";

const PollView = () => {
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
    const [voteStatus, setVoteStatus] = useState("");

    const screenWidth = Dimensions.get("window").width;

    useEffect(() => {
        fetchPolls(setPolls);

        const socket = io(SERVER_IP);
        socket.on("pollsUpdated", (updatedPolls: Poll[]) => {
            console.log("Received pollsUpdated event with data:", updatedPolls);
            setPolls(updatedPolls);
        });

        return () => {
            socket.disconnect();
        };
    }, []);

    // Cast a vote for an option
    const vote = async (optionId: number) => {
        try {
            const response = await fetch(`${SERVER_IP}/api/vote/${optionId}`, {
                method: "POST",
            });
            if (!response.ok) {
                throw new Error(`Error voting: ${response.statusText}`);
            }
            setVoteStatus("Vote successfully recorded!");
            // No need to fetch polls again, as the server will emit the update
        } catch (err) {
            console.error("Error voting:", err);
            setVoteStatus("Failed to record vote.");
        }
    };

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
                    <Text style={styles.header}>Available Polls</Text>
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

export default PollView;

