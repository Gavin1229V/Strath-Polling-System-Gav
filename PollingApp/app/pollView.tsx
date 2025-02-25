import React, { useEffect, useState, useRef } from "react";
import { View, Text, FlatList, Button, Dimensions, StyleSheet } from "react-native";
import { io } from "socket.io-client";
import { PieChart } from "react-native-chart-kit";
import Animated, { Layout, FadeIn, FadeOut } from "react-native-reanimated";
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
    const socketRef = useRef(io(SERVER_IP));
    const screenWidth = Dimensions.get("window").width;

    useEffect(() => {
        fetchPolls(setPolls);

        const socket = socketRef.current;
        socket.on("pollsUpdated", (updatedPolls: Poll[]) => {
            console.log("Received pollsUpdated event with data:", updatedPolls);
            setPolls(updatedPolls);
        });

        return () => {
            socket.disconnect();
        };
    }, []);

    // Cast a vote for an option
    const vote = (optionId: number) => {
        socketRef.current.emit("vote", optionId);
        console.log(`Vote emitted for option ID: ${optionId}`);
    };

    // Fixed colors for pie chart segments
    const colors = [
        "#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF", "#FF9F40", "#FFCD56", "#C9CBCF"
    ];

    // Render Pie Chart with Smooth Animations
    const renderPieChart = (poll: Poll) => {
        const data = poll.options.map((option, index) => ({
            name: option.text,
            votes: option.votes,
            color: colors[index % colors.length],
            legendFontColor: "#000",
            legendFontSize: 12
        }));

        return (
            <Animated.View 
                entering={FadeIn} 
                exiting={FadeOut} 
                layout={Layout.springify()} 
                style={{ marginVertical: 20 }}
            >
                <Text style={styles.questionText}>{poll.question}</Text>
                <PieChart
                    data={data}
                    width={screenWidth - 40}
                    height={220}
                    chartConfig={{
                        backgroundGradientFrom: "#fff",
                        backgroundGradientTo: "#fff",
                        color: () => `rgba(0, 0, 0, 1)`,
                        labelColor: () => `rgba(0, 0, 0, 1)`,
                    }}
                    accessor={"votes"}
                    backgroundColor={"transparent"}
                    paddingLeft={"10"}
                    absolute
                />
            </Animated.View>
        );
    };

    // Render Poll
    const renderPoll = ({ item }: { item: Poll }) => {
        return (
            <View style={styles.pollCard}>
                {renderPieChart(item)}
                <View style={{ flexDirection: "row", justifyContent: "space-around", marginVertical: 10 }}>
                    {item.options.map((option) => (
                        <View key={option.id} style={{ alignItems: "center" }}>
                            <Text>{option.text}</Text>
                            <Text>({option.votes})</Text>
                            <Button title="Vote" onPress={() => vote(option.id)} />
                        </View>
                    ))}
                </View>
            </View>
        );
    };

    return (
        <FlatList
            style={styles.container}
            data={polls}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderPoll}
            contentContainerStyle={{ paddingBottom: 80 }}
        />
    );
};

export default PollView;