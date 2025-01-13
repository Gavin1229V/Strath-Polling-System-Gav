import { StyleSheet } from "react-native";

export default StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: "#f5f5f5",
    },
    header: {
        fontSize: 24,
        fontWeight: "bold",
        textAlign: "center",
        marginBottom: 20,
    },
    pollSection: {
        marginBottom: 20,
        backgroundColor: "#ffffff",
        padding: 15,
        borderRadius: 8,
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    subHeader: {
        fontSize: 18,
        fontWeight: "bold",
        marginBottom: 10,
    },
    input: {
        borderWidth: 1,
        borderColor: "#ccc",
        borderRadius: 8,
        padding: 10,
        marginBottom: 10,
    },
    pollCard: {
        marginBottom: 15,
        padding: 10,
        backgroundColor: "#f9f9f9",
        borderRadius: 8,
    },
    pollQuestion: {
        fontSize: 16,
        fontWeight: "bold",
        marginBottom: 10,
    },
    option: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 5,
    },
    status: {
        textAlign: "center",
        fontSize: 16,
        color: "#28a745",
        marginTop: 10,
    },
    chart: {
        marginVertical: 10,
    },
});