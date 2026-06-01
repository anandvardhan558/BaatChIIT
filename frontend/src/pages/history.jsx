import React, { useContext, useEffect, useState } from 'react'
import { AuthContext } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom';
import Card from '@mui/material/Card';
import Box from '@mui/material/Box';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import HomeIcon from '@mui/icons-material/Home';
import VideoCallIcon from '@mui/icons-material/VideoCall';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

import { Alert, Button, IconButton, Skeleton, Snackbar } from '@mui/material';
import withAuth from '../utils/withAuth';
function History() {


    const { getHistoryOfUser } = useContext(AuthContext);

    const [meetings, setMeetings] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    const [toast, setToast] = useState("")


    const routeTo = useNavigate();

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const history = await getHistoryOfUser();
                setMeetings(history);
            } catch (err) {
                setError(err.response?.data?.message || "Unable to load meeting history")
            } finally {
                setLoading(false)
            }
        }

        fetchHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    let formatDate = (dateString) => {

        const date = new Date(dateString);
        const day = date.getDate().toString().padStart(2, "0");
        const month = (date.getMonth() + 1).toString().padStart(2, "0")
        const year = date.getFullYear();

        return `${day}/${month}/${year}`

    }

    const copyMeetingCode = async (meetingCode) => {
        try {
            await navigator.clipboard.writeText(meetingCode);
            setToast("Meeting code copied");
        } catch {
            setToast("Could not copy meeting code");
        }
    }

    return (
        <div className="historyPage">

            <div className="historyHeader">
                <div>
                    <Typography variant="overline" color="primary" sx={{ fontWeight: 900 }}>Activity</Typography>
                    <Typography variant="h4" sx={{ fontWeight: 900 }}>Meeting history</Typography>
                    <Typography color="text.secondary">Rejoin recent rooms or copy a meeting code.</Typography>
                </div>
                <IconButton onClick={() => routeTo("/home")} aria-label="Go home">
                    <HomeIcon />
                </IconButton>
            </div>
            {error ? <Alert severity="error">{error}</Alert> : null}
            {!loading && !error && meetings.length === 0 ? (
                <div className="emptyState">
                    <VideoCallIcon />
                    <h2>No meetings yet</h2>
                    <p>Your joined rooms will appear here after your first call.</p>
                    <Button variant="contained" onClick={() => routeTo("/home")}>Start a meeting</Button>
                </div>
            ) : null}
            <Box className="historyGrid">
                {
                loading ? Array.from({ length: 6 }).map((_, index) => (
                    <Card key={`history-skeleton-${index}`} variant="outlined" className="historyCard">
                        <CardContent>
                            <Skeleton width="70%" height={28} />
                            <Skeleton width="45%" height={22} />
                            <Skeleton width="90%" height={40} />
                        </CardContent>
                    </Card>
                )) : meetings.length !== 0 ? meetings.map((e) => {
                    return (
                            <Card key={e._id} variant="outlined" className="historyCard">
                                <CardContent>
                                    <Typography variant="overline" color="primary" sx={{ fontWeight: 900 }}>Meeting code</Typography>
                                    <Typography variant="h6" sx={{ fontWeight: 900 }} gutterBottom>{e.meetingCode}</Typography>

                                    <Typography sx={{ mb: 1.5 }} color="text.secondary">
                                        Date: {formatDate(e.date)}
                                    </Typography>

                                    <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                                        <Button size="small" variant="contained" startIcon={<VideoCallIcon />} onClick={() => routeTo(`/${e.meetingCode}`)}>Join</Button>
                                        <Button size="small" variant="outlined" startIcon={<ContentCopyIcon />} onClick={() => copyMeetingCode(e.meetingCode)}>Copy</Button>
                                    </Box>
                                </CardContent>
                            </Card>
                    )
                }) : <></>

                }
            </Box>

            <Snackbar open={Boolean(toast)} autoHideDuration={3000} message={toast} onClose={() => setToast("")} />

        </div>
    )
}

export default withAuth(History)
