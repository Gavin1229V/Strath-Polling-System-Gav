import { StyleSheet } from "react-native";

const styles = StyleSheet.create({
  // General background and screen layout
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
    padding: 20,
  },
  // Centered content container (for auth pages, etc.)
  screenContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  // HomeScreen-specific styles
  homeContainer: {
    flex: 1,
    padding: 20,
    backgroundColor: "#f5f5f5",
    alignItems: "center",
  },
  profileContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  profilePic: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#ccc",
    marginRight: 10,
  },
  profileName: {
    fontSize: 18,
    fontWeight: "bold",
  },
  homeHeader: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
  },
  
  header: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    textAlign: "center",
    marginBottom: 20,
  },
  // Poll question style
  questionText: {
    fontSize: 18,
    fontWeight: "bold",
    marginVertical: 10,
    color: "#333",
  },
  subHeader: {
    fontSize: 20,
    fontWeight: "bold",
    marginVertical: 10,
  },
  pollSection: {
    padding: 20,
  },
  // Input styling shared across forms
  input: {
    width: "90%", // changed from flex: 1 and width: "100%"
    alignSelf: "center", // added to center the input horizontally evenly
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    padding: 10,
    marginVertical: 7,
  },
  // Poll-specific card style
  pollCard: {
    backgroundColor: "#fff",
    padding: 20,
    marginVertical: 10,
    borderRadius: 5,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  pollQuestion: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  option: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 5,
  },
  optionContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  status: {
    textAlign: "center",
    color: "red",
    marginVertical: 10,
  },
  // Additional styles for registration
  // Button styling (same as login.tsx button style)
  button: {
    backgroundColor: "#007AFF",
    padding: 15,
    borderRadius: 5,
    alignItems: "center",
    marginVertical: 10,
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  // Dropdown styles
  dropdown: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    borderRadius: 5,
    marginVertical: 5,
  },
  dropdownText: {
    fontSize: 16,
  },
  dropdownContainer: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    marginVertical: 5,
    backgroundColor: "#fff",
  },
  dropdownItem: {
    padding: 10,
  },
  dropdownItemText: {
    fontSize: 16,
  },
  // Navbar styling to be consistent across all pages where it's shown
  navbar: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    height: 60,
    backgroundColor: "#007BFF",
    width: "100%",
    borderTopWidth: 1,
    borderTopColor: "#ddd",
    position: "absolute",
    bottom: 0,
  },
  navButton: {
    padding: 10,
  },
  navText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  removeButtonText: {
    color: "white",
    fontWeight: "bold",
  },
  removeButton: {
    marginLeft: 10,
    padding: 10,
    backgroundColor: "red",
    borderRadius: 5,
  },
});

export default styles;