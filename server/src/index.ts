import { createServer } from "http";
import { Server } from "socket.io";
import express from "express";

const httpServer = createServer();
const io = new Server(httpServer, {
    cors: {
        origin: "http://localhost:5173",
    }
});

io.on("connection", (socket) => {
    console.log("client connected");

    socket.on('Hello', () => {
        console.log("Received");
        socket.emit('reply');
    })
});

httpServer.listen(8000);