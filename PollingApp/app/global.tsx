import { SERVER_IP } from "./config";

type PollOption = {
    id: number;
    text: string;
    votes: number;
};

// Updated Poll type to include optional fields for compatibility.
export type Poll = {
    id: number;
    question: string;
    pollClass: string;  // renamed from "class"
    created_by: string;
    created_at: string;
    expiry: string; // added expiry field as a datetime string
    options: PollOption[];
    created_by_id?: number;
    profile_picture?: string;
};

export const fetchPolls = async (setPolls: React.Dispatch<React.SetStateAction<Poll[]>>) => {
    try {
        const response = await fetch(`${SERVER_IP}/api/polls`);
        if (!response.ok) {
            throw new Error(`Error fetching polls: ${response.statusText}`);
        }
        const data = await response.json();
        setPolls(
          data.map((poll: any) => ({
            ...poll,
            pollClass: poll.pollClass ?? poll["class"] ?? ""
          }))
        );
    } catch (err) {
        console.error("Error fetching polls:", err);
    }
};

// Remove the incorrect default export:
// export default global;