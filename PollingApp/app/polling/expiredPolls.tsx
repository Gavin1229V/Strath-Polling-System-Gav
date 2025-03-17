import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  Dimensions,
  Image,
  ScrollView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Animated,
  useWindowDimensions,
  RefreshControl,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import styles from "../../styles/styles";
import { fetchPolls, getSocket, processProfilePicture } from "../global";
import { SERVER_IP } from "../config";
import { Poll } from "../global";
import { useAuth, useUserRole } from "../userDetails";
import { useRouter } from "expo-router";
import { VictoryPie } from "victory-native/lib/components/victory-pie";
import { VotersList } from "./pollView"; // Reusing the VotersList component

const localStyles = StyleSheet.create({
  legendContainer: {
    flexDirection: "column",
    marginTop: 10,
    width: "100%",
    paddingHorizontal: 20,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    paddingVertical: 2,
  },
  legendText: {
    fontSize: 13,
    color: "#333",
    flex: 1,
  },
});

const ExpiredPollsScreen = () => {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [infoPoll, setInfoPoll] = useState<Poll | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [filteredPolls, setFilteredPolls] = useState<Poll[]>([]);

  // Get window dimensions for responsive layouts
  const { width: windowWidth } = useWindowDimensions();
  const isMobile = windowWidth < 500;

  // Slide animation for info overlay
  const slideAnim = useRef(new Animated.Value(-300)).current;

  // Use the shared socket instance
  const socketRef = useRef(getSocket());
  
  const screenWidth = Dimensions.get("window").width;
  
  const { user } = useAuth();
  const userRole = useUserRole() || 0; // Provide default value of 0 (student)
  const router = useRouter();

  // Check if user has permission to view this page
  useEffect(() => {
    // Only student representatives (role 2) and lecturers (role 3) can access
    if (user && userRole !== undefined && (userRole < 2 || userRole > 3)) {
      // Redirect unauthorized users back to home
      router.replace("/");
    }
  }, [user, userRole, router]);

  // Pull-to-refresh handler
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchExpiredPolls();
    } catch (error) {
      console.error("Error refreshing expired polls:", error);
    } finally {
      setRefreshing(false);
    }
  };

  // Fetch all polls and filter for expired ones
  const fetchExpiredPolls = async () => {
    try {
      setLoading(true);
      
      // Fetch all polls
      await fetchPolls((allPolls) => {
        // Filter for expired polls only
        const now = new Date();
        const expired = allPolls.filter(poll => {
          if (!poll.expiry) return false;
          
          // Safely parse the expiry date
          try {
            const expiryDate = new Date(
              poll.expiry.replace ? poll.expiry.replace(" ", "T") : poll.expiry
            );
            return expiryDate < now;
          } catch (e) {
            console.error("Invalid expiry date format:", poll.expiry);
            return false;
          }
        });
        
        // For student reps, only show polls for their year group or their classes
        if (userRole === 2 && user) {
          const userClasses = user.classes ? user.classes.split(',').map(c => c.trim().toLowerCase()) : [];
          
          fetch(`${SERVER_IP}/accountDetails?userId=${user.user_id}`)
            .then(res => res.json())
            .then(details => {
              if (details && details.length > 0) {
                const account = details[0];
                const userYearGroup = account.year_group;
                
                // Filter polls based on year group or class
                const filteredForRep = expired.filter(poll => 
                  (poll.year_group && poll.year_group === userYearGroup) || 
                  (poll.pollClass && userClasses.includes(poll.pollClass.toLowerCase()))
                );
                
                setPolls(expired); // Keep all expired polls in state
                setFilteredPolls(filteredForRep); // But display only filtered ones
              } else {
                setPolls(expired);
                setFilteredPolls(expired);
              }
            })
            .catch(err => {
              console.error("Error fetching account details:", err);
              setPolls(expired);
              setFilteredPolls(expired);
            })
            .finally(() => {
              setLoading(false);
            });
        } else {
          // Lecturers see all expired polls
          setPolls(expired);
          setFilteredPolls(expired);
          setLoading(false);
        }
      }, true); // Force refresh from server
      
    } catch (error) {
      console.error("Error fetching expired polls:", error);
      setLoading(false);
    }
  };

  // Fetch polls on component mount
  useEffect(() => {
    fetchExpiredPolls();
    
    // Socket listener for poll updates
    const socket = socketRef.current;
    socket.on("pollsUpdated", () => {
      fetchExpiredPolls();
    });
    
    return () => {
      socket.off("pollsUpdated");
    };
  }, [user]);

  // Info overlay open
  const openInfoOverlay = (poll: Poll) => {
    setInfoPoll(poll);
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  // Info overlay close
  const closeInfoOverlay = () => {
    Animated.timing(slideAnim, {
      toValue: -300,
      duration: 300,
      useNativeDriver: false,
    }).start(() => {
      setInfoPoll(null);
    });
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

  // Render the pie chart and poll details
  const renderPieChart = (poll: Poll) => {
    const pollClass = poll.pollClass || (poll as any)["class"] || "";
    const isYearGroupPoll = poll.year_group !== null && poll.year_group !== undefined;

    // Use the shared profile picture processing function
    let profilePicUrl = processProfilePicture(poll.profile_picture);

    // Transform data for VictoryPie
    const data = poll.options.map((option, index) => ({
      x: option.text,
      y: option.votes || 0.001, // Avoid zero values which can cause rendering issues
      color: chartColors[index % chartColors.length],
    }));

    // Skip rendering chart if all votes are 0
    const totalVotes = poll.options.reduce((sum, option) => sum + option.votes, 0);

    // Increase chart size while keeping it responsive
    const chartWidth = Math.min(380, screenWidth - 40);
    const chartHeight = Math.min(280, chartWidth * 0.8);

    // Platform-specific label styles to avoid web warnings
    const labelStyles = Platform.select({
      web: {
        fill: "#000",
        fontSize: 14,
        fontWeight: "bold",
      },
      default: {
        fill: "#000",
        fontSize: 14,
        fontWeight: "bold",
        textShadow: "1px 1px 2px rgba(255,255,255,0.7)"
      }
    });

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

        {/* Poll Expiry Badge */}
        <View style={{
          position: 'absolute',
          top: 5,
          left: 5,
          backgroundColor: '#ffcdd2',
          paddingHorizontal: 10,
          paddingVertical: 4,
          borderRadius: 12,
          flexDirection: 'row',
          alignItems: 'center',
          zIndex: 1,
        }}>
          <Ionicons name="time" size={14} color="#c62828" style={{ marginRight: 4 }} />
          <Text style={{ fontSize: 12, fontWeight: '600', color: '#c62828' }}>Expired</Text>
        </View>

        {/* Year Group indicator or Class code */}
        {isYearGroupPoll ? (
          <View style={{
            backgroundColor: '#e3f2fd',
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 16,
            alignSelf: 'flex-start',
            marginTop: 35, // Push down to avoid overlapping with expired badge
            marginBottom: 6,
            borderWidth: 1,
            borderColor: '#bbdefb',
            flexDirection: 'row',
            alignItems: 'center'
          }}>
            <Ionicons name="people" size={14} color="#1976d2" style={{ marginRight: 4 }} />
            <Text style={{ 
              color: '#1976d2',
              fontWeight: '600',
              fontSize: 13,
            }}>Year {poll.year_group}</Text>
          </View>
        ) : pollClass ? (
          <View style={{
            marginTop: 35, // Push down to avoid overlapping with expired badge
          }}>
            <Text style={styles.classCode}>{pollClass}</Text>
          </View>
        ) : null}

        {/* Question text */}
        <Text style={styles.questionText}>{poll.question}</Text>

        {/* Centered chart with increased size */}
        <View style={{ alignItems: "center", alignSelf: "center", marginVertical: 15 }}>
          {totalVotes > 0 ? (
            <VictoryPie
              data={data}
              width={chartWidth}
              height={chartHeight}
              padding={50}
              innerRadius={chartWidth * 0.12}
              style={{
                data: { 
                  fill: ({ datum }) => datum.color,
                  stroke: "#fff",
                  strokeWidth: 1
                },
                labels: labelStyles
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
              No votes were cast
            </Text>
          )}
          
          {/* Options legend */}
          <View style={styles.legendContainer || localStyles.legendContainer}>
            {data.map((item, index) => (
              <View key={index} style={styles.legendItem || localStyles.legendItem}>
                <View
                  style={{
                    width: 12,
                    height: 12,
                    backgroundColor: item.color,
                    marginRight: 8,
                    borderRadius: 2,
                  }}
                />
                <Text style={styles.legendText || localStyles.legendText} numberOfLines={1}>
                  {item.x}: {Math.round((item.y / totalVotes) * 100) || 0}% ({item.y} votes)
                </Text>
              </View>
            ))}
          </View>
        </View>
        
        {/* Display when the poll expired */}
        <View style={{
          backgroundColor: '#f5f5f5',
          padding: 10,
          borderRadius: 8,
          marginVertical: 10,
        }}>
          <Text style={{ fontSize: 14, color: '#555' }}>
            <Ionicons name="calendar" size={16} color="#555" style={{ marginRight: 5 }} />
            Expired on: {new Date(poll.expiry.replace(' ', 'T')).toLocaleString()}
          </Text>
        </View>
      </View>
    );
  };

  const renderPoll = ({ item }: { item: Poll }) => {    
    // Calculate total votes
    const totalVotes = item.options.reduce((sum, option) => sum + option.votes, 0);
    
    return (
      <View style={[styles.pollCard, isMobile && { marginHorizontal: 5, padding: 10 }]}>
        {renderPieChart(item)}
        
        {/* Total votes indicator */}
        <View style={{
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          paddingVertical: 8,
          marginTop: 5,
          marginBottom: 10,
          backgroundColor: '#f5f5f5',
          borderRadius: 20,
          paddingHorizontal: 15,
          alignSelf: 'center'
        }}>
          <Ionicons name="stats-chart" size={16} color="#555" style={{ marginRight: 6 }} />
          <Text style={{ 
            fontSize: 14, 
            fontWeight: '600', 
            color: '#555' 
          }}>
            {totalVotes} {totalVotes === 1 ? 'vote' : 'votes'} total
          </Text>
        </View>
      </View>
    );
  };

  // Loading state
  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={{ marginTop: 16 }}>Loading expired polls...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        style={[styles.pollListContainer, isMobile && { paddingHorizontal: 10 }]}
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
          <View style={{
            padding: 16,
            backgroundColor: '#f8f9fa',
            borderRadius: 12,
            margin: 16,
            marginBottom: 20,
          }}>
            <Text style={{ 
              fontSize: 20, 
              fontWeight: '700',
              color: '#333',
              marginBottom: 8 
            }}>
              <Ionicons name="time" size={20} color="#555" /> Expired Polls
            </Text>
            <Text style={{ color: '#555' }}>
              {userRole === 2 
                ? "View the results of expired polls for your year group and classes."
                : "Review all expired polls and their results."}
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={48} color="#ccc" />
            <Text style={{ marginTop: 16, color: '#666', textAlign: 'center' }}>
              No expired polls found
            </Text>
            <Text style={{ marginTop: 8, color: '#999', textAlign: 'center', paddingHorizontal: 32 }}>
              When polls expire, they will appear here so you can still view their results.
            </Text>
          </View>
        }
      />

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
            
            {/* Profile picture using shared function */}
            {infoPoll.profile_picture ? (
              <Image
                source={{
                  uri: processProfilePicture(infoPoll.profile_picture) || undefined
                }}
                style={[styles.infoProfilePic, { marginTop: 10, width: 90, height: 90, borderRadius: 50 }]}
              />
            ) : null}
            <Text style={styles.infoTitle}>Poll Info</Text>
            
            {/* Expired Badge */}
            <View style={{
              backgroundColor: '#ffcdd2', 
              padding: 8, 
              borderRadius: 8, 
              marginVertical: 8,
              flexDirection: 'row',
              alignItems: 'center',
              alignSelf: 'center'
            }}>
              <Ionicons name="time" size={16} color="#c62828" style={{ marginRight: 6 }} />
              <Text style={{ color: '#c62828', fontWeight: '600' }}>
                Expired Poll
              </Text>
            </View>
            
            {/* Add Year Group indicator for global polls */}
            {infoPoll.year_group !== null && infoPoll.year_group !== undefined ? (
              <View style={{
                backgroundColor: '#e3f2fd', 
                padding: 8, 
                borderRadius: 8, 
                marginVertical: 8,
                alignSelf: 'center'
              }}>
                <Text style={{ color: '#1976d2', fontWeight: '600' }}>
                  Year {infoPoll.year_group} Group Poll
                </Text>
              </View>
            ) : null}
            
            <Text style={styles.infoDetail}>
              Created on:{" "}
              {new Date(infoPoll.created_at.replace(" ", "T")).toLocaleString()}
            </Text>
            <Text style={styles.infoDetail}>
              Created by: {infoPoll.created_by}
            </Text>
            <Text style={styles.infoDetail}>
              Expired on:{" "}
              {infoPoll.expiry
                ? new Date(infoPoll.expiry.replace(" ", "T")).toLocaleString()
                : "N/A"}
            </Text>
            
            {/* Vote statistics section */}
            <View style={{ marginTop: 15, width: '100%' }}>
              <Text style={[styles.infoTitle, { fontSize: 18, marginBottom: 10 }]}>
                Vote Statistics
              </Text>
              
              {infoPoll.options.length > 0 ? (
                <>
                  {/* Total votes count */}
                  <Text style={[styles.infoDetail, { fontWeight: '500', marginBottom: 8 }]}>
                    Total votes: {infoPoll.options.reduce((sum, opt) => sum + opt.votes, 0)}
                  </Text>
                  
                  {/* Vote percentage breakdown */}
                  {(() => {
                    const totalVotes = infoPoll.options.reduce((sum, opt) => sum + opt.votes, 0);
                    
                    return infoPoll.options.map((option, index) => {
                      const percentage = totalVotes > 0 
                        ? Math.round((option.votes / totalVotes) * 100) 
                        : 0;
                        
                      return (
                        <View key={option.id} style={{
                          flexDirection: 'column',
                          marginBottom: 10,
                          paddingVertical: 4,
                          borderBottomWidth: index < infoPoll.options.length - 1 ? 1 : 0,
                          borderBottomColor: '#eee'
                        }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                            <View style={[
                              styles.swatchBox, 
                              { backgroundColor: chartColors[index % chartColors.length] }
                            ]} />
                            <Text style={{ fontWeight: '500', marginLeft: 8, flex: 1 }} numberOfLines={2}>
                              {option.text}
                            </Text>
                          </View>
                          <View style={{ flexDirection: 'row', alignItems: 'center', paddingLeft: 4 }}>
                            <View style={{
                              height: 6,
                              backgroundColor: chartColors[index % chartColors.length],
                              width: `${percentage}%`,
                              maxWidth: '60%',
                              borderRadius: 3,
                              marginRight: 8
                            }} />
                            <Text style={{ fontSize: 13, color: '#555' }}>
                              {option.votes} vote{option.votes !== 1 ? 's' : ''} ({percentage}%)
                            </Text>
                          </View>
                        </View>
                      );
                    });
                  })()}
                </>
              ) : (
                <Text style={{ color: '#666', fontStyle: 'italic' }}>
                  No voting options available
                </Text>
              )}
            </View>
            
            {/* Voters section - using the voters list component */}
            {infoPoll && <VotersList pollId={infoPoll.id} poll={infoPoll} />}
          </View>
        </Animated.View>
      )}
    </View>
  );
};

export default ExpiredPollsScreen;
