const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const tasks = [];

io.on("connection", (socket) => {
  console.log("A user connected");

  socket.emit("sync:tasks", tasks);

  socket.on("task:create", (task) => {
    tasks.push(task);
    io.emit("task:create", task);
  });

  socket.on("task:update", (task) => {
    const index = tasks.findIndex((item) => item.id === task.id);
    if (index !== -1) {
      tasks[index] = task;
      io.emit("task:update", task);
    }
  });

  socket.on("task:move", (task) => {
    const index = tasks.findIndex((item) => item.id === task.id);
    if (index !== -1) {
      tasks[index] = task;
      io.emit("task:move", task);
    }
  });

  socket.on("task:delete", (taskId) => {
    const index = tasks.findIndex((item) => item.id === taskId);
    if (index !== -1) {
      tasks.splice(index, 1);
      io.emit("task:delete", taskId);
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});

server.listen(5000, () => console.log("Server running on port 5000"));
