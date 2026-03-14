const { io } = require("socket.io-client");
const { exec } = require("child_process");

// Double check: Is your npm run dev on 3000 or 3001?
const SERVER_URL = "http://localhost:3000"; 

const socket = io(SERVER_URL, {
  path: "/api/socket",
  reconnectionDelay: 1000,
  reconnection: true,
  transports: ["websocket"] // Force websocket to avoid XHR polling errors
});

socket.on("connect", () => {
  console.log("👻 Ghost Agent Connected to LogInsight!");
});

socket.on("execute-fix", (data) => {
  console.log(`🛠️ Executing: ${data.command}`);
  exec(data.command, (error, stdout, stderr) => {
    socket.emit("fix-completed", {
      success: !error,
      output: stdout || stderr
    });
  });
});

socket.on("connect_error", (err) => {
  console.log("❌ Connection Error:", err.message);
});