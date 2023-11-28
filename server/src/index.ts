import { createServer } from "http";
import { Server } from "socket.io";
import sharp from "sharp";
import { pool } from "./database";

const canvas_array = new Array(3000000).fill(0);

pool.query("SELECT * FROM tile", (err, res) => {
  if (err) {
    console.log(err);
  } else {
    res.rows.forEach((row) => {
      const location = row.id * 3;
      const arr: string[] = [1, 3, 5].map(function (o) {
        return row.colour.slice(o + 1, o + 3);
      });
      canvas_array[location] = parseInt(arr[0], 16);
      canvas_array[location + 1] = parseInt(arr[1], 16);
      canvas_array[location + 2] = parseInt(arr[2], 16);
    });
  }
});

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

  socket.on("drawtile", async (x1, y1, hex) => {
    const arr: string[] = [1, 3, 5].map(function (o) {
      return hex.slice(o + 1, o + 3);
    });
    const location = (y1 * 1000 + x1) * 3;
    canvas_array[location] = parseInt(arr[0], 16);
    canvas_array[location + 1] = parseInt(arr[1], 16);
    canvas_array[location + 2] = parseInt(arr[2], 16);
    socket.broadcast.emit("drawtile", x1, y1, hex);

    const { rows } = await pool.query(
      "INSERT INTO TILE VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET colour = $2",
      [y1 * 1000 + x1, hex]
    );

    console.log("Draw tile");
    console.log(arr[0], arr[1], arr[2]);
  });

  socket.on("Hello", () => {
    console.log("Received");
    socket.emit("reply");
  });
});

httpServer.listen(8000);
