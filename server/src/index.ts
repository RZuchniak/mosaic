import { createServer } from "http";
import { Server } from "socket.io";
import express from "express";

const httpServer = createServer();
const io = new Server(httpServer, {
    cors: {
        origin: "http://localhost:8080",
    }
});

io.on("connection", (socket) => {
    console.log("server connected");
});

httpServer.listen(3000);