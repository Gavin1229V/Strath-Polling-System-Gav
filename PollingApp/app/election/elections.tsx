import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuth, getFirstNameFromEmail, getLastNameFromEmail } from "../userDetails";
import { SERVER_IP } from "../config";
import styles from "../../styles/styles";

interface Election {
  id: number;
  title: string;
  description: string;
  created_at: string;
  end_date: string;
  candidate_count: number;
  creator_email?: string;
  year_group: number;
  is_expired: number;
  winner_id: number | null;
}

const ElectionsScreen = () => {
  const [elections, setElections] = useState<Election[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeYearFilter, setActiveYearFilter] = useState<number | null>(null);
  
  const { user } = useAuth();
  const router = useRouter();

  // Check if user has the student role (using role === 1)
  const isStudent = user && user.role === 1;
  
  // Check if user is a lecturer (role === 3)
  const isLecturer = user && user.role === 3;
  
  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Check if election is still open
  const isElectionOpen = (endDate: string) => {
    return new Date(endDate) > new Date();
  };

  // Fetch elections
  const fetchElections = async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    else setLoading(true);
    
    try {
      const response = await fetch(`${SERVER_IP}/api/elections`);
      if (!response.ok) {
        throw new Error("Failed to fetch elections");
      }
      const data = await response.json();
      setElections(data);
    } catch (error) {
      console.error("Error fetching elections:", error);
      Alert.alert("Error", "Failed to load elections. Please try again later.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchElections();
  }, []);

  // Handle refresh
  const onRefresh = () => {
    fetchElections(true);
  };
  
  // Filter elections by year group if filter is active
  const filteredElections = activeYearFilter === null
    ? elections
    : elections.filter(election => election.year_group === activeYearFilter);
  
  // Year groups for filtering (for lecturers)
  const yearGroups = [1, 2, 3, 4, 5];

  // Navigate to election details
  const viewElection = (election: Election) => {
    router.push(`/election/electionDetail?id=${election.id}`);
  };

  // Create a new election
  const createElection = () => {
    router.push("/election/createElection");
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={{ marginTop: 16 }}>Loading elections...</Text>
      </View>
    );
  }

  return (
    <View style={styles.electionContainer}>
      <Text style={styles.electionHeader}>Student Representative Elections</Text>
      
      {/* Year filter - only for lecturers */}
      {isLecturer && (
        <View style={{
          marginBottom: 10,
          backgroundColor: '#F2F4F8',
          borderRadius: 12,
          paddingVertical: 10,
        }}>
          <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#555' }}>
              <Ionicons name="filter-outline" size={16} color="#555" /> Filter by Year:
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
                activeYearFilter === null && styles.yearFilterChipActive,
              ]}
              onPress={() => setActiveYearFilter(null)}
            >
              <Text style={[
                styles.yearFilterChipText,
                activeYearFilter === null && styles.yearFilterChipTextActive
              ]}>All Years</Text>
            </TouchableOpacity>
            
            {yearGroups.map((year) => (
              <TouchableOpacity
                key={year}
                style={[
                  styles.yearFilterChip,
                  activeYearFilter === year && styles.yearFilterChipActive,
                ]}
                onPress={() => setActiveYearFilter(year)}
              >
                <Text style={[
                  styles.yearFilterChipText,
                  activeYearFilter === year && styles.yearFilterChipTextActive
                ]}>Year {year}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
      
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={{ paddingTop: 0 }}
      >
        {filteredElections.length > 0 ? (
          filteredElections.map((election) => (
            <TouchableOpacity
              key={election.id}
              style={[
                styles.electionCard,
                election.is_expired && election.winner_id ? { 
                  borderLeftWidth: 4, 
                  borderLeftColor: '#4CAF50' 
                } : undefined
              ]}
              onPress={() => viewElection(election)}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={styles.electionTitle}>{election.title}</Text>
                <View style={{ 
                  backgroundColor: '#E3F2FD', 
                  paddingVertical: 4, 
                  paddingHorizontal: 10, 
                  borderRadius: 12
                }}>
                  <Text style={{ color: '#1976D2', fontWeight: '600' }}>
                    Year {election.year_group}
                  </Text>
                </View>
              </View>
              
              <View style={styles.electionDetail}>
                <Ionicons name="calendar-outline" size={16} color="#666" style={{ marginRight: 6 }} />
                <Text>{election.is_expired ? "Ended: " : "Ends: "}{formatDate(election.end_date)}</Text>
              </View>
              
              {/* Show creator info using email parsing */}
              {election.creator_email && (
                <View style={styles.electionDetail}>
                  <Ionicons name="person-outline" size={16} color="#666" style={{ marginRight: 6 }} />
                  <Text>Created by: {getFirstNameFromEmail(election.creator_email)} {getLastNameFromEmail(election.creator_email)}</Text>
                </View>
              )}
              
              <View style={styles.electionMetaContainer}>
                {!election.is_expired ? (
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Ionicons name="people-outline" size={16} color="#666" style={{ marginRight: 4 }} />
                    <Text style={{ color: "#666", fontSize: 13 }}>
                      {election.candidate_count} candidate{election.candidate_count !== 1 ? "s" : ""}
                    </Text>
                  </View>
                ) : (
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Ionicons name="trophy-outline" size={16} color="#4CAF50" style={{ marginRight: 4 }} />
                    <Text style={{ color: "#4CAF50", fontSize: 13, fontWeight: '600' }}>
                      Winner Announced
                    </Text>
                  </View>
                )}
                
                <Text
                  style={[
                    styles.electionStatus,
                    !election.is_expired
                      ? styles.electionStatusOpen
                      : styles.electionStatusClosed,
                  ]}
                >
                  {!election.is_expired ? "OPEN" : "COMPLETED"}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="information-circle-outline" size={40} color="#999" />
            <Text style={{ marginTop: 8, color: "#666", textAlign: "center" }}>
              {activeYearFilter !== null ? 
                `No active election found for Year ${activeYearFilter}.` : 
                "No elections found."}
            </Text>
          </View>
        )}
      </ScrollView>
      
      {/* Create Election FAB - only for lecturers (role === 3) */}
      {isLecturer && (
        <TouchableOpacity
          onPress={createElection}
          style={{
            position: "absolute",
            right: 20,
            bottom: 20,
            backgroundColor: "#007AFF",
            width: 60,
            height: 60,
            borderRadius: 30,
            justifyContent: "center",
            alignItems: "center",
            elevation: 4,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 4,
          }}
        >
          <Ionicons name="add" size={30} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  );
};

export default ElectionsScreen;
