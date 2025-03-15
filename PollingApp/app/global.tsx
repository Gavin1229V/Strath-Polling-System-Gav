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
const MIN_FETCH_INTERVAL = 10000; // Increased from 5000 to 10000 (10 seconds minimum between fetches)

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
  
  // Rate limiting on the client side - stricter throttling
  if (!forceRefresh && now - lastPollFetchTime < MIN_FETCH_INTERVAL) {
    console.log("Throttling poll requests - too soon since last request");
    
    // If we have cached data, use it
    if (pollsCache.data) {
      console.log("Using cached polls data due to throttling");
      setPollsState(pollsCache.data);
      return pollsCache.data;
    }
  }
  
  // Return cached data if available and not expired - longer cache lifetime
  if (!forceRefresh && pollsCache.data && now - pollsCache.timestamp < pollsCache.expiresIn) {
    console.log("Using cached polls data");
    setPollsState(pollsCache.data);
    return pollsCache.data;
  }

  // Update the last fetch time
  lastPollFetchTime = now;
  
  // Implement improved exponential backoff retry logic
  const maxRetries = 5; // Increased from 3 to 5
  let retryCount = 0;
  let delay = 2000; // Start with 2s delay instead of 1s
  
  // Add jitter to prevent request clustering
  const getJitteredDelay = (baseDelay: number) => {
    return baseDelay + Math.floor(Math.random() * (baseDelay * 0.3));
  };

  while (retryCount < maxRetries) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout, increased from 10s

      console.log(`Fetching polls, attempt ${retryCount + 1}/${maxRetries}`);
      const response = await fetch(`${SERVER_IP}/api/polls`, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache', // Add cache control header
        }
      });
      
      clearTimeout(timeoutId);

      if (response.status === 429) {
        // Rate limited - wait longer before retry with jitter
        const jitteredDelay = getJitteredDelay(delay);
        retryCount++;
        console.log(`Rate limited. Retrying in ${jitteredDelay}ms (${retryCount}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, jitteredDelay));
        delay *= 2; // Exponential backoff
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
      
      // Update cache with longer expiration
      pollsCache.data = data;
      pollsCache.timestamp = now;
      pollsCache.expiresIn = 60000; // 60 seconds cache (doubled from 30 seconds)
      
      setPollsState(data);
      return data;
    } catch (error: any) {
      const jitteredDelay = getJitteredDelay(delay);
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
      
      // Wait before retrying with exponential backoff and jitter
      console.log(`Retrying in ${jitteredDelay}ms...`);
      await new Promise(resolve => setTimeout(resolve, jitteredDelay));
      delay *= 2;
    }
  }
  
  // This code should only be reached if the while loop completes without returning
  // Add a fallback to ensure we either return data or throw a specific error
  if (pollsCache.data) {
    console.log("Loop completed without resolution, using cache as fallback");
    setPollsState(pollsCache.data);
    return pollsCache.data;
  }
  
  throw new Error("Failed to fetch polls after maximum retries");
};

/**
 * Processes a profile picture string into a valid URI for display
 * Handles different formats: base64, URLs, and relative paths
 */
export const processProfilePicture = (profilePic: string | null | undefined): string | null => {
  if (!profilePic) return null;
  
  try {
    // Handle string cleanup
    let pic = profilePic.trim();
    
    // Remove quotes if present
    if (pic.startsWith(`"`) && pic.endsWith(`"`)) {
      pic = pic.slice(1, -1);
    }
    
    // Return as-is if it's already a data URI or absolute URL
    if (pic.startsWith("data:") || pic.startsWith("http://") || pic.startsWith("https://")) {
      return pic;
    } 
    
    // Otherwise, treat as a relative path and prepend SERVER_IP
    return `${SERVER_IP}/${pic}`;
  } catch (error) {
    console.error("Error processing profile picture:", error);
    return null;
  }
};

// Check if base64 image is too large
export const isBase64TooLarge = (base64String: string): boolean => {
  return base64String.length > 1024 * 1024; // 1MB limit
};

export const convertToBase64Uri = (pic: any): string => {
  if (!pic) return "";
  
  // Handle if already a valid data URI
  if (typeof pic === "string") {
    if (pic.startsWith("data:")) return pic;
    
    // Check if the string is too large
    if (isBase64TooLarge(pic)) {
      console.warn("Profile picture base64 string is too large, using placeholder");
      return "";
    }
    
    return "data:image/jpeg;base64," + pic;
  }
  
  // Handle binary data
  if (pic.data) {
    try {
      let byteArray: Uint8Array;
      if (pic.data instanceof Uint8Array) {
        byteArray = pic.data;
      } else if (Array.isArray(pic.data)) {
        byteArray = new Uint8Array(pic.data);
      } else {
        byteArray = new Uint8Array(Object.values(pic.data));
      }
      
      // Check if the byte array is too large
      if (byteArray.length > 1024 * 1024) {
        console.warn("Profile picture data is too large, using placeholder");
        return "";
      }
      
      const base64String = Buffer.from(byteArray).toString("base64");
      return "data:image/jpeg;base64," + base64String;
    } catch (e) {
      console.error("Error processing picture data:", e);
      return "";
    }
  }
  return "";
};

export default{}