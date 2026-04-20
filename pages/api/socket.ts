import { Server as ServerIO } from "socket.io";
import type { NextApiRequest, NextApiResponse } from "next";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default function handler(req: NextApiRequest, res: any) {
  // Check if the Socket.io server is already initialized
  if (!res.socket.server.io) {
    console.log("🚀 Initializing Socket.io Server (Pages Router)...");
    
    const io = new ServerIO(res.socket.server, {
      path: "/api/socket",
      addTrailingSlash: false,
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });

    res.socket.server.io = io;

    io.on("connection", (socket) => {
      console.log("👻 Ghost Agent Connected:", socket.id);

      socket.on("dispatch-fix", (msg) => {
        console.log("📡 Relaying fix to agent:", msg.command);
        socket.broadcast.emit("execute-fix", msg);
      });

      socket.on("fix-completed", (msg) => {
        console.log("✅ Fix outcome received:", msg.success);
        socket.broadcast.emit("fix-result-ui", msg);
      });
    });
  } else {
    console.log("Socket server already active");
  }
  res.end();
}