import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  Platform,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Pressable,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from '@react-native-picker/picker';
import { fetchPolls, getSocket } from "./global";
import { SERVER_IP } from "./config";
import { useFirstName, useLastName, useAuth, useUserClasses } from "./userDetails";
import { Poll } from "./global";
import styles from "../styles/styles"; // Use global styles
import { Ionicons } from '@expo/vector-icons';

////////////////////////////////////////////////////////////////////////////////
// Compute default expiry value (one day ahead)
////////////////////////////////////////////////////////////////////////////////
const getDefaultExpiry = () => {
  const defaultExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const year = defaultExpiry.getFullYear();
  const month = ("0" + (defaultExpiry.getMonth() + 1)).slice(-2);
  const day = ("0" + defaultExpiry.getDate()).slice(-2);
  const hours = ("0" + defaultExpiry.getHours()).slice(-2);
  const minutes = ("0" + defaultExpiry.getMinutes()).slice(-2);
  return { date: `${year}-${month}-${day}`, time: `${hours}:${minutes}` };
};

const defaultExpiry = getDefaultExpiry();

// Additional local styles for the enhanced UI
const localStyles = StyleSheet.create({
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  inputContainer: {
    marginBottom: 16,
    position: 'relative', // Add position relative to contain absolute positioned dropdown
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
    color: '#555',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    backgroundColor: '#fafafa',
  },
  inputFocused: {
    borderColor: '#4287f5',
    backgroundColor: '#f0f7ff',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  optionInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    marginRight: 10,
    backgroundColor: '#fafafa',
  },
  iconButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f2f2f2',
  },
  // Update or remove the primaryButton style to use the global blueButton
  primaryButton: {
    // Use the global blue button style with additional properties
    backgroundColor: '#094183', // Match navbar color
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginTop: 5,
  },
  secondaryButton: {
    backgroundColor: '#e7f0fd',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  secondaryButtonText: {
    color: '#4287f5',
    fontWeight: '500',
    fontSize: 15,
    marginLeft: 6,
  },
  pickerButton: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fafafa',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickerModal: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  pickerContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    maxHeight: '80%',
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  pickerHeaderTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  pickerOptions: {
    paddingBottom: Platform.OS === 'ios' ? 40 : 0,
  },
  pickerItem: {
    color: '#333', // Add explicit color for picker items
    fontSize: 16,
    padding: 10, // Add padding to increase height
    marginVertical: 4, // Add vertical margin
    height: Platform.OS === 'android' ? 50 : undefined, // Increase height on Android
  },
  dateTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dateTimeButton: {
    flex: 1,
    padding: 12,
    backgroundColor: '#f8f8f8',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 4,
  },
  dateTimeText: {
    fontSize: 15,
    color: '#333',
  },
  requiredIndicator: {
    color: '#e53935',
    marginLeft: 4,
  },
  validationError: {
    color: '#e53935',
    fontSize: 12,
    marginTop: 4,
  }
});

