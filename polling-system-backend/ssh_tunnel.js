// Import necessary modules
const { Client } = require("ssh2");
const dotenv = require("dotenv");

dotenv.config();

const setupSSHTunnel = (localPort, remoteHost, remotePort) => {
    return new Promise((resolve, reject) => {
        // Define SSH connection configuration
        const sshConfig = {
            host: process.env.SSH_HOST,
            port: process.env.SSH_PORT,
            username: process.env.SSH_USERNAME,
            password: process.env.SSH_PASSWORD,
        };

        // Create a new SSH client instance
        const sshClient = new Client();

        // Event listener for when the SSH connection is ready
        sshClient.on("ready", () => {
            console.log("SSH connection established!");

            // Set up port forwarding
            sshClient.forwardOut(
                "127.0.0.1", // Localhost
                localPort, // Local port to forward from
                remoteHost, // Remote host to forward to
                remotePort, // Remote port to forward to
                (err, stream) => {
                    if (err) {
                        // Handle error in setting up SSH tunnel
                        console.error("Error setting up SSH tunnel:", err);
                        sshClient.end(); // End the SSH connection
                        reject(err); // Reject the promise with the error
                        return;
                    }
                    // Log successful SSH tunnel setup
                    console.log(
                        `SSH Tunnel established: localhost:${localPort} -> ${remoteHost}:${remotePort}`
                    );
                    resolve(stream); // Resolve the promise with the stream
                }
            );
        });

        sshClient.on("error", (err) => {
            console.error("SSH Connection Error:", err);
            reject(err);
        });

        sshClient.on("close", () => {
            console.log("SSH connection closed.");
        });

        sshClient.connect(sshConfig);
    });
};

module.exports = { setupSSHTunnel };
