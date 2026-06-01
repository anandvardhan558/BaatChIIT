import axios from "axios";
import httpStatus from "http-status";
import { createContext, useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import server from "../environment";


export const AuthContext = createContext({});

const client = axios.create({
    baseURL: `${server}/api/v1/users`
})

client.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});


export const AuthProvider = ({ children }) => {

    const [userData, setUserData] = useState(null);
    const [authLoading, setAuthLoading] = useState(true);


    const router = useNavigate();

    const persistSession = (payload) => {
        localStorage.setItem("token", payload.token);
        setUserData(payload.user);
    }

    const handleRegister = async (name, username, password) => {
        try {
            let request = await client.post("/register", {
                name: name,
                username: username,
                password: password
            })


            if (request.status === httpStatus.CREATED) {
                persistSession(request.data);
                return request.data;
            }
        } catch (err) {
            throw err;
        }
    }

    const handleLogin = async (username, password) => {
        try {
            let request = await client.post("/login", {
                username: username,
                password: password
            });

            if (request.status === httpStatus.OK) {
                persistSession(request.data);
                return request.data;
            }
        } catch (err) {
            throw err;
        }
    }

    const verifySession = useCallback(async () => {
        const token = localStorage.getItem("token");
        if (!token) {
            setUserData(null);
            setAuthLoading(false);
            return false;
        }

        try {
            const request = await client.get("/me");
            setUserData(request.data.user);
            setAuthLoading(false);
            return true;
        } catch (err) {
            localStorage.removeItem("token");
            setUserData(null);
            setAuthLoading(false);
            return false;
        }
    }, []);

    useEffect(() => {
        verifySession();
    }, [verifySession]);

    const logout = () => {
        localStorage.removeItem("token");
        setUserData(null);
        router("/auth");
    }

    const getHistoryOfUser = async () => {
        try {
            let request = await client.get("/get_all_activity");
            return request.data
        } catch
         (err) {
            throw err;
        }
    }

    const addToUserHistory = async (meetingCode) => {
        try {
            let request = await client.post("/add_to_activity", {
                meeting_code: meetingCode
            });
            return request
        } catch (e) {
            throw e;
        }
    }


    const data = {
        userData,
        setUserData,
        authLoading,
        verifySession,
        logout,
        addToUserHistory,
        getHistoryOfUser,
        handleRegister,
        handleLogin
    }

    return (
        <AuthContext.Provider value={data}>
            {children}
        </AuthContext.Provider>
    )

}
