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
    backgroundColor: "#094183", // Updated from #007AFF
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
    paddingVertical: 6, // Reduce this from 12
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
    backgroundColor: "#094183", // Updated from #007AFF
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
    backgroundColor: "#094183", // Updated from #007AFF to match navbar
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
  // Election styles
  electionContainer: {
    flex: 1,
    backgroundColor: "#F8F9FA",
    padding: 16,
  },
  electionHeader: {
    fontSize: 24,
    fontWeight: "700",
    color: "#333",
    marginVertical: 16,
    textAlign: "center",
  },
  electionCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 18,
    marginBottom: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.03)",
  },
  electionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 10,
    color: "#2C3E50",
    flex: 1,
    paddingRight: 8,
  },
  electionDetail: {
    marginBottom: 10,
    color: "#555",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 2,
  },
  electionDescription: {
    fontSize: 15,
    marginBottom: 14,
    color: "#555",
    lineHeight: 22,
  },
  electionMetaContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  electionStatus: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    overflow: "hidden",
    fontSize: 13,
    fontWeight: "700",
  },
  electionStatusOpen: {
    backgroundColor: "#E8F5E9",
    color: "#1B5E20",
  },
  electionStatusClosed: {
    backgroundColor: "#FFEBEE",
    color: "#B71C1C",
  },
  candidateCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.03)",
  },
  candidateAvatar: {
    width: 65,
    height: 65,
    borderRadius: 32.5,
    marginRight: 16,
    backgroundColor: "#E1F5FE",
  },
  candidateInfo: {
    flex: 1,
  },
  candidateName: {
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 5,
    color: "#2C3E50",
  },
  candidateStatement: {
    fontSize: 15,
    color: "#555",
    marginVertical: 4,
    lineHeight: 21,
  },
  candidateVoteCount: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1976D2",
    marginTop: 6,
  },
  electionForm: {
    padding: 20,
    marginTop: 20,
    marginBottom: 20,
    backgroundColor: "#fff",
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  formLabel: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 8,
    color: "#444",
  },
  formField: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    padding: 14,
    marginBottom: 18,
    backgroundColor: "#fafafa",
    fontSize: 16,
  },
  formTextArea: {
    height: 140,
    textAlignVertical: "top",
  },
  formSubmitButton: {
    backgroundColor: "#1976D2",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
  },
  formSubmitText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  votedBadge: {
    backgroundColor: "#43A047",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  votedText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 13,
  },
  // Blue button styling with navbar color - global use
  blueButton: {
    backgroundColor: "#094183",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  blueButtonSmall: {
    backgroundColor: "#094183",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  blueButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 16,
  },
  blueButtonTextSmall: {
    color: "#FFFFFF",
    fontWeight: "500",
    fontSize: 14,
  },
  // New year filter chip styles
  yearFilterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  yearFilterChipActive: {
    backgroundColor: "#094183",
    borderColor: "#094183",
  },
  yearFilterChipText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#555",
  },
  yearFilterChipTextActive: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  // Add legend styles for charts
  legendContainer: {
    flexDirection: "column",
    marginTop: 10,
    width: "100%",
    paddingHorizontal: 20,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    paddingVertical: 2,
  },
  legendText: {
    fontSize: 13,
    color: "#333",
    flex: 1,
  },
});

export default styles;