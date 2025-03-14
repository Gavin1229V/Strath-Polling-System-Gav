import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAuth } from "./userDetails";
import { SERVER_IP } from "./config";
import styles from "../styles/styles";

interface Candidate {
  id: number;
  user_id: number;
  statement: string;
  applied_at: string;
  first_name: string;
  last_name: string;
  profile_picture: string | null;
  vote_count: number;
  year_group?: number;
}

interface ElectionDetail {
  id: number;
  title: string;
  description: string;
  class_code: string;
  created_by: number;
  created_at: string;
  end_date: string;
  year_group: number;
  candidates: Candidate[];
}

const ElectionDetailScreen = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [election, setElection] = useState<ElectionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [votedFor, setVotedFor] = useState<number | null>(null);
  const [showApplyForm, setShowApplyForm] = useState(false);
  const [candidateStatement, setCandidateStatement] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);
  const [userYearGroup, setUserYearGroup] = useState<number | null>(null);
  
  const { user } = useAuth();
  const router = useRouter();
  
  // Check if user is a student (role === 1)
  const isStudent = user && user.role === 1;
  
  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };
  
  // Check if election is still open
  const isElectionOpen = () => {
    return election && new Date(election.end_date) > new Date();
  };

  // Check if current user can apply (based on year group and being a student with role 1)
  const canApplyAsCandidate = () => {
    return (
      isStudent &&
      isElectionOpen() &&
      !hasApplied &&
      userYearGroup !== null &&
      election?.year_group === userYearGroup
    );
  };
  
  // Fetch user's year group
  const fetchUserYearGroup = async () => {
    if (!user) return;
    
    try {
      const response = await fetch(`${SERVER_IP}/api/elections/user/yearGroup`, {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setUserYearGroup(data.yearGroup);
      }
    } catch (error) {
      console.error("Error fetching user year group:", error);
    }
  };
  
  // Fetch election details
  const fetchElectionDetails = async () => {
    setLoading(true);
    
    try {
      const response = await fetch(`${SERVER_IP}/api/elections/${id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch election details");
      }
      const data = await response.json();
      setElection(data);
      
      // Check if user has already applied as a candidate
      if (user && data.candidates) {
        const userCandidate: Candidate | undefined = data.candidates.find((c: Candidate) => c.user_id === user.user_id);
        setHasApplied(Boolean(userCandidate));
      }
      
      // Check if user has voted
      if (user) {
        try {
          const voteResponse = await fetch(
            `${SERVER_IP}/api/elections/${id}/hasVoted`, {
              headers: {
                Authorization: `Bearer ${user.token}`,
              },
            }
          );
          
          if (voteResponse.ok) {
            const voteData = await voteResponse.json();
            if (voteData.hasVoted) {
              setVotedFor(voteData.candidateId);
            }
          }
        } catch (error) {
          console.error("Error checking vote status:", error);
        }
      }
    } catch (error) {
      console.error("Error fetching election details:", error);
      Alert.alert("Error", "Failed to load election details. Please try again later.");
    } finally {
      setLoading(false);
    }
  };
  
  // Initial data fetch
  useEffect(() => {
    if (id) {
      fetchElectionDetails();
      fetchUserYearGroup();
    }
  }, [id]);
  
  // Vote for a candidate
  const voteForCandidate = async (candidateId: number) => {
    if (!user) {
      Alert.alert("Error", "You must be logged in to vote.");
      return;
    }
    
    if (votedFor !== null) {
      Alert.alert("Error", "You have already voted in this election.");
      return;
    }
    
    try {
      const response = await fetch(`${SERVER_IP}/api/elections/${id}/votes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          candidateId,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to vote");
      }
      
      setVotedFor(candidateId);
      fetchElectionDetails(); // Refresh data
      Alert.alert("Success", "Your vote has been recorded.");
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to record your vote. Please try again.");
    }
  };
  
  // Apply as a candidate - only for students (role === 1)
  const applyAsCandidate = async () => {
    if (!user) {
      Alert.alert("Error", "You must be logged in to apply.");
      return;
    }
    
    if (!isStudent) {
      Alert.alert("Error", "Only students can apply as candidates.");
      return;
    }
    
    if (!candidateStatement.trim()) {
      Alert.alert("Error", "Please provide a statement for your candidacy.");
      return;
    }

    if (!canApplyAsCandidate()) {
      Alert.alert("Error", `You can only apply as a candidate for your own year (Year ${userYearGroup})`);
      return;
    }
    
    setSubmitting(true);
    
    try {
      const response = await fetch(`${SERVER_IP}/api/elections/${id}/candidates`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          statement: candidateStatement,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to apply as candidate");
      }
      
      setCandidateStatement("");
      setShowApplyForm(false);
      setHasApplied(true);
      fetchElectionDetails(); // Refresh data
      Alert.alert("Success", "Your application has been submitted successfully.");
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to submit your application. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };
  
  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={{ marginTop: 16 }}>Loading election details...</Text>
      </View>
    );
  }
  
  if (!election) {
    return (
      <View style={styles.container}>
        <Text>Election not found or has been removed.</Text>
      </View>
    );
  }
  
  return (
    <View style={styles.electionContainer}>
      <ScrollView>
        <View style={styles.electionCard}>
          <Text style={styles.electionTitle}>{election.title}</Text>
          
          <View style={styles.electionDetail}>
            <Ionicons name="school-outline" size={16} color="#666" style={{ marginRight: 6 }} />
            <Text>{election.class_code} (Year {election.year_group})</Text>
          </View>
          
          <View style={styles.electionDetail}>
            <Ionicons name="calendar-outline" size={16} color="#666" style={{ marginRight: 6 }} />
            <Text>Ends: {formatDate(election.end_date)}</Text>
          </View>
          
          {election.description && (
            <View style={{ marginTop: 12 }}>
              <Text style={styles.electionDescription}>{election.description}</Text>
            </View>
          )}
          
          <View style={styles.electionMetaContainer}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Ionicons name="people-outline" size={16} color="#666" style={{ marginRight: 4 }} />
              <Text style={{ color: "#666", fontSize: 13 }}>
                {election.candidates.length} candidate{election.candidates.length !== 1 ? "s" : ""}
              </Text>
            </View>
            
            <Text
              style={[
                styles.electionStatus,
                isElectionOpen()
                  ? styles.electionStatusOpen
                  : styles.electionStatusClosed,
              ]}
            >
              {isElectionOpen() ? "OPEN" : "CLOSED"}
            </Text>
          </View>
        </View>
        
        <View style={{ marginTop: 16 }}>
          <Text style={styles.electionHeader}>Candidates</Text>
          
          {election.candidates.length > 0 ? (
            election.candidates.map((candidate) => (
              <View key={candidate.id} style={styles.candidateCard}>
                {candidate.profile_picture ? (
                  <Image
                    source={{ uri: candidate.profile_picture }}
                    style={styles.candidateAvatar}
                  />
                ) : (
                  <View style={[styles.candidateAvatar, { backgroundColor: '#e0e0e0', justifyContent: 'center', alignItems: 'center' }]}>
                    <Text style={{ fontWeight: 'bold', fontSize: 16, color: '#555' }}>
                      {candidate.first_name?.[0]}{candidate.last_name?.[0]}
                    </Text>
                  </View>
                )}
                
                <View style={styles.candidateInfo}>
                  <Text style={styles.candidateName}>
                    {candidate.first_name} {candidate.last_name}
                  </Text>
                  
                  <Text style={styles.candidateStatement}>{candidate.statement}</Text>
                  
                  <Text style={styles.candidateVoteCount}>
                    {candidate.vote_count} vote{candidate.vote_count !== 1 ? "s" : ""}
                  </Text>
                </View>
                
                {isElectionOpen() && isStudent && votedFor === null && (
                  <TouchableOpacity
                    style={styles.voteButton}
                    onPress={() => voteForCandidate(candidate.id)}
                  >
                    <Text style={styles.voteButtonText}>Vote</Text>
                  </TouchableOpacity>
                )}
                
                {votedFor === candidate.id && (
                  <View style={styles.votedBadge}>
                    <Text style={styles.votedText}>Voted</Text>
                  </View>
                )}
              </View>
            ))
          ) : (
            <Text style={{ textAlign: "center", color: "#666", padding: 20 }}>
              No candidates yet. Be the first to apply!
            </Text>
          )}
        </View>
        
        {/* Apply as candidate button */}
        {isStudent && isElectionOpen() && !hasApplied && (
          <View style={{ marginTop: 20, marginBottom: 40 }}>
            {!showApplyForm ? (
              <TouchableOpacity
                style={[
                  styles.formSubmitButton,
                  !canApplyAsCandidate() && { backgroundColor: "#ccc" } // Disabled style
                ]}
                onPress={() => {
                  if (canApplyAsCandidate()) {
                    setShowApplyForm(true);
                  } else {
                    Alert.alert(
                      "Cannot Apply",
                      `This election is for Year ${election.year_group} students only. Your year group is ${userYearGroup || "unknown"}.`
                    );
                  }
                }}
              >
                <Text style={styles.formSubmitText}>Apply as a Candidate</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.electionForm}>
                <Text style={{ fontSize: 18, fontWeight: "600", marginBottom: 16 }}>
                  Apply as a Candidate
                </Text>
                
                <Text style={styles.formLabel}>
                  Candidate Statement <Text style={{ color: "#e53935" }}>*</Text>
                </Text>
                <TextInput
                  style={[styles.formField, styles.formTextArea]}
                  placeholder="Write a brief statement explaining why you'd be a good representative..."
                  multiline
                  numberOfLines={5}
                  value={candidateStatement}
                  onChangeText={setCandidateStatement}
                  editable={!submitting}
                />
                
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <TouchableOpacity
                    style={{
                      backgroundColor: "#f5f5f5",
                      padding: 12,
                      borderRadius: 8,
                      width: "48%",
                      alignItems: "center",
                    }}
                    onPress={() => setShowApplyForm(false)}
                    disabled={submitting}
                  >
                    <Text style={{ color: "#666", fontWeight: "600" }}>Cancel</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      styles.formSubmitButton,
                      { width: "48%" },
                      submitting && { opacity: 0.7 },
                    ]}
                    onPress={applyAsCandidate}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.formSubmitText}>Submit</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        )}
        
        {/* If the user has already applied, show a message */}
        {isStudent && isElectionOpen() && hasApplied && (
          <View style={{ 
            backgroundColor: "#e8f5e9",
            padding: 16,
            borderRadius: 8,
            marginTop: 20,
            marginBottom: 40,
            alignItems: "center"
          }}>
            <Ionicons name="checkmark-circle-outline" size={32} color="#2e7d32" />
            <Text style={{ color: "#2e7d32", fontWeight: "600", marginTop: 8 }}>
              You have already applied as a candidate
            </Text>
          </View>
        )}
        
        {/* If election is closed, show a message */}
        {!isElectionOpen() && (
          <View style={{ 
            backgroundColor: "#ffebee",
            padding: 16,
            borderRadius: 8,
            marginTop: 20,
            marginBottom: 40,
            alignItems: "center"
          }}>
            <Ionicons name="time-outline" size={32} color="#c62828" />
            <Text style={{ color: "#c62828", fontWeight: "600", marginTop: 8 }}>
              This election is now closed
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

export default ElectionDetailScreen;
