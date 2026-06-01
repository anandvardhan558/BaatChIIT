import React, { useContext, useState } from 'react'
import withAuth from '../utils/withAuth'
import { useNavigate } from 'react-router-dom'
import "../App.css";
import { Alert, Button, IconButton, Snackbar, TextField } from '@mui/material';
import RestoreIcon from '@mui/icons-material/Restore';
import { AuthContext } from '../contexts/AuthContext';
import LogoutIcon from '@mui/icons-material/Logout';
import VideoCallIcon from '@mui/icons-material/VideoCall';

function HomeComponent() {


    let navigate = useNavigate();
    const [meetingCode, setMeetingCode] = useState("");
    const [error, setError] = useState("");
    const [isJoining, setIsJoining] = useState(false);


    const {addToUserHistory, logout, userData} = useContext(AuthContext);
    let handleJoinVideoCall = async () => {
        const normalizedCode = meetingCode.trim();
        if (!normalizedCode) {
            setError("Enter a meeting code to join");
            return;
        }

        setIsJoining(true);
        setError("");

        try {
            await addToUserHistory(normalizedCode)
            navigate(`/${normalizedCode}`)
        } catch (err) {
            setError(err.response?.data?.message || "Could not join meeting");
        } finally {
            setIsJoining(false);
        }
    }

    return (
        <>

            <div className="navBar">

                <div style={{ display: "flex", alignItems: "center" }}>

                    <h2>BaatChIIT Meet</h2>
                </div>

                <div style={{ display: "flex", alignItems: "center" }}>
                    <IconButton onClick={
                        () => {
                            navigate("/history")
                        }
                    }>
                        <RestoreIcon />
                    </IconButton>
                    <p className="navLabel">History</p>

                    <Button startIcon={<LogoutIcon />} onClick={logout}>
                        Logout
                    </Button>
                </div>


            </div>


            <div className="meetContainer">
                <div className="leftPanel">
                    <div>
                        <p className="eyebrow">Signed in as {userData?.name || "Guest"}</p>
                        <h1>Start or join a secure video room.</h1>
                        <p className="homeCopy">Share a link, present your screen, and keep meeting history synced across devices.</p>

                        <div className="joinControls">

                            <TextField value={meetingCode} onChange={e => setMeetingCode(e.target.value)} id="outlined-basic" label="Meeting Code" variant="outlined" />
                            <Button startIcon={<VideoCallIcon />} disabled={isJoining} onClick={handleJoinVideoCall} variant='contained'>
                                {isJoining ? "Joining..." : "Join"}
                            </Button>

                        </div>
                    </div>
                </div>
                <div className='rightPanel'>
                    <img srcSet='/logo3.png' alt="" />
                </div>
            </div>

            <Snackbar open={Boolean(error)} autoHideDuration={4000} onClose={() => setError("")}>
                <Alert severity="error" onClose={() => setError("")}>{error}</Alert>
            </Snackbar>
        </>
    )
}


export default withAuth(HomeComponent)
