import { StyleSheet, Dimensions } from "react-native";

const { width, height } = Dimensions.get("window");

// New dynamic padding based on device width
const containerPadding = width < 375 ? 10 : 20;

export default StyleSheet.create({
  bg: {
    flex: 1,
    width: width,
    height: height,
    resizeMode: "cover",
  },
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
    paddingHorizontal: containerPadding,
  },
  greyBox: {
    backgroundColor: "rgba(240, 240, 240, 0.9)",
    paddingVertical: width < 375 ? 30 : 40,
    paddingHorizontal: width < 375 ? 20 : 30,
    borderRadius: 12,
    width: width < 375 ? "90%" : "80%",
    maxWidth: 350,
    alignItems: "center",
  },
  contentWrapper: {
    marginTop: 20,
    width: "100%",
  },
  input: {
    width: "100%",
    height: 40,
    borderColor: "#ccc",
    borderWidth: 1,
    paddingHorizontal: 10,
    marginBottom: 10,
    borderRadius: 6,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 40,
  },
  button: {
    backgroundColor: "#007AFF",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginVertical: 10,
    width: width < 375 ? "70%" : 200,
    alignItems: "center",
  },
  buttonText: {
    color: "#FFF",
    fontSize: 18,
    textAlign: "center",
  },
  switchText: {
    marginTop: 10,
    fontSize: 14,
    color: "#007AFF",
  },
  credit: {
    position: "absolute",
    bottom: 10,
    right: 10,
    fontSize: 10,
    color: "#FFF",
  },
});
