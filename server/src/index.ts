import { createServer } from "http";
import { Server } from "socket.io";
import express from "express";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { /* options */});

io.on("connection", (socket) => {
    console.log("server connected");
});

httpServer.listen(3000);