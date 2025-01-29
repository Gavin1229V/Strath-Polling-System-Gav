import React, { useEffect, useState } from "react";
import { View, Text, FlatList, Button, Dimensions } from "react-native";
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

    // Create the socket connection once
    const socket = React.useMemo(() => io(SERVER_IP), []);

    useEffect(() => {
        fetchPolls(setPolls);

        socket.on("pollsUpdated", (updatedPolls: Poll[]) => {
            console.log("Received pollsUpdated event with data:", updatedPolls);
            setPolls(updatedPolls);
        });

        return () => {
            socket.disconnect();
        };
    }, [socket]);

    // Cast a vote for an option
    const vote = (optionId: number) => {
        socket.emit("vote", optionId);
        console.log(`Vote emitted for option ID: ${optionId}`);
    };

    return (
        <View style={styles.container}>
            <FlatList
                data={polls}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                    <View>
                        <Text>{item.question}</Text>
                        {item.options.map((option) => (
                            <Button
                                key={option.id}
                                title={`${option.text} (${option.votes})`}
                                onPress={() => vote(option.id)}
                            />
                        ))}
                    </View>
                )}
            />
        </View>
    );
};

export default PollView;

