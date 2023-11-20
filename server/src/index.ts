import { createServer } from "http";
import { Server } from "socket.io";
import express from "express";
import sharp from "sharp";

const canvas_array = new Array(3000000).fill(0);

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5173",
  },
});

io.on("connection", (socket) => {
  console.log("client connected");

  socket.on("getboard", async () => {
    const input = Uint8Array.from(canvas_array);

    const image = await sharp(input, {
      raw: {
        width: 1000,
        height: 1000,
        channels: 3,
      },
    })
      .png()
      .toBuffer();
    socket.emit("giveboard", image);
  });

  socket.on("drawtile", (x1, y1) => {
    const location = (y1 * 1000 + x1) * 3;
    canvas_array[location] = 0xff;
    canvas_array[location + 1] = 0x00;
    canvas_array[location + 2] = 0x00;
    socket.broadcast.emit("drawtile", x1, y1);
    console.log("Draw tile");
  });

  socket.on("Hello", () => {
    console.log("Received");
    socket.emit("reply");
  });
});

httpServer.listen(8000);
