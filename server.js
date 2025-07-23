const express = require("express");
const http = require("http");
const mongoose = require("mongoose");
const cors = require("cors");
const { Server } = require("socket.io");

const serverConfig = require("./configs/server.config");
const dbConfig = require("./configs/db.config");
const fileConfig = require("./configs/file.config")

const app = express();

app.use(cors({
  origin: ["http://localhost:5173", "http://localhost:5174", "http://localhost:3000"],
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(fileConfig.renderUrl));

// routes
require("./app/routes/index")(app);

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173", "http://localhost:5174", "http://localhost:3000"],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    credentials: true
  },
});

app.set("io", io);

// socket
const connectedUsers = new Map();

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("join", (userId) => {
    socket.join(userId);
    connectedUsers.set(userId, socket.id);
    console.log(`User ${userId} joined with socket ${socket.id}`);
  });
  // for group 
  socket.on("joinGroups", (groupIds) => {
    if (Array.isArray(groupIds)) {
      groupIds.forEach(id => {
        socket.join(`group-${id}`);
        console.log(`Socket ${socket.id} joined group-${id}`);
      });
    }
  });
  socket.on("sendMessage", async ({ senderId, receiverId, message }) => {
    try {
      console.log("Message received:", { senderId, receiverId, message });

      io.to(receiverId).emit("receiveMessage", {
        senderId,
        message,
        timestamp: new Date()
      });

      socket.emit("messageSent", { success: true });
    } catch (error) {
      socket.emit("messageError", { error: error.message });
    }
  });

  socket.on("disconnect", () => {
    for (const [userId, socketId] of connectedUsers.entries()) {
      if (socketId === socket.id) {
        connectedUsers.delete(userId);
        break;
      }
    }
    console.log("User disconnected:", socket.id);
  });
});

server.listen(serverConfig.PORT, () => {
  console.log(`Server started on port ${serverConfig.PORT}`);
});

mongoose.connect(dbConfig.DB_URL);
mongoose.connection.on("error", console.error.bind(console, "MongoDB error:"));
mongoose.connection.once("open", () => {
  console.log("Connected to MongoDB");
});



