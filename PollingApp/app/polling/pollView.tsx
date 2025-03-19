import React, { useEffect, useState, useRef, useMemo, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  Dimensions,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  useWindowDimensions,
  RefreshControl,
  Switch,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import styles from "../../styles/styles";
import { fetchPolls, getSocket, Poll } from "../components/global";
import { SERVER_IP } from "../config";
import { useUserClasses, useAuth } from "../components/userDetails";
import { useRouter, useLocalSearchParams } from "expo-router";
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import shared components and utilities
import { 
  VotersList, 
  PollPieChart, 
  PollInfoOverlay, 
  isPollExpired,
  TotalVotesIndicator,
  ClassFilterBar,
  AnonymousModeToggle
} from "../components/pollVisualisation";

// Export the VotersList for backward compatibility
export { VotersList } from "../components/pollVisualisation";

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
  const [userYearGroup, setUserYearGroup] = useState<number | null>(null);

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
            
            // Store the user's year group
            if (account.year_group) {
              setUserYearGroup(account.year_group);
            }
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

  // Toggle anonymous mode for more explicit handling
  const toggleAnonymousMode = useCallback(() => {
    setAnonymousMode(prevMode => {
      const newMode = !prevMode;
      console.log(`[CLIENT] Anonymous mode toggled: ${prevMode} → ${newMode}`);
      return newMode;
    });
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
    
    setVoteLoading(true);
    
    // Always send the actual user ID along with anonymous flag
    const userId = user.user_id;
    // Force to numeric 1 or 0 to ensure proper type
    const isAnonymous = anonymousMode ? 1 : 0;
    
    console.log(`[CLIENT] Voting with anonymous mode: ${anonymousMode}, isAnonymous value: ${isAnonymous}, type: ${typeof isAnonymous}`);
    
    // Update local state immediately for a responsive UI
    setPolls((prevPolls) =>
      prevPolls.map((poll) => {
        const updatedOptions = poll.options.map((option) => {
          if (option.id === optionId) {
            // Update both voters and anonymous columns
            const newVoters = option.voters ? `${option.voters},${userId}` : `${userId}`;
            const newAnonymous = option.anonymous ? `${option.anonymous},${isAnonymous}` : `${isAnonymous}`;
            
            console.log(`[CLIENT] Updated option ${option.id} anonymous flags: ${newAnonymous}`);
            
            return { 
              ...option, 
              votes: option.votes + 1,
              voters: newVoters,
              anonymous: newAnonymous
            };
          }
          return option;
        });
        return { ...poll, options: updatedOptions };
      })
    );
    
    // Mark this option as voted by the user
    setUserVotes(prev => ({...prev, [optionId]: true}));
    
    // If anonymous mode is on, track this vote in anonymousVotes state
    if (isAnonymous === 1) {
      const updatedAnonymousVotes = {...anonymousVotes, [optionId]: true};
      setAnonymousVotes(updatedAnonymousVotes);
      
      // Persist to AsyncStorage
      AsyncStorage.setItem('anonymousVotes', JSON.stringify(updatedAnonymousVotes))
        .catch(err => console.error('Failed to save anonymous votes:', err));
    }
    
    // IMPORTANT: Send the isAnonymous as an explicit number value
    socketRef.current.emit("vote", { 
      optionId, 
      userId, 
      isAnonymous
    });
    
    // Remove spinner after short delay
    setTimeout(() => setVoteLoading(false), 2000);
  };

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

  // Render each poll card with anonymous vote check
  const renderPoll = ({ item }: { item: Poll }) => {
    // Check if user has voted in this poll (either normally or anonymously)
    const userVotedInPoll = item.options.some(option => 
      userVotes[option.id] || // Normal vote
      (anonymousVotes[option.id]) // Anonymous vote
    );
    
    // Determine if voting is disabled
    const votingDisabled = voteLoading || userVotedInPoll;
    
    // Calculate total votes
    const totalVotes = item.options.reduce((sum, option) => sum + option.votes, 0);
    
    return (
      <View style={[styles.pollCard, isMobile && { marginHorizontal: 5, padding: 10 }]}>
        {/* Use the shared PollPieChart component */}
        <PollPieChart 
          poll={item} 
          openInfoOverlay={openInfoOverlay} 
          isMobile={isMobile}
        />
        
        {/* Total votes indicator */}
        <TotalVotesIndicator totalVotes={totalVotes} />
        
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
                  <View style={[styles.swatchBox, { backgroundColor: index % 8 === 0 ? "#FF6384" : index % 8 === 1 ? "#36A2EB" : index % 8 === 2 ? "#FFCE56" : index % 8 === 3 ? "#4BC0C0" : index % 8 === 4 ? "#9966FF" : index % 8 === 5 ? "#FF9F40" : index % 8 === 6 ? "#FFCD56" : "#C9CBCF" }]} />
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

  // Filter polls by class, year group, and exclude expired polls
  const filteredPolls = polls.filter((poll) => {
    // First check if the poll is expired - if it is, exclude it
    if (isPollExpired(poll)) {
      return false;
    }
    
    // If the poll has a year_group that matches the user's year group, include it
    if (poll.year_group && poll.year_group === userYearGroup) {
      return true;
    }
    
    // Otherwise filter by class as usual
    const pollClassNormalized = (poll.pollClass || "").trim().toLowerCase();
    return activeFilter === "All"
      ? normalizedCurrentClasses.includes(pollClassNormalized)
      : pollClassNormalized === activeFilter.trim().toLowerCase();
  });

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
            <AnonymousModeToggle 
              anonymousMode={anonymousMode} 
              toggleAnonymousMode={toggleAnonymousMode} 
            />
            
            {/* Class Filter */}
            <ClassFilterBar
              activeFilter={activeFilter}
              setActiveFilter={setActiveFilter}
              currentClasses={currentClasses}
              isMobile={isMobile}
            />
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text>You have no active polls</Text>
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

      {/* Use the shared PollInfoOverlay component */}
      {infoPoll && (
        <PollInfoOverlay 
          poll={infoPoll} 
          slideAnim={slideAnim} 
          closeInfoOverlay={closeInfoOverlay} 
        />
      )}
    </View>
  );
};

export default PollView;