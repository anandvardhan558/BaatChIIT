import httpStatus from "http-status";
import { User } from "../models/user.model.js";
import { verifyJwt } from "../utils/jwt.js";

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || "";
    const [scheme, token] = authHeader.split(" ");

    if (scheme !== "Bearer" || !token) {
      return res.status(httpStatus.UNAUTHORIZED).json({ message: "Authentication required" });
    }

    const payload = verifyJwt(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.sub).select("-password");

    if (!user) {
      return res.status(httpStatus.UNAUTHORIZED).json({ message: "Invalid session" });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(httpStatus.UNAUTHORIZED).json({ message: "Invalid or expired token" });
  }
};
