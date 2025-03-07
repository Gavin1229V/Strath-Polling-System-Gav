import { SERVER_IP } from "./config";

type PollOption = {
    id: number;
    text: string;
    votes: number;
};

// Updated Poll type to include created_by and created_at
export type Poll = {
    id: number;
    question: string;
    created_by: string;
    created_at: string;
    options: PollOption[];
};

export const fetchPolls = async (setPolls: React.Dispatch<React.SetStateAction<Poll[]>>) => {
    try {
        const response = await fetch(`${SERVER_IP}/api/polls`); // Use the SERVER_IP variable
        if (!response.ok) {
            throw new Error(`Error fetching polls: ${response.statusText}`);
        }
        const data = await response.json();
        setPolls(data);
    } catch (err) {
        console.error("Error fetching polls:", err);
    }
};


export default global;