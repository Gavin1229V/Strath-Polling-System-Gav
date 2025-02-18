import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert } from "react-native";
import styles from "./styles";

const roles = [
  { label: "Student", value: 1 },
  { label: "Student Rep", value: 2 },
  { label: "Lecturer", value: 3 },
];

const RegisterPage: React.FC = () => {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [role, setRole] = useState<number>(1); // Default to Student
  const [dropdownVisible, setDropdownVisible] = useState<boolean>(false);

  const handleRegister = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Email and password are required.");
      return;
    }

    try {
      // Replace with the URL for your backend register endpoint.
      const response = await fetch("http://your-backend-api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        Alert.alert("Registration Error", errorData.message || "Registration failed");
        return;
      }

      await response.json();
      Alert.alert("Success", "User registered successfully!");
      // Optionally, navigate to another screen on success.
    } catch (error) {
      console.error("Registration error:", error);
      Alert.alert("Error", "An error occurred during registration.");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Register</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      {/* Custom dropdown for selecting role */}
      <TouchableOpacity
        style={styles.dropdown}
        onPress={() => setDropdownVisible(!dropdownVisible)}
      >
        <Text style={styles.dropdownText}>
          {roles.find((r) => r.value === role)?.label}
        </Text>
      </TouchableOpacity>
      {dropdownVisible && (
        <View style={styles.dropdownContainer}>
          {roles.map((item) => (
            <TouchableOpacity
              key={item.value}
              style={styles.dropdownItem}
              onPress={() => {
                setRole(item.value);
                setDropdownVisible(false);
              }}
            >
              <Text style={styles.dropdownItemText}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
      <TouchableOpacity style={styles.button} onPress={handleRegister}>
        <Text style={styles.buttonText}>Register</Text>
      </TouchableOpacity>
    </View>
  );
};

export default RegisterPage;