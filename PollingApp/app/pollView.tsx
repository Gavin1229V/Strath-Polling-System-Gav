import React, { useEffect, useState, useRef, useMemo, useCallback } from "react";
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
  Switch,
} from "react-native";
import { Ionicons } from "@expo/vector-icons"; // Make sure Ionicons is imported
import styles from "../styles/styles";
import { fetchPolls, getSocket, processProfilePicture } from "./global";
import { SERVER_IP } from "./config";
import { Poll } from "./global";
import { useUserClasses, useAuth } from "./userDetails";
import { useRouter, useLocalSearchParams } from "expo-router";
import { VictoryPie } from "victory-native/lib/components/victory-pie";
import AsyncStorage from '@react-native-async-storage/async-storage';

// Add properly typed interfaces for our data
interface VoterInfo {
  user_id: number | string;
  email?: string;  // Add this property to match the backend response
  username?: string;
  first_name?: string;
  last_name?: string;
  profile_picture?: string | null;
  anonymous_index?: number;  // Add this property for anonymous participants
}

// Create a separate component for the voter list to avoid hook ordering issues
const VotersList = ({ pollId, voterIds }: { pollId: number, voterIds: string[] }) => {
  const [voters, setVoters] = useState<VoterInfo[]>([]);
  const [loadingVoters, setLoadingVoters] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch voter data when the component mounts or voterIds change
  useEffect(() => {
    if (voterIds.length === 0) return;
    
    const fetchVoters = async () => {
      setLoadingVoters(true);
      setError(null);
      try {
        // Count the anonymous voters for debugging
        const anonymousCount = voterIds.filter(id => id === "1").length;
        console.log(`[DEBUG] Poll ${pollId} - Fetching voter info for ${voterIds.length} voters (${anonymousCount} anonymous)`);
        
        if (anonymousCount > 0) {
          console.log(`[DEBUG] Anonymous voter IDs positions:`, 
            voterIds.map((id, index) => id === "1" ? index : null).filter(idx => idx !== null)
          );
        }
        
        const response = await fetch(`${SERVER_IP}/api/users/batch`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userIds: voterIds }), // Send the exact array with duplicated "1"s
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Failed to fetch voter info (${response.status}):`, errorText);
          setError(`Server error: ${response.status}`);
          setVoters([]);
          return;
        }
        
        const data = await response.json();
        console.log(`[DEBUG] Poll ${pollId} - Received ${data.length} voters from server`);
        
        // Check if we received the right number of anonymous participants
        const receivedAnonymous = data.filter((v: VoterInfo) => v.user_id === 1 || v.user_id === "1");
        console.log(`[DEBUG] Poll ${pollId} - Received ${receivedAnonymous.length} anonymous participants out of ${anonymousCount} expected`);
        
        if (receivedAnonymous.length > 0) {
          console.log(`[DEBUG] Anonymous participants:`, receivedAnonymous.map((v: VoterInfo) => 
            `${v.first_name} ${v.last_name || ''} (index: ${v.anonymous_index !== undefined ? v.anonymous_index : 'undefined'})`
          ).join(', '));
        }
        
        // The server already sorts with anonymous users at the end,
        // but we can ensure it here as well
        const sortedData = [...data].sort((a, b) => {
          // Regular users first, anonymous users last
          if ((a.user_id === 1 || a.user_id === "1") && (b.user_id !== 1 && b.user_id !== "1")) 
            return 1;
          if ((a.user_id !== 1 && a.user_id !== "1") && (b.user_id === 1 || b.user_id === "1")) 
            return -1;
          return 0;
        });
        
        console.log(`[DEBUG] Poll ${pollId} - Sorted voters with regular users first, then anonymous`);
        
        setVoters(sortedData);
      } catch (error) {
        console.error("Fetch error:", error);
        setError("Network error");
        setVoters([]);
      } finally {
        setLoadingVoters(false);
      }
    };
    
    fetchVoters();
  }, [pollId, voterIds.join(',')]);

  // If no voters, return nothing
  if (voterIds.length === 0) return null;

  return (
    <View style={{ marginTop: 20, width: '100%' }}>
      <Text style={[styles.infoTitle, { fontSize: 18, marginBottom: 10 }]}>
        Poll Participants ({voterIds.length})
      </Text>
      
      {loadingVoters ? (
        <ActivityIndicator size="small" color="#007AFF" style={{ marginVertical: 10 }} />
      ) : error ? (
        <Text style={{ color: 'red', fontStyle: 'italic', marginVertical: 10 }}>
          {error}
        </Text>
      ) : voters.length > 0 ? (
        <FlatList
          data={voters}
          keyExtractor={(item, index) => `voter-${item.user_id}-${item.anonymous_index !== undefined ? item.anonymous_index : ''}-${index}`}
          horizontal={false}
          showsVerticalScrollIndicator={true}
          style={{ maxHeight: 200 }}
          contentContainerStyle={{ paddingBottom: 10 }}
          renderItem={({ item }) => (
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 6,
              borderBottomWidth: 1,
              borderBottomColor: '#eee'
            }}>
              <Image
                source={{
                  uri: item.user_id === 1 || item.user_id === "1"
                    ? 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y' // Anonymous user image
                    : processProfilePicture(item.profile_picture || null) || 
                      'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y'
                }}
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 15,
                  marginRight: 10
                }}
              />
              <Text style={{ fontSize: 14 }}>
                {item.user_id === 1 || item.user_id === "1"
                  ? "Anonymous Participant" // Always display anonymous users with this name, no numbering
                  : (item.first_name && item.last_name 
                      ? `${item.first_name} ${item.last_name}` 
                      : (item.email || `User ${item.user_id}`))}
              </Text>
            </View>
          )}
        />
      ) : (
        <Text style={{ color: '#666', fontStyle: 'italic' }}>
          No participant data found
        </Text>
      )}
    </View>
  );
};

const PollView = () => {
  const { activeFilter: initialFilter } = useLocalSearchParams<{ activeFilter?: string }>();
  const [polls, setPolls] = useState<Poll[]>([]);
  const [activeFilter, setActiveFilter] = useState<string>(initialFilter || "All");
  const [loading, setLoading] = useState(true);
  const [voteLoading, setVoteLoading] = useState(false);
  const [infoPoll, setInfoPoll] = useState<Poll | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [userVotes, setUserVotes] = useState<{[key: number]: boolean}>({});
  const [anonymousMode, setAnonymousMode] = useState<boolean>(false);
  const [anonymousVotes, setAnonymousVotes] = useState<{[key: number]: boolean}>({});

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

  // Load anonymous mode setting and anonymous votes from storage
  useEffect(() => {
    const loadAnonymousSettings = async () => {
      try {
        // Load anonymous mode state
        const storedAnonymousMode = await AsyncStorage.getItem('anonymousMode');
        if (storedAnonymousMode !== null) {
          setAnonymousMode(storedAnonymousMode === 'true');
        }
        
        // Load anonymous votes
        const storedAnonymousVotes = await AsyncStorage.getItem('anonymousVotes');
        if (storedAnonymousVotes !== null) {
          setAnonymousVotes(JSON.parse(storedAnonymousVotes));
        }
      } catch (error) {
        console.error('Failed to load anonymous settings:', error);
      }
    };
    
    loadAnonymousSettings();
  }, []);

  // Save anonymous mode state when it changes
  useEffect(() => {
    const saveAnonymousMode = async () => {
      try {
        await AsyncStorage.setItem('anonymousMode', anonymousMode.toString());
      } catch (error) {
        console.error('Failed to save anonymous mode:', error);
      }
    };
    
    saveAnonymousMode();
  }, [anonymousMode]);

  // Save anonymous votes when they change
  useEffect(() => {
    const saveAnonymousVotes = async () => {
      try {
        await AsyncStorage.setItem('anonymousVotes', JSON.stringify(anonymousVotes));
      } catch (error) {
        console.error('Failed to save anonymous votes:', error);
      }
    };
    
    saveAnonymousVotes();
  }, [anonymousVotes]);

  // Toggle anonymous mode and handle state persistence
  const toggleAnonymousMode = useCallback(() => {
    setAnonymousMode(prev => !prev);
  }, []);

  // Fetch polls and setup socket listeners with better error handling
  useEffect(() => {
    let isMounted = true;
    
    const getPolls = async () => {
      try {
        await fetchPolls(data => {
          if (isMounted) {
            setPolls(data);
            
            // Initialize user votes based on fetched polls
            if (user) {
              const votedOptions: {[key: number]: boolean} = {};
              
              data.forEach(poll => {
                poll.options.forEach(option => {
                  if (option.voters) {
                    const voterIds = option.voters.split(',');
                    if (voterIds.includes(user.user_id.toString())) {
                      votedOptions[option.id] = true;
                    }
                    
                    // Check for anonymous votes (voter ID = 1) and mark them if in anonymous mode
                    if (voterIds.includes("1") && anonymousMode) {
                      // Load the anonymousVotes to check if this user voted anonymously
                      const optionId = option.id;
                      if (anonymousVotes[optionId]) {
                        votedOptions[optionId] = true;
                      }
                    }
                  }
                });
              });
              
              setUserVotes(votedOptions);
            }
          }
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
  

    return () => {
      isMounted = false;
      // Remove event listeners but keep socket connected
      socket.off("pollsUpdated");
      socket.off("error");
    };
  }, [user, anonymousMode, anonymousVotes]);

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
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  // Vote with anonymous mode tracking
  const vote = (optionId: number) => {
    if (!user) {
      // Could add a message that login is required
      return;
    }
    
    // Check if user has already voted for this option
    if (userVotes[optionId]) {
      return;
    }
    
    // Check if this is an anonymous vote that was already cast
    if (anonymousMode && anonymousVotes[optionId]) {
      return;
    }
    
    setVoteLoading(true);
    
    // Use user ID 1 for anonymous voting or the actual user ID otherwise
    const voteUserId = anonymousMode ? 1 : user.user_id;
    
    // Update local state immediately for a responsive UI
    setPolls((prevPolls) =>
      prevPolls.map((poll) => {
        const updatedOptions = poll.options.map((option) => {
          if (option.id === optionId) {
            return { 
              ...option, 
              votes: option.votes + 1,
              voters: option.voters ? `${option.voters},${voteUserId}` : `${voteUserId}`
            };
          }
          return option;
        });
        return { ...poll, options: updatedOptions };
      })
    );
    
    // If in anonymous mode, track this vote in anonymous votes
    if (anonymousMode) {
      setAnonymousVotes(prev => ({...prev, [optionId]: true}));
    }
    
    // Mark this option as voted by the user
    setUserVotes(prev => ({...prev, [optionId]: true}));
    
    // Send vote to server with user ID (anonymous or real)
    socketRef.current.emit("vote", { optionId, userId: voteUserId });
    
    // Remove spinner after short delay
    setTimeout(() => setVoteLoading(false), 2000);
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
      useNativeDriver: false,  // Changed from true to false
    }).start();
  };

  // Info overlay close
  const closeInfoOverlay = () => {
    Animated.timing(slideAnim, {
      toValue: -300,
      duration: 300,
      useNativeDriver: false,  // Changed from true to false
    }).start(() => {
      setInfoPoll(null);
    });
  };

  // Render the pie chart and poll details
  const renderPieChart = (poll: Poll) => {
    const pollClass = poll.pollClass || (poll as any)["class"] || "";

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
        fill: "#fff",
        fontSize: 14,
        fontWeight: "bold",
      },
      default: {
        fill: "#fff",
        fontSize: 14,
        fontWeight: "bold",
        textShadow: "1px 1px 2px rgba(0,0,0,0.5)"
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

        {/* Class code (e.g. CS426) */}
        {pollClass ? (
          <Text style={styles.classCode}>{pollClass}</Text>
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
                duration: 2000,
                easing: "bounce",
                onLoad: { duration: 1000 }
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
          
          {/* Removed custom legend section - poll options will only be displayed once with the vote buttons */}
        </View>
      </View>
    );
  };

  // Render each poll card with anonymous vote check
  const renderPoll = ({ item }: { item: Poll }) => {
    // Check if user has voted in this poll
    const userVotedInPoll = item.options.some(option => 
      userVotes[option.id]
    );
    
    // Check if anonymous user has voted in this poll
    const anonymousVotedInPoll = anonymousMode && item.options.some(option => 
      anonymousVotes[option.id]
    );
    
    // Determine if voting is disabled
    const votingDisabled = voteLoading || userVotedInPoll || anonymousVotedInPoll;
    
    return (
      <View style={[styles.pollCard, isMobile && { marginHorizontal: 5, padding: 10 }]}>
        {renderPieChart(item)}
        <View style={[
          styles.voteOptionsContainer,
          isMobile && { flexDirection: "column", alignItems: "stretch", paddingHorizontal: 10 }
        ]}>
          {item.options.map((option, index) => {
            const hasVoted = userVotes[option.id] || (anonymousMode && anonymousVotes[option.id]);
            
            return (
              <View 
                key={option.id} 
                style={[
                  styles.voteButtonContainer,
                  isMobile && { width: "100%", marginVertical: 4, flexDirection: "row", justifyContent: "space-between" }
                ]}
              >
                <View style={{ 
                  flexDirection: "row", 
                  alignItems: "center", 
                  marginBottom: isMobile ? 0 : 4,
                  flex: isMobile ? 1 : undefined 
                }}>
                  <View style={[styles.swatchBox, { backgroundColor: chartColors[index % chartColors.length] }]} />
                  <Text style={[styles.swatchText, isMobile && { flex: 1, marginRight: 8, flexWrap: 'wrap' }]} numberOfLines={2}>
                    {option.text}
                  </Text>
                </View>
                <TouchableOpacity 
                  style={[
                    styles.voteButton, 
                    isMobile && { minWidth: 70 },
                    hasVoted && { backgroundColor: '#4CAF50' },
                    votingDisabled && !hasVoted && { backgroundColor: '#cccccc' }
                  ]}
                  onPress={() => vote(option.id)}
                  disabled={votingDisabled}
                >
                  <Text style={styles.voteButtonText}>
                    {hasVoted ? 'VOTED' : 'VOTE'}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })}
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

  // Add this helper function to extract voters from poll options
  const getUniqueVotersFromPoll = (poll: Poll): string[] => {
    if (!poll || !poll.options) return [];
    
    // For regular users, we want to deduplicate
    const regularVoterIds = new Set<string>();
    // For anonymous users (ID "1"), we need to keep track of how many there are
    let anonymousVoterCount = 0;
    
    // Count all voters across all options
    poll.options.forEach(option => {
      if (option.voters) {
        const voterIds = option.voters.split(',').filter(id => id && id.trim());
        voterIds.forEach(id => {
          if (id === "1") {
            anonymousVoterCount++;
          } else {
            regularVoterIds.add(id);
          }
        });
      }
    });
    
    // Build the final array with regular users first, then anonymous users
    const result: string[] = [];
    
    // Add regular voter IDs (already deduplicated by the Set)
    result.push(...Array.from(regularVoterIds));
    
    // Add all anonymous voter IDs (preserving duplicates) after regular users
    for (let i = 0; i < anonymousVoterCount; i++) {
      result.push("1");
    }
    
    console.log(`[DEBUG] Poll ${poll.id} - getUniqueVotersFromPoll found ${regularVoterIds.size} unique regular users and ${anonymousVoterCount} anonymous voters`);
    
    return result;
  };

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
          <View>
            {/* Anonymous Mode Toggle */}
            <View style={{
              flexDirection: 'row',
              justifyContent: 'flex-end',
              alignItems: 'center',
              paddingHorizontal: 16,
              paddingVertical: 8,
              marginTop: 5
            }}>
              <Text style={{ marginRight: 10, fontSize: 14, fontWeight: '500' }}>
                Anonymous Mode
              </Text>
              <Switch
                trackColor={{ false: "#767577", true: "#81b0ff" }}
                thumbColor={anonymousMode ? "#007AFF" : "#f4f3f4"}
                ios_backgroundColor="#3e3e3e"
                onValueChange={toggleAnonymousMode}
                value={anonymousMode}
              />
            </View>
            
            {/* Class Filter */}
            <View style={{
              marginBottom: 10,
              backgroundColor: '#F2F4F8',
              borderRadius: 12,
              paddingVertical: 10,
              marginHorizontal: isMobile ? 5 : 16,
              marginTop: 5
            }}>
              <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#555' }}>
                  <Ionicons name="filter-outline" size={16} color="#555" /> Filter by Class:
                </Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 12 }}
              >
                <TouchableOpacity
                  style={[
                    styles.yearFilterChip,
                    activeFilter === "All" && styles.yearFilterChipActive,
                  ]}
                  onPress={() => setActiveFilter("All")}
                >
                  <Text style={[
                    styles.yearFilterChipText,
                    activeFilter === "All" && styles.yearFilterChipTextActive
                  ]}>All Classes</Text>
                </TouchableOpacity>
                
                {currentClasses.map((cls) => (
                  <TouchableOpacity
                    key={cls}
                    style={[
                      styles.yearFilterChip,
                      activeFilter === cls && styles.yearFilterChipActive,
                    ]}
                    onPress={() => setActiveFilter(cls)}
                  >
                    <Text style={[
                      styles.yearFilterChipText,
                      activeFilter === cls && styles.yearFilterChipTextActive
                    ]}>{cls}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
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
            
            {/* Voters section - using the dedicated component */}
            {infoPoll && 
              <VotersList 
                pollId={infoPoll.id}
                voterIds={getUniqueVotersFromPoll(infoPoll)}
              />
            }
          </View>
        </Animated.View>
      )}
    </View>
  );
};

export default PollView;