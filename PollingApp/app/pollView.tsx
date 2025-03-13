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
} from "react-native";
import { io } from "socket.io-client";
import { PieChart } from "react-native-chart-kit";
import styles from "../styles/styles";
import { fetchPolls } from "./global";
import { SERVER_IP } from "./config";
import { Poll } from "./global";
import { useUserClasses, useAuth } from "./userDetails";
import { useRouter } from "expo-router";

const PollView = () => {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [activeFilter, setActiveFilter] = useState<string>("All");
  const [loading, setLoading] = useState(true);
  const [voteLoading, setVoteLoading] = useState(false);
  const [infoPoll, setInfoPoll] = useState<Poll | null>(null);

  // Slide animation for info overlay
  const slideAnim = useRef(new Animated.Value(-300)).current;

  // Socket setup
  const socketOptions = Platform.OS === "web" ? { transports: ["polling"] } : {};
  const socketRef = useRef(io(SERVER_IP, socketOptions));

  const screenWidth = Dimensions.get("window").width;
  const userClasses = useUserClasses();
  const { user } = useAuth();
  const [currentClasses, setCurrentClasses] = useState<string[]>(userClasses);
  const normalizedCurrentClasses = useMemo(
    () => currentClasses.map((cls: string) => cls.trim().toLowerCase()),
    [currentClasses]
  );
  const router = useRouter();

  // Fetch user classes
  useEffect(() => {
    if (user) {
      fetch(`${SERVER_IP}/accountDetails?userId=${user.user_id}`)
        .then((res) => res.json())
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
        });
    }
  }, [user]);

  // Fetch polls
  useEffect(() => {
    const getPolls = async () => {
      await fetchPolls(setPolls);
      setLoading(false);
    };
    getPolls();

    const socket = socketRef.current;
    socket.on("pollsUpdated", (updatedPolls: any[]) => {
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
    });

    return () => {
      socket.disconnect();
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

    const data = poll.options.map((option, index) => ({
      name: option.text,
      votes: option.votes,
      color: chartColors[index % chartColors.length],
      legendFontColor: "#000",
      legendFontSize: 12,
    }));

    return (
      <View style={{ marginVertical: 10, position: "relative" }}>
        {/* Move info button to top-right for a cleaner look */}
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
        <View style={{ alignItems: "center", alignSelf: "center" }}>
          <PieChart
            data={data}
            width={screenWidth - 80} // give a little horizontal margin
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
            hasLegend={false}
          />
        </View>
      </View>
    );
  };

  // Render each poll card
  const renderPoll = ({ item }: { item: Poll }) => {
    return (
      <View style={styles.pollCard}>
        {renderPieChart(item)}
        <View style={styles.voteRow}>
          {item.options.map((option, index) => (
            <View key={option.id} style={styles.voteButtonContainer}>
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
                <View style={[styles.swatchBox, { backgroundColor: chartColors[index % chartColors.length] }]} />
                <Text style={styles.swatchText}>{option.text}</Text>
              </View>
              <Text style={{ marginBottom: 4 }}>({option.votes})</Text>
              <Button title="VOTE" onPress={() => vote(option.id)} />
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
        style={styles.container}
        data={filteredPolls}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderPoll}
        contentContainerStyle={{ paddingBottom: 80 }}
        ListHeaderComponent={
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ padding: 10 }}
          >
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
          <View style={styles.emptyContainer}>
            <Text>You have no active polls</Text>
          </View>
        }
      />

      {voteLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#007AFF" />
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
                style={styles.infoProfilePic}
              />
            ) : null}
            <Text style={styles.infoTitle}>Poll Info</Text>
            <Text style={{ marginBottom: 5 }}>
              Created on:{" "}
              {new Date(infoPoll.created_at.replace(" ", "T")).toLocaleString()}
            </Text>
            <Text style={{ marginBottom: 5 }}>
              Created by: {infoPoll.created_by}
            </Text>
            <Text style={{ marginBottom: 10 }}>
              Expires at:{" "}
              {infoPoll.expiry
                ? new Date(infoPoll.expiry.replace(" ", "T")).toLocaleString()
                : "N/A"}
            </Text>
            <TouchableOpacity
              onPress={closeInfoOverlay}
              style={{ alignSelf: "flex-end" }}
            >
              <Text style={{ color: "#007AFF", fontWeight: "bold" }}>Close</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}
    </View>
  );
};

export default PollView;