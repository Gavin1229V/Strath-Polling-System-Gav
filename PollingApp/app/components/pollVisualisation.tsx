import React, { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Animated,
  Platform,
  Dimensions,
  ActivityIndicator,
  ScrollView,
  Switch
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import styles from "../../styles/styles";
import { VictoryPie, VictoryBar, VictoryChart, VictoryAxis, VictoryTheme, VictoryLabel } from "victory-native";
import { processProfilePicture, Poll } from "./global";
import { SERVER_IP } from "../config";

// Shared chart colors across all poll views
export const chartColors = [
  "#FF6384", // Red
  "#36A2EB", // Blue
  "#FFCE56", // Yellow
  "#4BC0C0", // Teal
  "#9966FF", // Purple
  "#FF9F40", // Orange
  "#FFCD56", // Gold
  "#C9CBCF", // Grey
];

// Voter info interface used across components
export interface VoterInfo {
  user_id: number | string;
  email?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  profile_picture?: string | null;
  anonymous_index?: number;
  is_anonymous?: boolean;
  displayId?: string;
  votedOption?: string;  // Added to track what option was voted for
  optionColor?: string;  // Store the color of the option for visual reference
}

// Shared VotersList component for displaying participants
export const VotersList = ({ pollId, poll }: { pollId: number, poll: Poll }) => {
  const [voters, setVoters] = useState<VoterInfo[]>([]);
  const [loadingVoters, setLoadingVoters] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Move fetchVoters outside useEffect and wrap with useCallback
  const fetchVoters = useCallback(async () => {
    if (!poll || !poll.options || poll.options.length === 0) return;
    
    setLoadingVoters(true);
    setError(null);
    try {
      // Create arrays to store all voter IDs, their anonymous status, and vote choices
      let allVoterIds: string[] = [];
      let anonymousFlags: {[key: string]: boolean} = {};
      let voterChoices: {[key: string]: { text: string, color: string }} = {};
      
      // Step 1: Collect all voter IDs, anonymous status, and track which option they voted for
      poll.options.forEach((option, optionIndex) => {
        if (option.voters) {
          const voterIds = option.voters.split(',').filter(id => id && id.trim());
          const anonFlags = option.anonymous?.split(',').filter(flag => flag !== undefined) || [];
          
          // Make sure the arrays are the same length
          const minLength = Math.min(voterIds.length, anonFlags.length || voterIds.length);
          
          for (let i = 0; i < (anonFlags.length ? minLength : voterIds.length); i++) {
            const voterId = voterIds[i];
            const isAnon = anonFlags[i] === '1';
            
            allVoterIds.push(voterId);
            anonymousFlags[voterId] = isAnon;
            // Store the option this voter chose
            voterChoices[voterId] = {
              text: option.text,
              color: chartColors[optionIndex % chartColors.length]
            };
          }
        }
      });
      
      console.log(`[DEBUG] Poll ${pollId} - Collected ${allVoterIds.length} total votes`);
      
      if (allVoterIds.length === 0) {
        setVoters([]);
        return;
      }
      
      // Step 2: Fetch user data for all voter IDs - use imported SERVER_IP
      const response = await fetch(`${SERVER_IP}/api/users/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds: allVoterIds }),
      });
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown server error');
        throw new Error(`Server error (${response.status}): ${errorText}`);
      }
      
      const userData = await response.json();
      const userMap: {[key: string]: VoterInfo} = {};
      
      // Map users by ID for easy lookup
      userData.forEach((user: VoterInfo) => {
        userMap[user.user_id.toString()] = user;
      });
      
      // Step 3: Create the final voter list with anonymous flags and vote choices
      const finalVoters = allVoterIds.map((voterId, index) => {
        const isAnonymous = anonymousFlags[voterId] || false;
        const baseUser = userMap[voterId] || { user_id: voterId };
        const voteChoice = voterChoices[voterId];
        
        return {
          ...baseUser,
          displayId: `${voterId}-${index}`, 
          is_anonymous: isAnonymous,
          votedOption: voteChoice?.text,
          optionColor: voteChoice?.color
        };
      });
      
      console.log(`[DEBUG] Poll ${pollId} - Final participants: ${finalVoters.length}`);
      setVoters(finalVoters);
      
    } catch (error) {
      console.error("Error fetching voters:", error);
      setError(error instanceof Error ? error.message : "Unknown error fetching participant data");
      setVoters([]);
    } finally {
      setLoadingVoters(false);
    }
  }, [poll, pollId]);

  React.useEffect(() => {
    fetchVoters();
  }, [fetchVoters]);

  return (
    <View style={{ marginTop: 20, width: '100%' }}>
      <Text style={[styles.infoTitle, { fontSize: 18, marginBottom: 10 }]}>
        Poll Participants ({voters.length})
      </Text>
      
      {loadingVoters ? (
        <ActivityIndicator size="small" color="#007AFF" style={{ marginVertical: 10 }} />
      ) : error ? (
        <View style={{ 
          backgroundColor: '#ffebee', 
          padding: 12, 
          borderRadius: 8, 
          borderLeftWidth: 4, 
          borderLeftColor: '#d32f2f',
          marginVertical: 10 
        }}>
          <Text style={{ color: '#c62828', fontWeight: '500', marginBottom: 2 }}>
            <Ionicons name="alert-circle" size={16} /> Error Loading Participants
          </Text>
          <Text style={{ color: '#d32f2f' }}>
            {error}
          </Text>
          <TouchableOpacity 
            onPress={fetchVoters} 
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginTop: 8,
              alignSelf: 'flex-start'
            }}
          >
            <Ionicons name="refresh" size={14} color="#d32f2f" style={{ marginRight: 4 }} />
            <Text style={{ color: '#d32f2f', fontWeight: '500' }}>
              Try Again
            </Text>
          </TouchableOpacity>
        </View>
      ) : voters.length > 0 ? (
        <View style={{ maxHeight: 200 }}>
          {voters.map((item, index) => (
            <View key={`voter-${item.displayId || index}`} style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 6,
              borderBottomWidth: 1,
              borderBottomColor: '#eee'
            }}>
              <Image
                source={{
                  uri: item.is_anonymous
                    ? 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y'
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
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 14, fontWeight: '500' }}>
                    {item.is_anonymous
                      ? "Anonymous Participant" 
                      : (item.first_name && item.last_name 
                          ? `${item.first_name} ${item.last_name}` 
                          : (item.email || `User ${item.user_id}`))}
                  </Text>
                  
                  {/* Display what non-anonymous participants voted for */}
                  {!item.is_anonymous && item.votedOption && (
                    <View style={{ 
                      flexDirection: 'row', 
                      alignItems: 'center',
                      backgroundColor: item.optionColor ? `${item.optionColor}33` : '#f0f0f0', 
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 12,
                      marginLeft: 4
                    }}>
                      <View style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: item.optionColor || '#999',
                        marginRight: 4
                      }} />
                      <Text style={{ 
                        fontSize: 12, 
                        color: '#333',
                        fontWeight: '500'
                      }} numberOfLines={1}>
                        {item.votedOption}
                      </Text>
                    </View>
                  )}
                </View>
                {!item.is_anonymous && item.email && (
                  <Text style={{ fontSize: 12, color: '#666' }}>
                    {item.email}
                  </Text>
                )}
              </View>
            </View>
          ))}
        </View>
      ) : (
        <Text style={{ color: '#666', fontStyle: 'italic' }}>
          No participant data found
        </Text>
      )}
    </View>
  );
};

// Component for rendering a bar chart for a poll
export const PollBarChart = ({ 
  poll,
  isMobile = false
}: { 
  poll: Poll, 
  isMobile?: boolean
}) => {
  const screenWidth = Dimensions.get("window").width;
  const chartWidth = Math.min(380, screenWidth - 40);
  const chartHeight = 280;

  // Format data for bar chart
  const barData = poll.options.map((option, index) => ({
    x: option.text,
    y: option.votes || 0,
    fill: chartColors[index % chartColors.length],
    label: option.votes > 0 ? option.votes.toString() : ''
  }));
  
  // Skip rendering chart if all votes are 0
  const totalVotes = poll.options.reduce((sum, option) => sum + option.votes, 0);
  if (totalVotes === 0) {
    return (
      <View style={{ alignItems: 'center', paddingVertical: 20 }}>
        <Text style={{ fontSize: 16, color: "#666" }}>
          No votes yet to display in chart
        </Text>
      </View>
    );
  }
  
  return (
    <View style={{ alignItems: 'center', marginVertical: 15 }}>
      <VictoryChart
        width={chartWidth}
        height={chartHeight}
        theme={VictoryTheme.material}
        domainPadding={{ x: 25 }}
        padding={{ top: 20, bottom: 50, left: 60, right: 20 }}
      >
        <VictoryBar
          data={barData}
          style={{
            data: { 
              fill: ({ datum }) => datum.fill,
              width: 25 
            },
            labels: {
              fill: "#333",
              fontSize: 12,
              fontWeight: "bold"
            }
          }}
          animate={{
            duration: 2000,
            onLoad: { duration: 1000 }
          }}
          labels={({ datum }) => datum.y > 0 ? datum.y : ''}
          labelComponent={<VictoryLabel dy={-10} />}
        />
        <VictoryAxis
          style={{
            tickLabels: {
              angle: -45,
              fontSize: 10,
              padding: 15,
              textAnchor: "end"
            }
          }}
          tickFormat={(t) => t.length > 10 ? `${t.substring(0, 10)}...` : t}
        />
        <VictoryAxis
          dependentAxis
          label="Vote Count"
          style={{
            axisLabel: { padding: 45 }
          }}
        />
      </VictoryChart>
    </View>
  );
};

// Component for rendering a pie chart for a poll
export const PollPieChart = ({ 
  poll,
  openInfoOverlay,
  isMobile = false,
  showExpiryBadge = false
}: { 
  poll: Poll, 
  openInfoOverlay: (poll: Poll) => void,
  isMobile?: boolean,
  showExpiryBadge?: boolean
}) => {
  const [chartType, setChartType] = useState<'pie' | 'bar'>('pie');
  const pollClass = poll.pollClass || (poll as any)["class"] || "";
  const isYearGroupPoll = poll.global && poll.year_group;
  const screenWidth = Dimensions.get("window").width;

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

  // Top margin for badges
  const topMargin = showExpiryBadge ? 35 : 0;

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

      {/* Expiry badge if needed */}
      {showExpiryBadge && (
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
      )}

      {/* Year Group indicator or Class code */}
      {isYearGroupPoll ? (
        <View style={{
          backgroundColor: '#e3f2fd',
          paddingHorizontal: 12,
          paddingVertical: 6,
          borderRadius: 16,
          alignSelf: 'flex-start',
          marginTop: topMargin, 
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
        <View style={{ marginTop: topMargin }}>
          <Text style={styles.classCode}>{pollClass}</Text>
        </View>
      ) : null}

      {/* Question text */}
      <Text style={styles.questionText}>{poll.question}</Text>

      {/* Chart type toggle */}
      <View style={{
        flexDirection: 'row',
        justifyContent: 'center',
        marginVertical: 10,
        backgroundColor: '#f1f1f1',
        borderRadius: 20,
        padding: 3,
        width: 200,
        alignSelf: 'center'
      }}>
        <TouchableOpacity
          onPress={() => setChartType('pie')}
          style={{
            backgroundColor: chartType === 'pie' ? '#007AFF' : 'transparent',
            paddingVertical: 6,
            paddingHorizontal: 15,
            borderRadius: 18,
            flex: 1,
            alignItems: 'center'
          }}
        >
          <Text style={{ color: chartType === 'pie' ? '#fff' : '#555', fontWeight: '600' }}>Pie Chart</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          onPress={() => setChartType('bar')}
          style={{
            backgroundColor: chartType === 'bar' ? '#007AFF' : 'transparent',
            paddingVertical: 6,
            paddingHorizontal: 15,
            borderRadius: 18,
            flex: 1,
            alignItems: 'center'
          }}
        >
          <Text style={{ color: chartType === 'bar' ? '#fff' : '#555', fontWeight: '600' }}>Bar Chart</Text>
        </TouchableOpacity>
      </View>

      {/* Centered chart with increased size */}
      {chartType === 'pie' ? (
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
              No votes yet
            </Text>
          )}
        </View>
      ) : (
        <PollBarChart poll={poll} isMobile={isMobile} />
      )}

      {/* Display when the poll expired if needed */}
      {showExpiryBadge && poll.expiry && (
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
      )}
    </View>
  );
};

// Shared component for displaying poll information in an overlay
export const PollInfoOverlay = ({ 
  poll, 
  slideAnim, 
  closeInfoOverlay 
}: { 
  poll: Poll, 
  slideAnim: Animated.Value, 
  closeInfoOverlay: () => void 
}) => {
  // Calculate total votes
  const totalVotes = poll.options.reduce((sum, opt) => sum + opt.votes, 0);
  
  return (
    <Animated.View
      style={[
        styles.infoOverlay,
        { transform: [{ translateY: slideAnim }] },
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
        {poll.profile_picture ? (
          <Image
            source={{
              uri: processProfilePicture(poll.profile_picture) || undefined
            }}
            style={[styles.infoProfilePic, { marginTop: 10, width: 90, height: 90, borderRadius: 50 }]}
          />
        ) : null}
        <Text style={styles.infoTitle}>Poll Info</Text>
        
        {/* Expired Badge if needed */}
        {poll.expiry && new Date(poll.expiry) < new Date() && (
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
        )}
        
        {/* Add Year Group indicator for global polls */}
        {poll.year_group !== null && poll.year_group !== undefined && (
          <View style={{
            backgroundColor: '#e3f2fd', 
            padding: 8, 
            borderRadius: 8, 
            marginVertical: 8,
            alignSelf: 'center'
          }}>
            <Text style={{ color: '#1976d2', fontWeight: '600' }}>
              Year {poll.year_group} Group Poll
            </Text>
          </View>
        )}
        
        <Text style={styles.infoDetail}>
          Created on:{" "}
          {new Date(poll.created_at.replace(" ", "T")).toLocaleString()}
        </Text>
        <Text style={styles.infoDetail}>
          Created by: {poll.created_by}
        </Text>
        <Text style={styles.infoDetail}>
          {poll.expiry && new Date(poll.expiry) < new Date() ? 'Expired on: ' : 'Expires at: '}
          {poll.expiry
            ? new Date(poll.expiry.replace(" ", "T")).toLocaleString()
            : "N/A"}
        </Text>
        
        {/* Vote statistics section */}
        <View style={{ marginTop: 15, width: '100%' }}>
          <Text style={[styles.infoTitle, { fontSize: 18, marginBottom: 10 }]}>
            Vote Statistics
          </Text>
          
          {poll.options.length > 0 ? (
            <>
              {/* Total votes count */}
              <Text style={[styles.infoDetail, { fontWeight: '500', marginBottom: 8 }]}>
                Total votes: {totalVotes}
              </Text>
              
              {/* Simple text-based vote breakdown without percentage bars */}
              {poll.options.map((option, index) => {
                const percentage = totalVotes > 0 
                  ? Math.round((option.votes / totalVotes) * 100) 
                  : 0;
                  
                return (
                  <View key={option.id} style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 8,
                    paddingVertical: 4,
                    borderBottomWidth: index < poll.options.length - 1 ? 1 : 0,
                    borderBottomColor: '#eee'
                  }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                      <View style={[
                        styles.swatchBox, 
                        { backgroundColor: chartColors[index % chartColors.length] }
                      ]} />
                      <Text style={{ fontWeight: '500', marginLeft: 8, flex: 1 }} numberOfLines={2}>
                        {option.text}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 13, color: '#555', marginLeft: 4 }}>
                      {option.votes} ({percentage}%)
                    </Text>
                  </View>
                );
              })}
            </>
          ) : (
            <Text style={{ color: '#666', fontStyle: 'italic' }}>
              No voting options available
            </Text>
          )}
        </View>
        
        {/* Voters section */}
        <VotersList pollId={poll.id} poll={poll} />
      </View>
    </Animated.View>
  );
};

// Helper function to check if a poll is expired
export const isPollExpired = (poll: Poll): boolean => {
  if (!poll.expiry) return false;
  
  try {
    const now = new Date();
    // Handle both formats of date strings
    const expiryDate = new Date(
      poll.expiry.replace ? poll.expiry.replace(" ", "T") : poll.expiry
    );
    return expiryDate <= now;
  } catch (e) {
    console.error("Invalid expiry date format:", poll.expiry);
    return false;
  }
};

// Shared component for displaying total votes in a poll
export const TotalVotesIndicator = ({ totalVotes }: { totalVotes: number }) => {
  return (
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
  );
};

// Shared component for class filtering UI
export const ClassFilterBar = ({ 
  activeFilter, 
  setActiveFilter, 
  currentClasses,
  isMobile = false
}: { 
  activeFilter: string, 
  setActiveFilter: (filter: string) => void, 
  currentClasses: string[],
  isMobile?: boolean
}) => {
  return (
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
          ]}>All Polls</Text>
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
  );
};

// Anonymous mode toggle component
export const AnonymousModeToggle = ({
  anonymousMode,
  toggleAnonymousMode
}: {
  anonymousMode: boolean,
  toggleAnonymousMode: () => void
}) => {
  return (
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
  );
};

// Reusable poll list header component
export const PollListHeader = ({
  title,
  description,
  icon = "documents-outline",
  iconColor = "#555"
}: {
  title: string,
  description: string,
  icon?: string,
  iconColor?: string
}) => {
  return (
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
        <Ionicons name={icon as any} size={20} color={iconColor} /> {title}
      </Text>
      <Text style={{ color: '#555' }}>
        {description}
      </Text>
    </View>
  );
};

export default{};