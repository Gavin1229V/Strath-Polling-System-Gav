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
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 10,
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
    borderRadius: 8,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  pollListContainer: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  classCode: {
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 4,
  },
  colorSwatches: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 10,
  },
  swatchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 5,
  },
  swatchBox: {
    width: 15,
    height: 15,
    marginRight: 3,
  },
  swatchText: {
    fontSize: 12,
  },
  voteRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginVertical: 10,
  },
  voteOptionsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    marginTop: 10,
  },
  voteButtonContainer: {
    alignItems: "center",
    marginHorizontal: 10,
    marginBottom: 8,
    minWidth: 80,
  },
  voteButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 5,
    minWidth: 80,
    alignItems: "center",
  },
  voteButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 50,
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingIndicator: {
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    padding: 20,
    borderRadius: 10,
    alignItems: "center",
  },
  loadingText: {
    color: "#fff",
    marginTop: 10,
  },
  filterScrollView: {
    paddingVertical: 12,
    paddingHorizontal: 10,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#e0e0e0",
    borderRadius: 20,
    marginRight: 8,
  },
  activeFilterButton: {
    backgroundColor: "#007AFF",
  },
  filterButtonText: {
    fontSize: 14,
    color: "#333",
  },
  activeFilterText: {
    color: "#fff",
    fontWeight: "600",
  },
  infoOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: -10000,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-start",
    padding: 20,
  },
  infoCard: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 20,
    position: "relative",
  },
  infoProfilePic: {
    width: 60,
    height: 60,
    borderRadius: 30,
    position: "absolute",
    top: 20,
    right: 20,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  infoDetail: {
    fontSize: 14,
    marginBottom: 8,
    color: "#333",
  },
  closeButton: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#f0f0f0",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  closeButtonText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    lineHeight: 24,
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
  removeButtonAbsolute: {
    position: "absolute",
    right: 10,
    top: 10,
    backgroundColor: "red",
    paddingHorizontal: 5,
    paddingVertical: 3,
    borderRadius: 5,
  },
  // PollCreator common styles
  pollCreatorContainer: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    backgroundColor: "#fff",
  },
  pollCreatorHeader: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  pollCreatorLabel: {
    fontWeight: "600",
    marginBottom: 8,
  },
  pollCreatorInput: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    marginBottom: 16,
    width: "100%",
    backgroundColor: "#fafafa",
  },
  pollCreatorButton: {
    backgroundColor: "#007bff",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    marginBottom: 16,
  },
  pollCreatorButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  pollCreatorRemoveButton: {
    marginLeft: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#f8d7da",
    borderRadius: 6,
  },
  pollCreatorRemoveButtonText: {
    color: "#d9534f",
    fontWeight: "600",
  },
  pollCreatorModalScroll: {
    maxHeight: 200,
  },
  pollCreatorModalOption: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  pollCreatorModalCancel: {
    padding: 10,
    alignItems: "center",
  },
  pollCreatorStatus: {
    marginTop: 20,
    color: "green",
    fontWeight: "600",
  },
});

export default styles;