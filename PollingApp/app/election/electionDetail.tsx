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
import { useAuth, getFirstNameFromEmail, getLastNameFromEmail } from "../userDetails";
import { SERVER_IP } from "../config";
import styles from "../../styles/styles";

interface Candidate {
  id: number;
  user_id: number;
  statement: string;
  applied_at: string;
  email: string;  // Changed from first_name/last_name to email
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
  winner?: Candidate;
  is_expired?: boolean;
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
  
  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };
  
  // Check if current user can apply (based only on year group match)
  const canApplyAsCandidate = () => {
    return (
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
  
  // Fetch user's voting status immediately when user data is available
  useEffect(() => {
    if (user && id) {
      checkUserVoteStatus();
    }
  }, [user, id]);
  
  // Separate function to check if user has already voted
  const checkUserVoteStatus = async () => {
    if (!user) return;
    
    try {
      const voteResponse = await fetch(
        `${SERVER_IP}/api/elections/${id}/hasVoted?userId=${user.user_id}`, {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        }
      );
      
      if (voteResponse.ok) {
        const voteData = await voteResponse.json();
        if (voteData.hasVoted) {
          console.log("User has already voted for candidate:", voteData.candidateId);
          setVotedFor(voteData.candidateId);
        } else {
          console.log("User has not voted yet");
        }
      } else {
        console.error("Failed to check vote status:", await voteResponse.text());
      }
    } catch (error) {
      console.error("Error checking vote status:", error);
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
    } catch (error) {
      console.error("Error fetching election details:", error);
      Alert.alert("Error", "Failed to load election details. Please try again later.");
    } finally {
      setLoading(false);
    }
  };
  
  // Initial data fetch - now we don't check vote status here since it's in its own effect
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
          userId: user.user_id
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to vote");
      }
      
      setVotedFor(candidateId); // This now correctly marks that the user has voted
      // No need to call fetchElectionDetails here, just update the vote count locally
      Alert.alert("Success", "Your vote has been recorded.");
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to record your vote. Please try again.");
    }
  };
  
  // Apply as a candidate - no longer checks for student roles
  const applyAsCandidate = async () => {
    if (!user) {
      Alert.alert("Error", "You must be logged in to apply.");
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
          userId: user.user_id
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
  
  // Helper function to get display name from candidate
  const getCandidateName = (candidate: Candidate) => {
    if (candidate.email) {
      const firstName = getFirstNameFromEmail(candidate.email);
      const lastName = getLastNameFromEmail(candidate.email);
      return `${firstName} ${lastName}`;
    } else {
      return "Unknown Candidate";
    }
  };
  
  // Get candidate initials for avatar
  const getCandidateInitials = (candidate: Candidate) => {
    if (candidate.email) {
      const firstName = getFirstNameFromEmail(candidate.email);
      const lastName = getLastNameFromEmail(candidate.email);
      return `${firstName[0]}${lastName[0]}`;
    } else {
      return "UC";
    }
  };

  // Check if election is expired
  const isElectionExpired = (election: ElectionDetail) => {
    return new Date(election.end_date) < new Date();
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
            <Ionicons name="school-outline" size={18} color="#555" style={{ marginRight: 8 }} />
            <Text style={{fontSize: 15, color: "#444"}}>{election.class_code} (Year {election.year_group})</Text>
          </View>
          
          <View style={styles.electionDetail}>
            <Ionicons name="calendar-outline" size={18} color="#555" style={{ marginRight: 8 }} />
            <Text style={{fontSize: 15, color: "#444"}}>
              {isElectionExpired(election) ? "Ended: " : "Ends: "}{formatDate(election.end_date)}
            </Text>
          </View>
          
          {election.description && (
            <View style={{ marginTop: 14, marginBottom: 4 }}>
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
            
            {isElectionExpired(election) && (
              <View style={{
                backgroundColor: '#4CAF50',
                paddingVertical: 4,
                paddingHorizontal: 8,
                borderRadius: 4
              }}>
                <Text style={{ color: '#fff', fontWeight: '600', fontSize: 12 }}>COMPLETED</Text>
              </View>
            )}
          </View>
        </View>
        
        <View style={{ marginTop: 16 }}>
          {isElectionExpired(election) ? (
            // Show winner section for expired elections
            <>
              <Text style={[styles.electionHeader, {marginBottom: 14, fontSize: 20}]}>Election Winner</Text>
              
              {election.candidates.length > 0 ? (
                <View key={election.candidates[0].id} style={[styles.candidateCard, {backgroundColor: '#E8F5E9', borderColor: '#81C784'}]}>
                  {election.candidates[0].profile_picture ? (
                    <Image
                      source={{ uri: election.candidates[0].profile_picture }}
                      style={[styles.candidateAvatar, { borderColor: '#43A047' }]}
                    />
                  ) : (
                    <View style={[styles.candidateAvatar, { backgroundColor: '#C8E6C9', justifyContent: 'center', alignItems: 'center', borderColor: '#43A047' }]}>
                      <Text style={{ fontWeight: 'bold', fontSize: 18, color: '#2E7D32' }}>
                        {getCandidateInitials(election.candidates[0])}
                      </Text>
                    </View>
                  )}
                  
                  <View style={styles.candidateInfo}>
                    <View style={{flexDirection: 'row', alignItems: 'center'}}>
                      <Text style={[styles.candidateName, {color: '#2E7D32'}]}>
                        {getCandidateName(election.candidates[0])}
                      </Text>
                      <View style={{
                        backgroundColor: '#4CAF50',
                        paddingVertical: 2,
                        paddingHorizontal: 6,
                        borderRadius: 12,
                        marginLeft: 8
                      }}>
                        <Text style={{ color: '#fff', fontWeight: '600', fontSize: 10 }}>WINNER</Text>
                      </View>
                    </View>
                    
                    <Text style={styles.candidateStatement}>{election.candidates[0].statement}</Text>
                    
                    <Text style={[styles.candidateVoteCount, {color: '#2E7D32', fontWeight: '600'}]}>
                      {election.candidates[0].vote_count} vote{election.candidates[0].vote_count !== 1 ? "s" : ""}
                    </Text>
                  </View>
                </View>
              ) : (
                <Text style={{ textAlign: "center", color: "#666", padding: 20 }}>
                  No candidates participated in this election.
                </Text>
              )}
            </>
          ) : (
            // Show all candidates for active elections
            <>
              <Text style={[styles.electionHeader, {marginBottom: 14, fontSize: 20}]}>Candidates</Text>
              
              {election.candidates.length > 0 ? (
                election.candidates.map((candidate) => (
                  // Existing candidate display code
                  <View key={candidate.id} style={styles.candidateCard}>
                    {/* ... existing candidate display code ... */}
                    {candidate.profile_picture ? (
                      <Image
                        source={{ uri: candidate.profile_picture }}
                        style={styles.candidateAvatar}
                      />
                    ) : (
                      <View style={[styles.candidateAvatar, { backgroundColor: '#E3F2FD', justifyContent: 'center', alignItems: 'center' }]}>
                        <Text style={{ fontWeight: 'bold', fontSize: 18, color: '#1976D2' }}>
                          {getCandidateInitials(candidate)}
                        </Text>
                      </View>
                    )}
                    
                    <View style={styles.candidateInfo}>
                      <Text style={styles.candidateName}>
                        {getCandidateName(candidate)}
                      </Text>
                      
                      <Text style={styles.candidateStatement}>{candidate.statement}</Text>
                      
                      <Text style={styles.candidateVoteCount}>
                        {candidate.vote_count} vote{candidate.vote_count !== 1 ? "s" : ""}
                      </Text>
                    </View>
                    
                    {/* Show vote button only if user hasn't voted for anyone yet */}
                    {votedFor === null && (
                      <TouchableOpacity
                        style={styles.voteButton}
                        onPress={() => voteForCandidate(candidate.id)}
                      >
                        <Text style={styles.voteButtonText}>Vote</Text>
                      </TouchableOpacity>
                    )}
                    
                    {/* Show voted badge only for the candidate the user voted for */}
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
            </>
          )}
        </View>
        
        {/* Apply as candidate button - only shown for active elections */}
        {!isElectionExpired(election) && !hasApplied && (
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
        
        {/* If the user has already applied, show a message - only for active elections */}
        {!isElectionExpired(election) && hasApplied && (
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
      </ScrollView>
    </View>
  );
};

export default ElectionDetailScreen;
