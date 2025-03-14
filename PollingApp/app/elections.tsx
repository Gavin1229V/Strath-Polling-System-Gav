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
import { useAuth, useUserClasses } from "./userDetails";
import { SERVER_IP } from "./config";
import styles from "../styles/styles";

interface Election {
  id: number;
  title: string;
  description: string;
  class_code: string;
  created_at: string;
  end_date: string;
  candidate_count: number;
  creator_first_name?: string;
  creator_last_name?: string;
}

const ElectionsScreen = () => {
  const [elections, setElections] = useState<Election[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState("All");
  
  const { user } = useAuth();
  const userClasses = useUserClasses();
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
  
  // Filter elections by class
  const filteredElections = activeFilter === "All"
    ? elections
    : elections.filter(election => election.class_code === activeFilter);

  // Navigate to election details
  const viewElection = (election: Election) => {
    router.push(`/electionDetail?id=${election.id}`);
  };

  // Create a new election - now only shown to students (role === 0)
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
      
      {/* Filter by class */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScrollView}
      >
        <TouchableOpacity
          style={[
            styles.filterButton,
            activeFilter === "All" && styles.activeFilterButton,
          ]}
          onPress={() => setActiveFilter("All")}
        >
          <Text
            style={[
              styles.filterButtonText,
              activeFilter === "All" && styles.activeFilterText,
            ]}
          >
            All
          </Text>
        </TouchableOpacity>
        
        {userClasses.map((cls) => (
          <TouchableOpacity
            key={cls}
            style={[
              styles.filterButton,
              activeFilter === cls && styles.activeFilterButton,
            ]}
            onPress={() => setActiveFilter(cls)}
          >
            <Text
              style={[
                styles.filterButtonText,
                activeFilter === cls && styles.activeFilterText,
              ]}
            >
              {cls}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        style={{ marginTop: 12 }}
      >
        {filteredElections.length > 0 ? (
          filteredElections.map((election) => (
            <TouchableOpacity
              key={election.id}
              style={styles.electionCard}
              onPress={() => viewElection(election)}
            >
              <Text style={styles.electionTitle}>{election.title}</Text>
              
              <View style={styles.electionDetail}>
                <Ionicons name="school-outline" size={16} color="#666" style={{ marginRight: 6 }} />
                <Text>{election.class_code}</Text>
              </View>
              
              <View style={styles.electionDetail}>
                <Ionicons name="calendar-outline" size={16} color="#666" style={{ marginRight: 6 }} />
                <Text>Ends: {formatDate(election.end_date)}</Text>
              </View>
              
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
              No elections found for your selected filter.
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