////////////////////////////////////////////////////////////////////////////////
// Main component
////////////////////////////////////////////////////////////////////////////////
const PollScreen = () => {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [newPoll, setNewPoll] = useState({
    question: "",
    options: ["", ""],
    pollClass: "",
    expiryDate: defaultExpiry.date,
    expiryTime: defaultExpiry.time,
  });
  const [voteStatus, setVoteStatus] = useState("");
  const [showClassPicker, setShowClassPicker] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [validation, setValidation] = useState({
    question: true,
    options: [true, true],
    pollClass: true,
  });
  
  // Input focus states for enhanced styling
  const [focusedField, setFocusedField] = useState("");

  // Auth / user details
  const { user } = useAuth();
  const [dbClasses, setDbClasses] = useState<string>("");
  const userClassesFromContext = useUserClasses();

  // Classes list
  const classesList = dbClasses
    ? dbClasses
        .split(",")
        .map((cls) => cls.trim())
        .filter(Boolean)
    : userClassesFromContext;

  const firstName = useFirstName();
  const lastName = useLastName();
  const author = `${firstName} ${lastName}`.trim();

  // For native date/time pickers
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Load polls initially
  useEffect(() => {
    fetchPolls(setPolls);
  }, []);

  // Fetch account details for classes
  useEffect(() => {
    if (user) {
      fetch(`${SERVER_IP}/accountDetails?userId=${user.user_id}`)
        .then((res) => res.json())
        .then((details) => {
          if (details && details.length > 0) {
            const account = details[0];
            setDbClasses(account.classes || "");
          }
        })
        .catch((err) => console.error("Error fetching account details:", err));
    }
  }, [user]);

  // Validate poll inputs
  const validatePoll = () => {
    // Validate question
    const isQuestionValid = newPoll.question.trim().length > 0;
    
    // Validate options
    const optionsValidation = newPoll.options.map(opt => opt.trim().length > 0);
    const validOptions = newPoll.options.filter(opt => opt.trim().length > 0);
    
    // Validate class
    const isClassValid = newPoll.pollClass.trim().length > 0;

    // Update validation state
    setValidation({
      question: isQuestionValid,
      options: optionsValidation,
      pollClass: isClassValid,
    });

    return isQuestionValid && validOptions.length >= 2 && isClassValid;
  };

  // Create a new poll
  const createPoll = async () => {
    if (!validatePoll()) {
      return;
    }
    
    setIsCreating(true);
    
    const filteredOptions = newPoll.options.filter(option => option.trim() !== "");
    
    try {
      const socket = getSocket();
      const response = await fetch(`${SERVER_IP}/api/polls`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: user ? `Bearer ${user.token}` : "",
        },
        body: JSON.stringify({
          question: newPoll.question,
          options: filteredOptions,
          created_by: author,
          created_by_id: user?.user_id,
          class: newPoll.pollClass,
          expiry: `${newPoll.expiryDate} ${newPoll.expiryTime}:00`,
          global: false,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Error creating poll: ${response.statusText}`);
      }
      
      // Reset form with default expiry values
      setNewPoll({
        question: "",
        options: ["", ""],
        pollClass: "",
        expiryDate: defaultExpiry.date,
        expiryTime: defaultExpiry.time,
      });
      
      // Show success message
      setVoteStatus("Poll created successfully!");
      
      // Clear success message after 3 seconds
      setTimeout(() => setVoteStatus(""), 3000);
      
      // Refresh polls list
      await fetchPolls(setPolls, true);
      
      // Emit event to notify other clients
      socket.emit('poll_created');
      
    } catch (err) {
      console.error("Error creating poll:", err);
      setVoteStatus("Failed to create poll. Please try again.");
      
      // Clear error message after 3 seconds
      setTimeout(() => setVoteStatus(""), 3000);
    } finally {
      setIsCreating(false);
    }
  };

  // Remove an option
  const removeOption = (index: number) => {
    const options = [...newPoll.options];
    options.splice(index, 1);
    
    // Update validation state
    const optionsValidation = [...validation.options];
    optionsValidation.splice(index, 1);
    setValidation({ ...validation, options: optionsValidation });
    
    setNewPoll({ ...newPoll, options });
  };

  // Add a new option
  const addOption = () => {
    setNewPoll({ ...newPoll, options: [...newPoll.options, ""] });
    setValidation({ ...validation, options: [...validation.options, true] });
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    if (!dateString) return "Select date";
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString();
    } catch (e) {
      return dateString;
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#f5f5f7' }}>
      <View style={{ padding: 16, paddingBottom: 60 }}>
        <Text style={{ fontSize: 24, fontWeight: '700', marginBottom: 16, marginTop: 8, color: '#333' }}>
          Create a New Poll
        </Text>
        
        {/* Poll Question Section */}
        <View style={localStyles.formCard}>
          <Text style={localStyles.sectionTitle}>Question <Text style={localStyles.requiredIndicator}>*</Text></Text>
          <View style={localStyles.inputContainer}>
            <TextInput
              style={[
                localStyles.input, 
                focusedField === 'question' && localStyles.inputFocused,
                !validation.question && { borderColor: '#e53935' }
              ]}
              placeholder="Enter your poll question here"
              placeholderTextColor="#999"
              value={newPoll.question}
              onChangeText={(text) => {
                setNewPoll({ ...newPoll, question: text });
                if (!validation.question && text.trim()) {
                  setValidation({ ...validation, question: true });
                }
              }}
              onFocus={() => setFocusedField('question')}
              onBlur={() => setFocusedField('')}
            />
            {!validation.question && (
              <Text style={localStyles.validationError}>Question is required</Text>
            )}
          </View>
        </View>
        
        {/* Poll Options Section */}
        <View style={localStyles.formCard}>
          <Text style={localStyles.sectionTitle}>Options <Text style={localStyles.requiredIndicator}>*</Text></Text>
          <Text style={{ color: '#666', marginBottom: 12, fontSize: 13 }}>
            Add at least two options for your poll (maximum 5)
          </Text>
          
          {newPoll.options.map((option, index) => (
            <View key={index} style={localStyles.optionRow}>
              <TextInput
                style={[
                  localStyles.optionInput,
                  focusedField === `option-${index}` && localStyles.inputFocused,
                  !validation.options[index] && { borderColor: '#e53935' }
                ]}
                placeholder={`Option ${index + 1}`}
                placeholderTextColor="#999"
                value={option}
                onChangeText={(text) => {
                  const options = [...newPoll.options];
                  options[index] = text;
                  setNewPoll({ ...newPoll, options });
                  
                  if (!validation.options[index] && text.trim()) {
                    const newOptionsValidation = [...validation.options];
                    newOptionsValidation[index] = true;
                    setValidation({ ...validation, options: newOptionsValidation });
                  }
                }}
                onFocus={() => setFocusedField(`option-${index}`)}
                onBlur={() => setFocusedField('')}
              />
              {newPoll.options.length > 2 && (
                <TouchableOpacity
                  style={localStyles.iconButton}
                  onPress={() => removeOption(index)}
                >
                  <Ionicons name="trash-outline" size={20} color="#f44336" />
                </TouchableOpacity>
              )}
            </View>
          ))}
          
          {newPoll.options.length < 5 && (
            <TouchableOpacity
              style={localStyles.secondaryButton}
              onPress={addOption}
            >
              <Ionicons name="add-circle-outline" size={18} color="#4287f5" />
              <Text style={localStyles.secondaryButtonText}>Add Option</Text>
            </TouchableOpacity>
          )}
          
          {newPoll.options.filter(opt => opt.trim()).length < 2 && (
            <Text style={localStyles.validationError}>At least two non-empty options are required</Text>
          )}
        </View>
        
        {/* Class Selection */}
        <View style={localStyles.formCard}>
          <Text style={localStyles.sectionTitle}>Class <Text style={localStyles.requiredIndicator}>*</Text></Text>
          <View style={localStyles.inputContainer}>
            <TouchableOpacity
              style={[
                localStyles.pickerButton,
                !validation.pollClass && { borderColor: '#e53935' }
              ]}
              onPress={() => setShowClassPicker(true)}
            >
              <Text style={{ color: newPoll.pollClass ? '#333' : '#999' }}>
                {newPoll.pollClass || "Select a class"}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#666" />
            </TouchableOpacity>
            
            {!validation.pollClass && (
              <Text style={localStyles.validationError}>Class selection is required</Text>
            )}
          </View>
          
          {/* Class Picker Modal */}
          <Modal
            visible={showClassPicker}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setShowClassPicker(false)}
          >
            <View style={localStyles.pickerModal}>
              <View style={localStyles.pickerContainer}>
                <View style={localStyles.pickerHeader}>
                  <Text style={localStyles.pickerHeaderTitle}>Select Class</Text>
                  <TouchableOpacity onPress={() => setShowClassPicker(false)}>
                    <Ionicons name="close" size={24} color="#666" />
                  </TouchableOpacity>
                </View>
                
                {classesList.length > 0 ? (
                  <View style={localStyles.pickerOptions}>
                    <Picker
                      selectedValue={newPoll.pollClass}
                      onValueChange={(itemValue) => {
                        setNewPoll({ ...newPoll, pollClass: itemValue });
                        setValidation({ ...validation, pollClass: true });
                        if (Platform.OS !== 'ios') {
                          setShowClassPicker(false);
                        }
                      }}
                      style={{ 
                        color: '#333',
                        height: Platform.OS === 'android' ? 48 * classesList.length : undefined,
                      }}
                      itemStyle={{ 
                        color: '#333', 
                        fontSize: 16, 
                        height: Platform.OS === 'ios' ? 120 : undefined, // Taller items on iOS
                        lineHeight: Platform.OS === 'ios' ? 36 : undefined 
                      }}
                    >
                      <Picker.Item 
                        label="- Select a class -" 
                        value="" 
                        color="#999"
                        style={Platform.OS === 'android' ? localStyles.pickerItem : undefined} 
                      />
                      {classesList.map((cls, index) => (
                        <Picker.Item 
                          key={index} 
                          label={cls} 
                          value={cls} 
                          color="#333" // Explicit color for all items
                          style={Platform.OS === 'android' ? localStyles.pickerItem : undefined}
                        />
                      ))}
                    </Picker>
                  </View>
                ) : (
                  <View style={{ padding: 20, alignItems: 'center' }}>
                    <Text style={{ color: '#666', fontStyle: 'italic' }}>No classes available</Text>
                  </View>
                )}
                
                {Platform.OS === 'ios' && (
                  <TouchableOpacity
                    style={[styles.blueButton, { margin: 16 }]}
                    onPress={() => setShowClassPicker(false)}
                  >
                    <Text style={styles.blueButtonText}>Done</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </Modal>
        </View>
        
        {/* Expiry Settings */}
        <View style={localStyles.formCard}>
          <Text style={localStyles.sectionTitle}>Poll Expiry</Text>
          
          {Platform.OS === "web" ? (
            // Web implementation
            <View style={localStyles.dateTimeRow}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={localStyles.inputLabel}>Date</Text>
                <input
                  type="date"
                  value={newPoll.expiryDate}
                  onChange={(e) => setNewPoll({ ...newPoll, expiryDate: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid #e0e0e0',
                    backgroundColor: '#fafafa',
                  }}
                />
              </View>
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={localStyles.inputLabel}>Time</Text>
                <input
                  type="time"
                  value={newPoll.expiryTime}
                  onChange={(e) => setNewPoll({ ...newPoll, expiryTime: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid #e0e0e0',
                    backgroundColor: '#fafafa',
                  }}
                />
              </View>
            </View>
          ) : Platform.OS === "ios" ? (
            // iOS implementation
            <View style={localStyles.dateTimeRow}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={localStyles.inputLabel}>Date</Text>
                <DateTimePicker
                  mode="date"
                  display="default"
                  value={
                    newPoll.expiryDate
                      ? new Date(newPoll.expiryDate)
                      : new Date(Date.now() + 24 * 60 * 60 * 1000)
                  }
                  onChange={(event, selectedDate) => {
                    if (selectedDate) {
                      const year = selectedDate.getFullYear();
                      const month = ("0" + (selectedDate.getMonth() + 1)).slice(-2);
                      const day = ("0" + selectedDate.getDate()).slice(-2);
                      setNewPoll((prev) => ({
                        ...prev,
                        expiryDate: `${year}-${month}-${day}`,
                      }));
                    }
                  }}
                  style={{ width: '100%' }}
                />
              </View>
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={localStyles.inputLabel}>Time</Text>
                <DateTimePicker
                  mode="time"
                  display="default"
                  is24Hour={true}
                  value={
                    newPoll.expiryTime
                      ? new Date(`1970-01-01T${newPoll.expiryTime}:00`)
                      : new Date()
                  }
                  onChange={(event, selectedTime) => {
                    if (selectedTime) {
                      const hours = ("0" + selectedTime.getHours()).slice(-2);
                      const minutes = ("0" + selectedTime.getMinutes()).slice(-2);
                      setNewPoll((prev) => ({
                        ...prev,
                        expiryTime: `${hours}:${minutes}`,
                      }));
                    }
                  }}
                  style={{ width: '100%' }}
                />
              </View>
            </View>
          ) : (
            // Android implementation
            <View>
              <View style={localStyles.dateTimeRow}>
                <TouchableOpacity
                  style={[localStyles.dateTimeButton, { marginRight: 8 }]}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text style={localStyles.dateTimeText}>
                    {formatDate(newPoll.expiryDate)}
                  </Text>
                  <Ionicons name="calendar-outline" size={18} color="#666" />
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[localStyles.dateTimeButton, { marginLeft: 8 }]}
                  onPress={() => setShowTimePicker(true)}
                >
                  <Text style={localStyles.dateTimeText}>
                    {newPoll.expiryTime || "Select time"}
                  </Text>
                  <Ionicons name="time-outline" size={18} color="#666" />
                </TouchableOpacity>
              </View>
              
              {showDatePicker && (
                <View style={{ marginTop: 16 }}>
                  <DateTimePicker
                    mode="date"
                    display="spinner"
                    value={
                      newPoll.expiryDate
                        ? new Date(newPoll.expiryDate)
                        : new Date(Date.now() + 24 * 60 * 60 * 1000)
                    }
                    onChange={(event, selectedDate) => {
                      if (selectedDate) {
                        const year = selectedDate.getFullYear();
                        const month = ("0" + (selectedDate.getMonth() + 1)).slice(-2);
                        const day = ("0" + selectedDate.getDate()).slice(-2);
                        setNewPoll((prev) => ({
                          ...prev,
                          expiryDate: `${year}-${month}-${day}`,
                        }));
                      }
                    }}
                  />
                  <TouchableOpacity
                    style={styles.blueButton} // Use global blue button style
                    onPress={() => setShowDatePicker(false)}
                  >
                    <Text style={styles.blueButtonText}>Done</Text>
                  </TouchableOpacity>
                </View>
              )}
              
              {showTimePicker && (
                <View style={{ marginTop: 16 }}>
                  <DateTimePicker
                    mode="time"
                    display="spinner"
                    is24Hour={true}
                    value={
                      newPoll.expiryTime
                        ? new Date(`1970-01-01T${newPoll.expiryTime}:00`)
                        : new Date()
                    }
                    onChange={(event, selectedTime) => {
                      if (selectedTime) {
                        const hours = ("0" + selectedTime.getHours()).slice(-2);
                        const minutes = ("0" + selectedTime.getMinutes()).slice(-2);
                        setNewPoll((prev) => ({
                          ...prev,
                          expiryTime: `${hours}:${minutes}`,
                        }));
                      }
                    }}
                  />
                  <TouchableOpacity
                    style={styles.blueButton} // Use global blue button style
                    onPress={() => setShowTimePicker(false)}
                  >
                    <Text style={styles.blueButtonText}>Done</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </View>
        
        {/* Create Button */}
        <TouchableOpacity
          style={[
            styles.blueButton, // Use global blue button style
            { marginTop: 8, marginBottom: 80, paddingVertical: 14 },
            isCreating && { opacity: 0.7 }
          ]}
          onPress={createPoll}
          disabled={isCreating}
        >
          {isCreating ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <Text style={styles.blueButtonText}>
              Create Poll <Ionicons name="checkmark-circle" size={18} color="#fff" />
            </Text>
          )}
        </TouchableOpacity>
        
        {/* Status Message */}
        {voteStatus && (
          <View style={{
            padding: 12,
            backgroundColor: voteStatus.includes('successfully') ? '#e3f5e9' : '#ffebee',
            borderRadius: 8,
            marginBottom: 20,
            flexDirection: 'row',
            alignItems: 'center'
          }}>
            <Ionicons 
              name={voteStatus.includes('successfully') ? "checkmark-circle" : "alert-circle"} 
              size={20} 
              color={voteStatus.includes('successfully') ? '#4caf50' : '#f44336'} 
              style={{ marginRight: 8 }}
            />
            <Text style={{ 
              color: voteStatus.includes('successfully') ? '#2e7d32' : '#c62828',
              flex: 1
            }}>
              {voteStatus}
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

export default PollScreen;