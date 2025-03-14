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
import { useAuth, getFirstNameFromEmail, getLastNameFromEmail } from "./userDetails";
import { SERVER_IP } from "./config";
import styles from "../styles/styles";

interface Election {
  id: number;
  title: string;
  description: string;
  created_at: string;
  end_date: string;
  candidate_count: number;
  creator_email?: string; // Changed to email instead of first_name/last_name
  year_group: number;
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
    router.push(`/electionDetail?id=${election.id}`);
  };

  // Create a new election
  const createElection = () => {
    router.push("/createElection");
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
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScrollView}
        >
          <TouchableOpacity
            style={[
              styles.filterButton, 
              activeYearFilter === null && styles.activeFilterButton,
              { height: 36 } // Add a fixed height to control button size
            ]}
            onPress={() => setActiveYearFilter(null)}
          >
            <Text style={[
              styles.filterButtonText,
              activeYearFilter === null && styles.activeFilterText
            ]}>All</Text>
          </TouchableOpacity>
          
          {yearGroups.map((year) => (
            <TouchableOpacity
              key={year}
              style={[
                styles.filterButton,
                activeYearFilter === year && styles.activeFilterButton,
                { height: 36 } // Add a fixed height to control button size
              ]}
              onPress={() => setActiveYearFilter(year)}
            >
              <Text style={[
                styles.filterButtonText,
                activeYearFilter === year && styles.activeFilterText
              ]}>Year {year}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
      
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredElections.length > 0 ? (
          filteredElections.map((election) => (
            <TouchableOpacity
              key={election.id}
              style={styles.electionCard}
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
                <Text>Ends: {formatDate(election.end_date)}</Text>
              </View>
              
              {/* Show creator info using email parsing */}
              {election.creator_email && (
                <View style={styles.electionDetail}>
                  <Ionicons name="person-outline" size={16} color="#666" style={{ marginRight: 6 }} />
                  <Text>Created by: {getFirstNameFromEmail(election.creator_email)} {getLastNameFromEmail(election.creator_email)}</Text>
                </View>
              )}
              
              <View style={styles.electionMetaContainer}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Ionicons name="people-outline" size={16} color="#666" style={{ marginRight: 4 }} />
                  <Text style={{ color: "#666", fontSize: 13 }}>
                    {election.candidate_count} candidate{election.candidate_count !== 1 ? "s" : ""}
                  </Text>
                </View>
                
                <Text
                  style={[
                    styles.electionStatus,
                    isElectionOpen(election.end_date)
                      ? styles.electionStatusOpen
                      : styles.electionStatusClosed,
                  ]}
                >
                  {isElectionOpen(election.end_date) ? "OPEN" : "CLOSED"}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="information-circle-outline" size={40} color="#999" />
            <Text style={{ marginTop: 8, color: "#666", textAlign: "center" }}>
              {activeYearFilter !== null ? 
                `No elections found for Year ${activeYearFilter}.` : 
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
