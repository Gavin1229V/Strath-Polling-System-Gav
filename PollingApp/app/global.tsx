import { SERVER_IP } from "./config";
import { io, Socket } from "socket.io-client";
import { Platform } from "react-native";

export type PollOption = {
    id: number;
    text: string;
    votes: number;
};

/**
 * Poll type definition that maintains consistency between frontend and backend
 */
export type Poll = {
    id: number;
    question: string;
    pollClass: string;  // Consistent field name for class/course code
    created_by: string;
    created_at: string;
    expiry: string;     // Datetime string for poll expiration
    options: PollOption[];
    created_by_id?: number;
    profile_picture?: string;  // Base64 encoded or URL to profile picture
};

// Add a simple cache for polls with expiration
let pollsCache = {
  data: null as Poll[] | null,
  timestamp: 0,
  expiresIn: 30000, // 30 seconds cache
};

// Shared socket instance to prevent multiple connections
let socketInstance: Socket | null = null;

// Track last poll fetch time to prevent too many requests
let lastPollFetchTime = 0;
const MIN_FETCH_INTERVAL = 5000; // 5 seconds minimum between fetches

// Get or create socket with connection management and better error handling
export const getSocket = (): Socket => {
  if (!socketInstance || !socketInstance.connected) {
    // Use different socket options based on platform with better timeout and reconnection settings
    const socketOptions = Platform.OS === "web" 
      ? { 
          transports: ["polling"], 
          reconnection: true, 
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          timeout: 20000
        } 
      : { 
          reconnection: true, 
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          timeout: 20000
        };
    
    socketInstance = io(SERVER_IP, socketOptions);
    
    // Add connection event handlers with better error handling
    socketInstance.on('connect', () => {
      console.log('Socket connected');
    });
    
    socketInstance.on('disconnect', (reason) => {
      console.log(`Socket disconnected: ${reason}`);
    });
    
    socketInstance.on('connect_error', (err) => {
      console.error('Socket connection error:', err.message);
    });
    
    socketInstance.on('error', (error) => {
      console.error('Socket error:', error);
    });
    
    // Handle server errors
    socketInstance.on('exception', (error) => {
      console.error('Server exception:', error);
    });
  }
  
  return socketInstance;
};

// Close socket connection gracefully
export const closeSocket = () => {
  if (socketInstance && socketInstance.connected) {
    socketInstance.disconnect();
    socketInstance = null;
    console.log('Socket disconnected manually');
  }
};

// Improved fetchPolls with caching, error handling, and retry logic
export const fetchPolls = async (
  setPollsState: (polls: Poll[]) => void,
  forceRefresh = false
): Promise<Poll[]> => {
  const now = Date.now();
  
  // Rate limiting on the client side
  if (!forceRefresh && now - lastPollFetchTime < MIN_FETCH_INTERVAL) {
    console.log("Throttling poll requests - too soon since last request");
    
    // If we have cached data, use it
    if (pollsCache.data) {
      console.log("Using cached polls data due to throttling");
      setPollsState(pollsCache.data);
      return pollsCache.data;
    }
  }
  
  // Return cached data if available and not expired
  if (!forceRefresh && pollsCache.data && now - pollsCache.timestamp < pollsCache.expiresIn) {
    console.log("Using cached polls data");
    setPollsState(pollsCache.data);
    return pollsCache.data;
  }

  // Update the last fetch time
  lastPollFetchTime = now;
  
  // Implement exponential backoff retry logic
  const maxRetries = 3;
  let retryCount = 0;
  let delay = 1000; // Start with 1s delay

  while (retryCount < maxRetries) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const response = await fetch(`${SERVER_IP}/api/polls`, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        }
      });
      
      clearTimeout(timeoutId);

      if (response.status === 429) {
        // Rate limited - wait longer before retry
        retryCount++;
        delay *= 2; // Exponential backoff
        console.log(`Rate limited. Retrying in ${delay}ms (${retryCount}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }

      // Parse the response safely
      let data;
      try {
        const text = await response.text();
        data = JSON.parse(text);
      } catch (parseError) {
        console.error("Failed to parse response as JSON:", parseError);
        throw new Error("Invalid server response format");
      }
      
      // Update cache
      pollsCache.data = data;
      pollsCache.timestamp = now;
      
      setPollsState(data);
      return data;
    } catch (error: any) {
      retryCount++;
      
      if (error.name === 'AbortError') {
        console.error("Request timed out");
      } else {
        console.error(`Error fetching polls (attempt ${retryCount}/${maxRetries}):`, error);
      }
      
      if (retryCount >= maxRetries) {
        // If we've exhausted retries and have cached data, return that as fallback
        if (pollsCache.data) {
          console.log("Using stale cache as fallback after fetch failures");
          setPollsState(pollsCache.data);
          return pollsCache.data;
        }
        throw new Error(`Failed to fetch polls after ${maxRetries} attempts`);
      }
      
      // Wait before retrying with exponential backoff
      delay *= 2;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  // This should never be reached due to the throw in the catch block
  throw new Error("Unexpected error in fetchPolls");
};