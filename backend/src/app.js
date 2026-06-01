import express from "express";
import { createServer } from "node:http";
import mongoose from "mongoose";
import { connectToSocket } from "./controllers/socketManager.js";
import cors from "cors";
import userRoutes from "./routes/users.routes.js";
import { getAllowedOrigins, validateEnv } from "./config/env.js";



const app = express();
const server = createServer(app);
const allowedOrigins = getAllowedOrigins();
console.log("Allowed Origins:", allowedOrigins);

connectToSocket(server, allowedOrigins);

app.set("port", process.env.PORT || 8000);

app.use(
    cors({
        
        // console.log("Request Origin:", origin);

        origin(origin, callback) {
            if (!origin || allowedOrigins.includes(origin)) {
                return callback(null, true);
            }

            return callback(new Error("Not allowed by CORS"));
        },
        credentials: true,
        methods: ["GET", "POST", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
    })
);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ limit: "1mb", extended: true }));

app.use("/api/v1/users", userRoutes);
app.get("/health", (req, res) => {
    res.status(200).json({ status: "ok" });
});

const start = async () => {
    validateEnv();

    const connectionDb = await mongoose.connect(process.env.MONGO_URI, {
        serverSelectionTimeoutMS: 10000,
    });

    console.log(`MongoDB connected: ${connectionDb.connection.host}`);
    server.listen(app.get("port"), () => {
        console.log(`Listening on port ${app.get("port")}`);
    });
}

start().catch((error) => {
    console.error("Failed to start server:", error.message);
    process.exit(1);
});
