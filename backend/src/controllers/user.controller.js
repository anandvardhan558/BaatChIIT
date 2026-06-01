import httpStatus from "http-status";
import { User } from "../models/user.model.js";
import bcrypt from "bcrypt"
import { Meeting } from "../models/meeting.model.js";
import { createJwt } from "../utils/jwt.js";
import { getJwtExpirySeconds } from "../config/env.js";

const sanitizeUser = (user) => ({
    id: user._id,
    name: user.name,
    username: user.username
});

const issueToken = (user) => createJwt(
    {
        sub: user._id.toString(),
        username: user.username,
        name: user.name
    },
    process.env.JWT_SECRET,
    getJwtExpirySeconds()
);

const login = async (req, res) => {

    const { username = "", password = "" } = req.body;
    const normalizedUsername = username.trim().toLowerCase();

    if (!normalizedUsername || !password) {
        return res.status(httpStatus.BAD_REQUEST).json({ message: "Username and password are required" })
    }

    try {
        const user = await User.findOne({ username: normalizedUsername });
        if (!user) {
            return res.status(httpStatus.UNAUTHORIZED).json({ message: "Invalid username or password" })
        }


        let isPasswordCorrect = await bcrypt.compare(password, user.password)

        if (isPasswordCorrect) {
            const token = issueToken(user);

            return res.status(httpStatus.OK).json({ token, user: sanitizeUser(user) })
        } else {
            return res.status(httpStatus.UNAUTHORIZED).json({ message: "Invalid username or password" })
        }

    } catch (e) {
        return res.status(500).json({ message: "Something went wrong while logging in" })
    }
}


const register = async (req, res) => {
    const { name = "", username = "", password = "" } = req.body;
    const normalizedName = name.trim();
    const normalizedUsername = username.trim().toLowerCase();

    if (!normalizedName || !normalizedUsername || !password) {
        return res.status(httpStatus.BAD_REQUEST).json({ message: "Name, username and password are required" });
    }

    if (password.length < 6) {
        return res.status(httpStatus.BAD_REQUEST).json({ message: "Password must be at least 6 characters" });
    }


    try {
        const existingUser = await User.findOne({ username: normalizedUsername });
        if (existingUser) {
            return res.status(httpStatus.CONFLICT).json({ message: "User already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({
            name: normalizedName,
            username: normalizedUsername,
            password: hashedPassword
        });

        await newUser.save();

        const token = issueToken(newUser);

        res.status(httpStatus.CREATED).json({
            message: "User registered",
            token,
            user: sanitizeUser(newUser)
        })

    } catch (e) {
        if (e.code === 11000) {
            return res.status(httpStatus.CONFLICT).json({ message: "User already exists" });
        }

        res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: "Something went wrong while registering" })
    }

}


const getUserHistory = async (req, res) => {
    try {
        const meetings = await Meeting.find({ user: req.user._id }).sort({ date: -1 })
        res.json(meetings)
    } catch (e) {
        res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: "Could not fetch meeting history" })
    }
}

const addToHistory = async (req, res) => {
    const { meeting_code = "" } = req.body;
    const meetingCode = meeting_code.trim();

    if (!meetingCode) {
        return res.status(httpStatus.BAD_REQUEST).json({ message: "Meeting code is required" });
    }

    try {
        const newMeeting = new Meeting({
            user: req.user._id,
            user_id: req.user.username,
            meetingCode
        })

        await newMeeting.save();

        res.status(httpStatus.CREATED).json({ message: "Added code to history" })
    } catch (e) {
        res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: "Could not save meeting history" })
    }
}

const getCurrentUser = async (req, res) => {
    res.status(httpStatus.OK).json({ user: sanitizeUser(req.user) });
}

export { login, register, getUserHistory, addToHistory, getCurrentUser }
