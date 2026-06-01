import { Server } from "socket.io"

const rooms = new Map();
const messages = new Map();
const socketToRoom = new Map();

const getRoom = (roomId) => {
    if (!rooms.has(roomId)) {
        rooms.set(roomId, new Map());
    }

    return rooms.get(roomId);
}

const getParticipantList = (roomId) => {
    const room = rooms.get(roomId);
    if (!room) return [];

    return Array.from(room.values());
}

const emitParticipants = (io, roomId) => {
    io.to(roomId).emit("participants-updated", getParticipantList(roomId));
}

const leaveRoom = (io, socket) => {
    const roomId = socketToRoom.get(socket.id);
    if (!roomId) return;

    const room = rooms.get(roomId);
    const participant = room?.get(socket.id);

    if (room) {
        room.delete(socket.id);
        if (room.size === 0) {
            rooms.delete(roomId);
            messages.delete(roomId);
        }
    }

    socket.leave(roomId);
    socketToRoom.delete(socket.id);

    socket.to(roomId).emit("user-left", socket.id, participant);
    socket.to(roomId).emit("room-notification", {
        type: "leave",
        message: `${participant?.name || "A participant"} left the meeting`,
        timestamp: Date.now()
    });
    emitParticipants(io, roomId);
}

export const connectToSocket = (server, allowedOrigins = []) => {
    const io = new Server(server, {
        cors: {
            origin(origin, callback) {
                if (!origin || allowedOrigins.includes(origin)) {
                    return callback(null, true);
                }

                return callback(new Error("Not allowed by CORS"));
            },
            methods: ["GET", "POST"],
            allowedHeaders: ["Content-Type", "Authorization"],
            credentials: true
        },
        pingTimeout: 30000,
        pingInterval: 10000
    });

    io.on("connection", (socket) => {
        socket.on("join-call", (payload) => {
            const roomId = typeof payload === "string" ? payload : payload?.roomId;
            const name = typeof payload === "string" ? "Guest" : payload?.name;

            if (!roomId) return;

            leaveRoom(io, socket);

            const room = getRoom(roomId);
            const participant = {
                id: socket.id,
                name: name?.trim() || "Guest",
                joinedAt: Date.now(),
                audioEnabled: true,
                videoEnabled: true,
                screenSharing: false,
                connectionStatus: "connected",
                isSpeaking: false
            };

            room.set(socket.id, participant);
            socketToRoom.set(socket.id, roomId);
            socket.join(roomId);

            const clients = Array.from(room.keys());
            io.to(roomId).emit("user-joined", socket.id, clients, getParticipantList(roomId));
            socket.to(roomId).emit("room-notification", {
                type: "join",
                message: `${participant.name} joined the meeting`,
                timestamp: Date.now()
            });
            emitParticipants(io, roomId);

            const roomMessages = messages.get(roomId) || [];
            roomMessages.forEach((message) => {
                socket.emit("chat-message", message.data, message.sender, message.senderId, message.timestamp);
            });
        })

        socket.on("signal", (toId, message) => {
            io.to(toId).emit("signal", socket.id, message);
        })

        socket.on("chat-message", (data, sender) => {
            const roomId = socketToRoom.get(socket.id);
            if (!roomId || !data?.trim()) return;

            const roomMessages = messages.get(roomId) || [];
            const message = {
                data: data.trim(),
                sender: sender?.trim() || "Guest",
                senderId: socket.id,
                timestamp: Date.now()
            };

            roomMessages.push(message);
            messages.set(roomId, roomMessages.slice(-100));

            io.to(roomId).emit("chat-message", message.data, message.sender, message.senderId, message.timestamp);
        })

        socket.on("participant-media-state", (state = {}) => {
            const roomId = socketToRoom.get(socket.id);
            const room = rooms.get(roomId);
            const participant = room?.get(socket.id);
            if (!roomId || !participant) return;

            const updatedParticipant = {
                ...participant,
                audioEnabled: Boolean(state.audioEnabled),
                videoEnabled: Boolean(state.videoEnabled),
                screenSharing: Boolean(state.screenSharing)
            };

            room.set(socket.id, updatedParticipant);
            socket.to(roomId).emit("participant-media-state", socket.id, updatedParticipant);
            emitParticipants(io, roomId);
        })

        socket.on("speaker-state", (isSpeaking) => {
            const roomId = socketToRoom.get(socket.id);
            const room = rooms.get(roomId);
            const participant = room?.get(socket.id);
            if (!roomId || !participant || participant.isSpeaking === Boolean(isSpeaking)) return;

            const updatedParticipant = { ...participant, isSpeaking: Boolean(isSpeaking) };
            room.set(socket.id, updatedParticipant);
            socket.to(roomId).emit("speaker-state", socket.id, updatedParticipant.isSpeaking);
            emitParticipants(io, roomId);
        })

        socket.on("disconnect", () => {
            leaveRoom(io, socket);
        })
    })

    return io;
}
