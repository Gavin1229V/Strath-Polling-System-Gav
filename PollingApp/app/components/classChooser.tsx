import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from "react-native";
import { useAuth } from "./userDetails";
import { useRouter } from "expo-router";
import { SERVER_IP } from "../config";
import AsyncStorage from "@react-native-async-storage/async-storage";
import globalStyles from "../../styles/styles"; // Import global styles

// Hardcoded mapping for each year
const yearClassMapping: Record<string, string[]> = {
  "Year 1": [
    "CS101 - Topics in Computing 1",
    "CS103 - Machines, Languages and Computation",
    "CS104 - Information and Information Systems",
    "CS105 - Programming Foundations",
    "CS106 - Computer Systems and Organisation",
  ],
  "Year 2": [
    "CS207 - Advanced Programming",
    "CS208 - Logic and Algorithms",
    "CS209 - User and Data Modelling",
    "CS210 - Computer Systems and Architecture",
    "CS211 - Professional Issues in Computing",
    "CS259 - Quantitative Methods For Computer Science",
    "CS260 - Functional Thinking",
  ],
  "Year 3": [
    "CS308 - Building Software Systems",
    "CS310 - Foundations of Artificial Intelligence",
    "CS312 - Web Applications Development",
    "CS313 - Computer Systems and Concurrency",
    "CS316 - Functional Programming",
    "CS317 - Mobile App Development",
  ],
  "Year 4": [
    "CS407 - Computer Security",
    "CS408 - Individual Project",
    "CS412 - Information Access and Mining",
    "CS418 - Computer Science",
    "CS426 - Human-Centred Security",
  ],
};

const yearOptions = ["Year 1", "Year 2", "Year 3", "Year 4"];

