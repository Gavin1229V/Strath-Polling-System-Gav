const { Client } = require("ssh2");
const dotenv = require("dotenv");
dotenv.config(); // Load environment variables

const setupSSHTunnel = (localPort, remoteHost, remotePort) => {
    return new Promise((resolve, reject) => {
        const sshConfig = {
            host: process.env.SSH_HOST, // e.g., "cafe.cis.strath.ac.uk"
            port: 22,
            username: process.env.SSH_USERNAME, // Your DS username
            password: process.env.SSH_PASSWORD, // Your DS password
        };

        const sshClient = new Client();

        sshClient.on("ready", () => {
            console.log("SSH connection established!");

            sshClient.forwardOut(
                "127.0.0.1", // Localhost on your machine
                localPort, // Local port
                remoteHost, // Remote host, e.g., "devweb2024.cis.strath.ac.uk"
                remotePort, // Remote port, typically 3306 for MySQL
                (err, stream) => {
                    if (err) {
                        console.error("Error setting up SSH tunnel:", err);
                        sshClient.end();
                        reject(err);
                        return;
                    }
                    console.log(
                        `SSH Tunnel established: localhost:${localPort} -> ${remoteHost}:${remotePort}`
                    );
                    resolve(stream);
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
