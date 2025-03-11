import React, { useEffect, useState, useRef } from "react";
import { View, Text, FlatList, Button, Dimensions, StyleSheet, Image, ScrollView, TouchableOpacity } from "react-native";
import { io } from "socket.io-client";
import { PieChart } from "react-native-chart-kit";
import styles from "../styles/styles";
import { fetchPolls } from "./global";
import { SERVER_IP } from "./config";
import { Poll } from "./global"; // Import shared Poll type
import { useUserClasses, useAuth } from "./userDetails";  // updated import to include useAuth
import { useRouter } from "expo-router"; // new import

const PollView = () => {

    const [polls, setPolls] = useState<Poll[]>([]);
    const [activeFilter, setActiveFilter] = useState<string>("All"); // new state for filter
    const [loading, setLoading] = useState(true); // new loading state
    const socketRef = useRef(io(SERVER_IP));
    const screenWidth = Dimensions.get("window").width;
    const userClasses = useUserClasses(); // initial classes from user context
    const { user, setUser } = useAuth();
    // Local state for current classes (will be updated like Home)
    const [currentClasses, setCurrentClasses] = useState<string[]>(userClasses);
    // Normalize local current classes for consistent comparison
    const normalizedCurrentClasses = currentClasses.map(cls => cls.trim().toLowerCase());
    const router = useRouter(); // new hook for navigation

    // Fetch updated account details to update current classes (similar to Home)
    useEffect(() => {
        if (user) {
            fetch(`${SERVER_IP}/accountDetails?userId=${user.user_id}`)
              .then(res => res.json())
              .then(details => {
                if (details && details.length > 0) {
                    const account = details[0];
                    const classesStr = account.classes || "";
                    const classesArr: string[] = classesStr
                      .split(",")
                      .map((cls: string): string => cls.trim())
                      .filter(Boolean);
                    setCurrentClasses(classesArr);
                }
              })
              .catch(err => {
                console.error("Error fetching account details:", err);
              });
        }
    }, [user]);

    useEffect(() => {
        const getPolls = async () => {
            await fetchPolls(setPolls);
            setLoading(false);
        };
        getPolls();

        const socket = socketRef.current;
        socket.on("pollsUpdated", (updatedPolls: any[]) => {
            setPolls(prevPolls => 
              updatedPolls.map(updated => {
                  const old = prevPolls.find(p => p.id === updated.id);
                  return {
                      ...updated,
                      pollClass: updated.pollClass ?? updated["class"] ?? (old ? old.pollClass : "")
                  };
              })
            );
        });

        return () => {
            socket.disconnect();
        };
    }, []);

    // New useEffect to update activeFilter only when userClasses are loaded
    useEffect(() => {
        if (normalizedCurrentClasses.length > 0) { 
            // reset activeFilter if current filter is not in normalized user classes
            if (
                activeFilter !== "All" &&
                !normalizedCurrentClasses.includes(activeFilter.trim().toLowerCase())
            ) {
                setActiveFilter("All");
            }
        }
    }, [normalizedCurrentClasses]);

    // Display loading screen until loading is completed
    if (loading) {
        return (
            <View style={styles.container}>
                <Text>Loading...</Text>
            </View>
        );
    }

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
        const pollClass = poll.pollClass || (poll as any)["class"] || "";
        // Compute full profile picture URL similar to Home logic
        let profilePicUrl = null;
        if (poll.profile_picture && typeof poll.profile_picture === "string") {
             let pic = poll.profile_picture.trim();
             // Remove extra quotes if present
             if (pic.startsWith(`"`) && pic.endsWith(`"`)) {
                 pic = pic.slice(1, -1);
             }
             if (
               pic.startsWith("data:") ||
               pic.startsWith("http://") ||
               pic.startsWith("https://")
             ) {
                 profilePicUrl = pic;
             } else {
                 profilePicUrl = `${SERVER_IP}/${pic}`;
             }
        }

        const data = poll.options.map((option, index) => ({
            name: option.text,
            votes: option.votes,
            color: colors[index % colors.length],
            legendFontColor: "#000",
            legendFontSize: 12,
        }));

        return (
            <View style={{ marginVertical: 20 }}>
                {/* Update header view to display poll class using the same style as question */}
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <View>
                        <Text style={styles.questionText}>{pollClass}</Text>
                        <Text style={styles.questionText}>{poll.question}</Text>
                    </View>
                    {profilePicUrl ? (
                      <Image 
                        source={{ uri: profilePicUrl }} 
                        style={{ width: 60, height: 60, borderRadius: 30 }} 
                      />
                    ) : null}
                </View>
                <Text style={{ fontSize: 12, color: "#000" }}>
                  {`${poll.created_by} - ${new Date(poll.created_at).toLocaleString()}`}
                </Text>
                <PieChart
                    data={data}
                    width={screenWidth - 40}
                    height={220}
                    chartConfig={{
                        backgroundGradientFrom: "transparent",
                        backgroundGradientTo: "transparent",
                        color: () => `rgba(0, 0, 0, 1)`,
                        labelColor: () => `rgba(0, 0, 0, 1)`,
                        decimalPlaces: 0,
                    }}
                    accessor={"votes"}
                    backgroundColor={"transparent"}
                    paddingLeft={"10"}
                    absolute
                />
            </View>
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

    // Filter polls based on activeFilter using normalized strings
    const filteredPolls = polls.filter(poll => {
        const pollClassNormalized = (poll.pollClass || "").trim().toLowerCase();
        return activeFilter === "All"
          ? normalizedCurrentClasses.includes(pollClassNormalized)
          : pollClassNormalized === activeFilter.trim().toLowerCase();
    });

    return (
        <FlatList
            style={styles.container}
            data={filteredPolls}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderPoll}
            contentContainerStyle={{ paddingBottom: 80 }}
            ListHeaderComponent={
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ padding: 10 }}>
                    <Button
                        title="All"
                        onPress={() => setActiveFilter("All")}
                        color={activeFilter === "All" ? "#007AFF" : "#8E8E93"}
                    />
                    {currentClasses.map((cls) => (
                      <View key={cls} style={{ marginLeft: 10 }}>
                          <Button
                              title={cls}
                              onPress={() => setActiveFilter(cls)}
                              color={activeFilter === cls ? "#007AFF" : "#8E8E93"}
                          />
                      </View>
                    ))}
                </ScrollView>
            }
            ListEmptyComponent={
                <View style={{ flex: 1, justifyContent: "center", alignItems: "center", marginTop: 50 }}>
                    <Text>You have no active polls</Text>
                </View>
            }
        />
    );
};

export default PollView;