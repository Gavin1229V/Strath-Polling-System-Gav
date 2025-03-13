# Simpoll - University Polling System

A real-time polling system designed for university classrooms, enabling seamless interaction between lecturers and students during lectures.

## Project Overview

Simpoll allows lecturers to create polls that students can respond to in real-time. The system features:

- Role-based access (students, lecturers)
- Real-time poll updates using WebSockets
- Class-specific polls
- Visual results with pie charts
- User authentication and verification

## Project Structure

- `/PollingApp` - React Native mobile application (Expo)
- `/polling-system-backend` - Node.js backend server
- `/sql` - Database schemas and setup scripts

## Getting Started

### Backend Setup

1. Navigate to `/polling-system-backend`
2. Install dependencies: `npm install`
3. Create a `.env` file with your configuration (see `.env.example`)
4. Run the server: `node server.js`

### Mobile App Setup

1. Navigate to `/PollingApp`
2. Install dependencies: `npm install`
3. Update the server IP in `/app/config.ts`
4. Start the app: `npx expo start`

## Technologies Used

- **Frontend**: React Native, Expo Router, Socket.IO Client
- **Backend**: Node.js, Express, Socket.IO, MySQL
- **Authentication**: JWT, Email verification

## Contributors

- Gavin Verma

## License

© 2024 Gavin Verma. All Rights Reserved.