const ClassChooser = () => {
  // Use hardcoded classes for selected year
  const [selectedYear, setSelectedYear] = useState<string>("Year 1");
  const currentClasses = yearClassMapping[selectedYear] || [];

  const [showYearPicker, setShowYearPicker] = useState<boolean>(false);
  const [dropdowns, setDropdowns] = useState<string[]>([""]); // initial blank class selection
  const [pickerIndex, setPickerIndex] = useState<number | null>(null);
  const { user, setUser } = useAuth();
  const router = useRouter();

  const removeOption = (index: number) => {
    if (dropdowns.length > 1) {
      const newDropdowns = [...dropdowns];
      newDropdowns.splice(index, 1);
      // If no blank exists and not all classes are selected, add a blank dropdown
      if (newDropdowns.every((val) => val !== "") && newDropdowns.length < currentClasses.length) {
        newDropdowns.push("");
      }
      setDropdowns(newDropdowns);
    }
  };

  const removeAll = () => {
    setDropdowns([""]);
  };

  // Compute available options for the active class dropdown
  const getAvailableOptions = (index: number) => {
    const others = dropdowns.filter((val, i) => i !== index && val !== "");
    return currentClasses.filter((cls) => dropdowns[index] === cls || !others.includes(cls));
  };

  const selectOption = (option: string) => {
    if (pickerIndex !== null) {
      const newDropdowns = [...dropdowns];
      newDropdowns[pickerIndex] = option;
      // Automatically add a new blank box if this is the last dropdown and not all classes are selected
      if (
        pickerIndex === newDropdowns.length - 1 &&
        newDropdowns.filter((val) => val !== "").length < currentClasses.length
      ) {
         newDropdowns.push("");
      }
      setDropdowns(newDropdowns);
      setPickerIndex(null);
    }
  };

  // Handle year selection from the year picker
  const selectYear = (year: string) => {
    setSelectedYear(year);
    setShowYearPicker(false);
    setDropdowns([""]); // reset class selection when year changes
  };

  const selectAll = () => {
    setDropdowns([...currentClasses]);
  };

  // New function to save the selected class codes into the database.
  const saveClasses = async () => {
    const selectedClasses = dropdowns
      .filter(val => val !== "")
      .map(val => val.split("-")[0].trim());
    if (!user) {
      Alert.alert("Error", "User not logged in.");
      return;
    }

    // Extract year number from selected year (e.g., "Year 1" -> 1)
    // Set to null if user is a lecturer (role 3)
    let yearNumber: number | null = null;
    if (user.role !== 3) {
      // Extract the number from strings like "Year 1", "Year 2", etc.
      const yearMatch = selectedYear.match(/\d+/);
      if (yearMatch) {
        yearNumber = parseInt(yearMatch[0], 10);
      }
    }
    
    try {
      const response = await fetch(`${SERVER_IP}/api/saveclasses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          user_id: user.user_id, 
          classes: selectedClasses,
          year: yearNumber  // Include the year in the request
        }),
      });
      const result = await response.json();
      if (response.ok) {
        const classesString = selectedClasses.join(",");
        // Clear previous classes from local storage then update state.
        await AsyncStorage.removeItem("user");
        setUser({ ...user, classes: classesString });
        Alert.alert("Success", result.message || "Classes saved successfully.", [
          { text: "OK", onPress: () => router.replace("/components/home") }
        ]);
      } else {
        Alert.alert("Error", result.message || "Failed to save classes.");
      }
    } catch (error) {
      Alert.alert("Error", "An error occurred while saving classes.");
    }
  };

  return (
    <View style={[globalStyles.container, styles.container]}>
      {/* Year selector at top left */}
      <TouchableOpacity style={styles.yearSelector} onPress={() => setShowYearPicker(true)}>
        <Text style={styles.yearSelectorText}>{selectedYear}</Text>
      </TouchableOpacity>
      {showYearPicker && (
        <View style={styles.yearPickerModal}>
          <ScrollView>
            {yearOptions.map((year, idx) => (
              <TouchableOpacity 
                key={idx} 
                style={styles.yearPickerItem} 
                onPress={() => selectYear(year)}
              >
                <Text style={styles.yearPickerItemText}>{year}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity 
              style={styles.cancelButton} 
              onPress={() => setShowYearPicker(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}
      {/* Class dropdowns */}
      {dropdowns.map((dropdown, index) => (
        <View key={index} style={styles.dropdownContainer}>
          <TouchableOpacity 
            style={styles.dropdown} 
            onPress={() => setPickerIndex(index)}
          >
            <Text style={styles.dropdownText}>
              {dropdown === "" ? "Select class" : dropdown}
            </Text>
          </TouchableOpacity>
          {dropdowns.length > 1 && (
            <TouchableOpacity 
              style={[globalStyles.blueButtonSmall, { backgroundColor: "red" }]}
              onPress={() => removeOption(index)}
            >
              <Text style={globalStyles.blueButtonTextSmall}>Remove</Text>
            </TouchableOpacity>
          )}
        </View>
      ))}
      {/* Select All button: shown until every class is selected */}
      {dropdowns.filter(val => val !== "").length < currentClasses.length && (
        <TouchableOpacity style={[globalStyles.blueButton, styles.buttonSpacing]} onPress={selectAll}>
          <Text style={globalStyles.blueButtonText}>Select All</Text>
        </TouchableOpacity>
      )}
      {dropdowns.length > 1 && (
        <TouchableOpacity style={[globalStyles.blueButton, styles.buttonSpacing]} onPress={removeAll}>
          <Text style={globalStyles.blueButtonText}>Remove All</Text>
        </TouchableOpacity>
      )}
      {/* New Save Classes button */}
      <TouchableOpacity style={[globalStyles.blueButton, styles.buttonSpacing]} onPress={saveClasses}>
        <Text style={globalStyles.blueButtonText}>Save Classes</Text>
      </TouchableOpacity>
      {pickerIndex !== null && (
        <View style={styles.pickerModal}>
          <ScrollView>
            {getAvailableOptions(pickerIndex).map((option, idx) => (
              <TouchableOpacity 
                key={idx} 
                style={styles.pickerItem} 
                onPress={() => selectOption(option)}
              >
                <Text style={styles.pickerItemText}>{option}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity 
              style={styles.cancelButton} 
              onPress={() => setPickerIndex(null)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}
    </View>
  );
};

export default ClassChooser;

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  yearSelector: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#ccc",
    backgroundColor: "#fff",
    padding: 8,
    borderRadius: 5,
    marginBottom: 10,
  },
  yearSelectorText: {
    fontSize: 14,
    fontWeight: "bold",
  },
  yearPickerModal: {
    position: "absolute",
    top: "10%",
    left: "5%",
    right: "5%",
    maxHeight: "40%",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    padding: 10,
    zIndex: 200,
  },
  yearPickerItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  yearPickerItemText: {
    fontSize: 14,
  },
  dropdownContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 12, // Increased from 5 to 12 for more spacing between inputs
  },
  dropdown: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    borderRadius: 5,
  },
  dropdownText: {
    fontSize: 16,
  },
  pickerModal: {
    position: "absolute",
    top: "20%",
    left: "5%",
    right: "5%",
    maxHeight: "60%",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    padding: 10,
    zIndex: 100,
  },
  pickerItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  pickerItemText: {
    fontSize: 16,
  },
  cancelButton: {
    marginTop: 10,
    backgroundColor: "#ccc",
    padding: 10,
    borderRadius: 5,
    alignItems: "center",
  },
  cancelButtonText: {
    fontWeight: "bold",
  },
  buttonSpacing: {
    marginVertical: 16, // Increased from the default 10 to 16 for more spacing between buttons
  },
});

