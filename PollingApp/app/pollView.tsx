import React, { useEffect, useState, useRef, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  Button,
  Dimensions,
  Image,
  ScrollView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Animated,
  useWindowDimensions,
  RefreshControl,
} from "react-native";
import { PieChart } from 'react-native-chart-kit';
import styles from "../styles/styles";
import { fetchPolls, getSocket } from "./global";
import { SERVER_IP } from "./config";
import { Poll } from "./global";
import { useUserClasses, useAuth } from "./userDetails";
import { useRouter, useLocalSearchParams } from "expo-router";
import { VictoryPie } from "victory-native/lib/components/victory-pie";


const PollView = () => {
  const { activeFilter: initialFilter } = useLocalSearchParams<{ activeFilter?: string }>();
  const [polls, setPolls] = useState<Poll[]>([]);
  const [activeFilter, setActiveFilter] = useState<string>(initialFilter || "All");
  const [loading, setLoading] = useState(true);
  const [voteLoading, setVoteLoading] = useState(false);
  const [infoPoll, setInfoPoll] = useState<Poll | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Get window dimensions for responsive layouts
  const { width: windowWidth } = useWindowDimensions();
  const isMobile = windowWidth < 500;

  // Slide animation for info overlay
  const slideAnim = useRef(new Animated.Value(-300)).current;

  // Use the shared socket instance
  const socketRef = useRef(getSocket());

  const screenWidth = Dimensions.get("window").width;
  const userClasses = useUserClasses();
  const { user } = useAuth();
  const [currentClasses, setCurrentClasses] = useState<string[]>(userClasses);
  const normalizedCurrentClasses = useMemo(
    () => currentClasses.map((cls: string) => cls.trim().toLowerCase()),
    [currentClasses]
  );
  const router = useRouter();

  // Pull-to-refresh handler with error feedback
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchPolls(setPolls, true); // Force refresh
    } catch (error) {
      console.error("Error refreshing polls:", error);
      // You could add a toast message here for user feedback
    } finally {
      setRefreshing(false);
    }
  };

  // Fetch user classes with better error handling
  useEffect(() => {
    if (user) {
      fetch(`${SERVER_IP}/accountDetails?userId=${user.user_id}`)
        .then((res) => {
          if (!res.ok) {
            throw new Error(`Server returned ${res.status}: ${res.statusText}`);
          }
          return res.json();
        })
        .then((details) => {
          if (details && details.length > 0) {
            const account = details[0];
            const classesStr = account.classes || "";
            const classesArr: string[] = classesStr
              .split(",")
              .map((cls: string) => cls.trim())
              .filter(Boolean);
            setCurrentClasses(classesArr);
          }
        })
        .catch((err) => {
          console.error("Error fetching account details:", err);
          // Fallback to existing classes if available
          if (userClasses.length > 0) {
            setCurrentClasses(userClasses);
          }
        });
    }
  }, [user, userClasses]);

  // Fetch polls and setup socket listeners with better error handling
  useEffect(() => {
    let isMounted = true;
    
    const getPolls = async () => {
      try {
        await fetchPolls(data => {
          if (isMounted) setPolls(data);
        });
      } catch (error) {
        console.error("Error fetching polls:", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    
    getPolls();

    const socket = socketRef.current;
    
    // Setup socket event listeners with safer parsing
    socket.on("pollsUpdated", (updatedPolls: any[]) => {
      if (!isMounted) return;
      
      try {
        // Validate that updatedPolls is actually an array
        if (!Array.isArray(updatedPolls)) {
          console.error("Invalid polls data received:", updatedPolls);
          return;
        }
        
        setPolls((prevPolls) =>
          updatedPolls.map((updated) => {
            const old = prevPolls.find((p) => p.id === updated.id);
            return {
              ...updated,
              pollClass:
                updated.pollClass ?? updated["class"] ?? (old ? old.pollClass : ""),
            };
          })
        );
      } catch (error) {
        console.error("Error processing updated polls:", error);
      }
    });
    
    // Handle socket errors
    socket.on("error", (error) => {
      console.error("Socket error:", error);
    });

    // Make sure socket is connected
    if (!socket.connected) {
      socket.connect();
    }

    return () => {
      isMounted = false;
      // Remove event listeners but keep socket connected
      socket.off("pollsUpdated");
      socket.off("error");
    };
  }, []);

  // Ensure valid activeFilter
  useEffect(() => {
    if (
      normalizedCurrentClasses.length > 0 &&
      activeFilter !== "All" &&
      !normalizedCurrentClasses.includes(activeFilter.trim().toLowerCase())
    ) {
      setActiveFilter("All");
    }
  }, [normalizedCurrentClasses, activeFilter]);

  // Apply initial filter from params if provided
  useEffect(() => {
    if (initialFilter && normalizedCurrentClasses.includes(initialFilter.trim().toLowerCase())) {
      setActiveFilter(initialFilter);
    }
  }, [initialFilter, normalizedCurrentClasses]);

  // Loading state
  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  // Vote
  const vote = (optionId: number) => {
    setVoteLoading(true);
    setPolls((prevPolls) =>
      prevPolls.map((poll) => {
        const updatedOptions = poll.options.map((option) => {
          if (option.id === optionId) {
            return { ...option, votes: option.votes + 1 };
          }
          return option;
        });
        return { ...poll, options: updatedOptions };
      })
    );
    socketRef.current.emit("vote", optionId);
    // Remove spinner after short delay (socket will also update on server side)
    setTimeout(() => setVoteLoading(false), 1000);
  };

  // Pie chart colors with names
  const chartColors = [
    "#FF6384", // Red
    "#36A2EB", // Blue
    "#FFCE56", // Yellow
    "#4BC0C0", // Teal
    "#9966FF", // Purple
    "#FF9F40", // Orange
    "#FFCD56", // Gold
    "#C9CBCF", // Grey
  ];

  // Info overlay open
  const openInfoOverlay = (poll: Poll) => {
    setInfoPoll(poll);
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  // Info overlay close
  const closeInfoOverlay = () => {
    Animated.timing(slideAnim, {
      toValue: -300,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setInfoPoll(null);
    });
  };

  // Render the pie chart and poll details
  const renderPieChart = (poll: Poll) => {
    const pollClass = poll.pollClass || (poll as any)["class"] || "";

    // Profile pic logic
    let profilePicUrl = null;
    if (poll.profile_picture && typeof poll.profile_picture === "string") {
      let pic = poll.profile_picture.trim();
      if (pic.startsWith(`"`) && pic.endsWith(`"`)) {
        pic = pic.slice(1, -1);
      }
      if (pic.startsWith("data:") || pic.startsWith("http://") || pic.startsWith("https://")) {
        profilePicUrl = pic;
      } else {
        profilePicUrl = `${SERVER_IP}/${pic}`;
      }
    }

    // Transform data for VictoryPie
    const data = poll.options.map((option, index) => ({
      x: option.text,
      y: option.votes || 0.001, // Avoid zero values which can cause rendering issues
      color: chartColors[index % chartColors.length],
    }));

    // Skip rendering chart if all votes are 0
    const totalVotes = poll.options.reduce((sum, option) => sum + option.votes, 0);

    // Adjust chart size based on screen width
    const chartWidth = Math.min(300, screenWidth - 60);
    const chartHeight = Math.min(220, chartWidth * 0.8);

    return (
      <View style={{ marginVertical: 10, position: "relative" }}>
        {/* Info button top-right */}
        <TouchableOpacity
          onPress={() => openInfoOverlay(poll)}
          style={{
            position: "absolute",
            top: 5,
            right: 5,
            backgroundColor: "#007AFF",
            width: 30,
            height: 30,
            borderRadius: 15,
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1,
          }}
        >
          <Text style={{ color: "#fff", fontSize: 16, fontWeight: "bold" }}>i</Text>
        </TouchableOpacity>

        {/* Class code (e.g. CS426) */}
        {pollClass ? (
          <Text style={styles.classCode}>{pollClass}</Text>
        ) : null}

        {/* Question text */}
        <Text style={styles.questionText}>{poll.question}</Text>

        {/* Centered chart */}
        <View style={{ alignItems: "center", alignSelf: "center", marginVertical: 10 }}>
          {totalVotes > 0 ? (
            <VictoryPie
              data={data}
              width={chartWidth}
              height={chartHeight}
              padding={40}
              innerRadius={30}

              style={{
                data: { 
                  fill: ({ datum }) => datum.color,
                  stroke: "#fff",
                  strokeWidth: 1
                },
                labels: { 
                  fill: "#fff",
                  fontSize: 12,
                  fontWeight: "bold",
                  textShadow: "1px 1px 2px rgba(0,0,0,0.5)"
                }
              }}
              animate={{
                duration: 1000,
                easing: "bounce",
                onLoad: { duration: 500 }
              }}
              labelPlacement="parallel"
              labels={({ datum }) => 
                totalVotes > 0 && datum.y/totalVotes > 0.05 ? 
                  `${Math.round((datum.y/totalVotes)*100)}%` : ""
              }
            />
          ) : (
            <Text style={{ fontSize: 16, color: "#666", padding: 20 }}>
              No votes yet
            </Text>
          )}
          
          {/* Custom legend */}
          <View style={{ width: chartWidth, marginTop: 10 }}>
            {data.map((item, index) => (
              <View key={index} style={{ flexDirection: "row", alignItems: "center", marginVertical: 5 }}>
                <View style={[styles.swatchBox, { backgroundColor: item.color }]} />
                <Text style={[styles.swatchText, { flex: 1 }]} numberOfLines={1} ellipsizeMode="tail">
                  {item.x}
                </Text>
                <Text style={{ fontSize: 12, fontWeight: "500", marginLeft: 5 }}>
                  {item.y} vote{item.y !== 1 ? 's' : ''}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    );
  };

  // Render each poll card
  const renderPoll = ({ item }: { item: Poll }) => {
    return (
      <View style={styles.pollCard}>
        {renderPieChart(item)}
        <View style={[
          styles.voteOptionsContainer,
          isMobile && { flexDirection: "column" }
        ]}>
          {item.options.map((option, index) => (
            <View 
              key={option.id} 
              style={[
                styles.voteButtonContainer,
                isMobile && { width: "100%", marginVertical: 4 }
              ]}
            >
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
                <View style={[styles.swatchBox, { backgroundColor: chartColors[index % chartColors.length] }]} />
                <Text style={styles.swatchText}>{option.text}</Text>
              </View>
              <TouchableOpacity 
                style={styles.voteButton}
                onPress={() => vote(option.id)}
                disabled={voteLoading}
              >
                <Text style={styles.voteButtonText}>VOTE</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </View>
    );
  };

  // Filter polls by class
  const filteredPolls = polls.filter((poll) => {
    const pollClassNormalized = (poll.pollClass || "").trim().toLowerCase();
    return activeFilter === "All"
      ? normalizedCurrentClasses.includes(pollClassNormalized)
      : pollClassNormalized === activeFilter.trim().toLowerCase();
  });

  // Helper function to format expiry dates
  const formatExpiry = (expiry: string) => {
    if (!expiry) return "N/A";
    const validStr = expiry.includes("T") ? expiry : expiry.replace(" ", "T");
    const dateObj = new Date(validStr);
    if (isNaN(dateObj.getTime())) return "Invalid date";
    return `${dateObj.toLocaleDateString()} ${dateObj.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  };

  return (
    <View style={styles.container}>
      <FlatList
        style={styles.pollListContainer}
        data={filteredPolls}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderPoll}
        contentContainerStyle={{ paddingBottom: 80 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#007AFF"]}
            tintColor={"#007AFF"}
          />
        }
        ListHeaderComponent={
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterScrollView}
          >
            <TouchableOpacity
              style={[
                styles.filterButton, 
                activeFilter === "All" && styles.activeFilterButton
              ]}
              onPress={() => setActiveFilter("All")}
            >
              <Text style={[
                styles.filterButtonText,
                activeFilter === "All" && styles.activeFilterText
              ]}>All</Text>
            </TouchableOpacity>
            
            {currentClasses.map((cls) => (
              <TouchableOpacity
                key={cls}
                style={[
                  styles.filterButton,
                  activeFilter === cls && styles.activeFilterButton
                ]}
                onPress={() => setActiveFilter(cls)}
              >
                <Text style={[
                  styles.filterButtonText,
                  activeFilter === cls && styles.activeFilterText
                ]}>{cls}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text>You have no active polls for this class</Text>
          </View>
        }
      />

      {voteLoading && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingIndicator}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Submitting vote...</Text>
          </View>
        </View>
      )}

      {/* Info overlay */}
      {infoPoll && (
        <Animated.View
          style={[
            styles.infoOverlay,
            {
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.infoCard}>
            <TouchableOpacity
              onPress={closeInfoOverlay}
              style={styles.closeButton}
            >
              <Text style={styles.closeButtonText}>×</Text>
            </TouchableOpacity>
            
            {/* Profile picture on the right inside the info card */}
            {infoPoll.profile_picture ? (
              <Image
                source={{
                  uri:
                    infoPoll.profile_picture.startsWith(`"`) &&
                    infoPoll.profile_picture.endsWith(`"`)
                      ? infoPoll.profile_picture.slice(1, -1)
                      : infoPoll.profile_picture,
                }}
                style={[styles.infoProfilePic, { marginTop: 10, width: 90, height: 90, borderRadius: 50 }]}
              />
            ) : null}
            <Text style={styles.infoTitle}>Poll Info</Text>
            <Text style={styles.infoDetail}>
              Created on:{" "}
              {new Date(infoPoll.created_at.replace(" ", "T")).toLocaleString()}
            </Text>
            <Text style={styles.infoDetail}>
              Created by: {infoPoll.created_by}
            </Text>
            <Text style={styles.infoDetail}>
              Expires at:{" "}
              {infoPoll.expiry
                ? new Date(infoPoll.expiry.replace(" ", "T")).toLocaleString()
                : "N/A"}
            </Text>
          </View>
        </Animated.View>
      )}
    </View>
  );
};

export default PollView;