const { createServer } = require("node:http");
const { Server } = require("socket.io");
const express = require("express");
const cors = require("cors");

const PORT = process.env.PORT || 3333;
const rooms = new Map();

const app = express();

app.use(cors({ origin: "*" }));
app.use(express.json());

const server = createServer(app);
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

app.post("/chat", (req, res) => {
    let room_id = req.body.room_id.trim();

    if (!rooms.has(room_id)) {
        rooms.set(
            room_id,
            new Map([
                ["users", new Map()],
                ["messages", []]
            ])
        );
    }

    res.send();
});

app.get("/chat/:room_id", (req, res) => {
    const { room_id } = req.params;

    const response = rooms.has(room_id)
        ? {
              users: [...rooms.get(room_id).get("users").values()],
              messages: [...rooms.get(room_id).get("messages").values()]
          }
        : {
              users: [],
              messages: []
          };
    res.json(response);
});

io.on("connection", (socket) => {
    socket.on("join", ({ room_id, user_name }) => {
        room_id = room_id.trim();
        user_name = user_name.trim();

        socket.join(room_id);
        rooms.get(room_id).get("users").set(socket.id, user_name);
        const users = [...rooms.get(room_id).get("users").values()];
        io.to(room_id).emit("users-online", users);
    });

    socket.on("send-message", ({ message, room_id }) => {
        const user_name = rooms.get(room_id).get("users").get(socket.id);
        const messageFromUser = {
            user_name,
            message
        };

        rooms.get(room_id).get("messages").push(messageFromUser);
        const messages = rooms.get(room_id).get("messages");

        io.to(room_id).emit("new-message", messages);
    });

    socket.on("disconnect", () => {
        rooms.forEach((value, room_id) => {
            if (value.get("users").delete(socket.id)) {
                const users = [...value.get("users").values()];
                socket.to(room_id).emit("user-disconnect", users);
            }
        });
        console.log("Пользователь отключился", socket.id);
    });

    console.log("Пользователь подключен", socket.id);
});

server.listen(PORT, () => {
    console.log(`Сервер запущен на порте ${PORT}.`);
});
