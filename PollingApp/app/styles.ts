import { StyleSheet } from "react-native";

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f5f5f5",
    },
    // HomeScreen-specific styles moved from index.tsx:
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
    // Existing styles:
    header: {
        fontSize: 24,
        fontWeight: "bold",
        textAlign: "center",
        marginVertical: 20,
    },
    questionText: {
        fontSize: 18,
        fontWeight: "bold",
        marginVertical: 10,
    },
    subHeader: {
        fontSize: 20,
        fontWeight: "bold",
        marginVertical: 10,
    },
    pollSection: {
        padding: 20,
    },
    input: {
        borderWidth: 1,
        borderColor: "#ccc",
        padding: 10,
        marginVertical: 5,
        borderRadius: 5,
    },
    pollCard: {
        backgroundColor: "#fff",
        padding: 20,
        marginVertical: 10,
        borderRadius: 5,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
        elevation: 3,
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
    status: {
        textAlign: "center",
        color: "red",
        marginVertical: 10,
    },
});

export default styles;