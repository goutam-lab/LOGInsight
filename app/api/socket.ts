import { Server } from "socket.io";
import type { NextApiRequest, NextApiResponse } from "next";

export default function handler(req: NextApiRequest, res: any) {
  // If the server is already running, don't re-initialize
  if (res.socket.server.io) {
    console.log("Socket server is already running");
    res.end();
    return;
  }

  console.log("🚀 Initializing Socket.io Server...");
  
  const io = new Server(res.socket.server, {
    path: "/api/socket",
    addTrailingSlash: false,
    cors: {
      origin: "*", // Allows your agent to connect locally
    }
  });

  res.socket.server.io = io;

  io.on("connection", (socket) => {
    console.log("👻 Ghost Agent Connected:", socket.id);

    socket.on("dispatch-fix", (payload) => {
      console.log("📡 Relaying fix to agent...");
      socket.broadcast.emit("execute-fix", payload);
    });

    socket.on("fix-completed", (result) => {
      console.log("✅ Fix completed by agent");
      socket.broadcast.emit("fix-result-ui", result);
    });
  });

  res.end();
}