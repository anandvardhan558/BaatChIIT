import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import io from "socket.io-client";
import {
    Alert,
    Badge,
    Button,
    Chip,
    IconButton,
    LinearProgress,
    Snackbar,
    TextField,
    Tooltip
} from '@mui/material';
import VideocamIcon from '@mui/icons-material/Videocam';
import VideocamOffIcon from '@mui/icons-material/VideocamOff'
import CallEndIcon from '@mui/icons-material/CallEnd'
import MicIcon from '@mui/icons-material/Mic'
import MicOffIcon from '@mui/icons-material/MicOff'
import ScreenShareIcon from '@mui/icons-material/ScreenShare';
import StopScreenShareIcon from '@mui/icons-material/StopScreenShare'
import ChatIcon from '@mui/icons-material/Chat'
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import PushPinIcon from '@mui/icons-material/PushPin';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';
import GridViewIcon from '@mui/icons-material/GridView';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import GraphicEqIcon from '@mui/icons-material/GraphicEq';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import CloseIcon from '@mui/icons-material/Close';
import styles from "../styles/videoComponent.module.css";
import server from '../environment';
import { AuthContext } from '../contexts/AuthContext';

const peerConfigConnections = {
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    bundlePolicy: "max-bundle",
    rtcpMuxPolicy: "require",
    iceCandidatePoolSize: 4
}

const cameraConstraints = {
    video: {
        width: { ideal: 1280, max: 1280 },
        height: { ideal: 720, max: 720 },
        frameRate: { ideal: 30, max: 30 }
    },
    audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
    }
}

const screenConstraints = {
    video: {
        cursor: "always",
        frameRate: { ideal: 30, max: 30 },
        width: { ideal: 1920, max: 1920 },
        height: { ideal: 1080, max: 1080 }
    },
    audio: false
}

const getRoomId = () => window.location.pathname.replace(/^\/+/, "") || "meeting";

const formatDuration = (seconds) => {
    const hrs = Math.floor(seconds / 3600).toString().padStart(2, "0");
    const mins = Math.floor((seconds % 3600) / 60).toString().padStart(2, "0");
    const secs = Math.floor(seconds % 60).toString().padStart(2, "0");
    return hrs === "00" ? `${mins}:${secs}` : `${hrs}:${mins}:${secs}`;
}

const VideoTile = React.memo(function VideoTile({
    tile,
    isPinned,
    isLocal,
    onPin,
    onMoveLeft,
    onMoveRight
}) {
    const videoElement = useCallback((node) => {
        if (node && tile.stream && node.srcObject !== tile.stream) {
            node.srcObject = tile.stream;
        }
    }, [tile.stream]);

    return (
        <div className={`${styles.videoTile} ${tile.isSpeaking ? styles.speakingTile : ""} ${isPinned ? styles.pinnedTile : ""}`}>
            {tile.stream ? (
                <video ref={videoElement} autoPlay playsInline muted={isLocal} />
            ) : (
                <div className={styles.emptyVideo}>
                    <span>{tile.name?.charAt(0)?.toUpperCase() || "G"}</span>
                </div>
            )}

            <div className={styles.tileTopBar}>
                {tile.screenSharing ? <Chip size="small" color="primary" label="Presenting" /> : null}
                {tile.isSpeaking ? <Chip size="small" icon={<GraphicEqIcon />} label="Speaking" /> : null}
            </div>

            <div className={styles.tileFooter}>
                <div>
                    <strong>{tile.name}</strong>
                    {isLocal ? <span>You</span> : null}
                </div>
                <div className={styles.tileIndicators}>
                    {tile.audioEnabled ? <MicIcon /> : <MicOffIcon />}
                    {tile.videoEnabled || tile.screenSharing ? <VideocamIcon /> : <VideocamOffIcon />}
                </div>
            </div>

            <div className={styles.tileActions}>
                <Tooltip title={isPinned ? "Unpin" : "Pin"}>
                    <IconButton size="small" onClick={() => onPin(tile.id)}>
                        {isPinned ? <PushPinIcon /> : <PushPinOutlinedIcon />}
                    </IconButton>
                </Tooltip>
                <Tooltip title="Move left">
                    <IconButton size="small" onClick={() => onMoveLeft(tile.id)}>
                        <SwapHorizIcon />
                    </IconButton>
                </Tooltip>
                <Tooltip title="Move right">
                    <IconButton size="small" onClick={() => onMoveRight(tile.id)}>
                        <SwapHorizIcon />
                    </IconButton>
                </Tooltip>
            </div>
        </div>
    )
});

export default function VideoMeetComponent() {
    const { userData } = useContext(AuthContext);
    const roomId = useMemo(getRoomId, []);
    const displayRoomName = decodeURIComponent(roomId);

    const socketRef = useRef(null);
    const socketIdRef = useRef(null);
    const localVideoRef = useRef(null);
    const localStreamRef = useRef(null);
    const cameraStreamRef = useRef(null);
    const screenStreamRef = useRef(null);
    const peersRef = useRef({});
    const audioAnalyserRef = useRef(null);
    const speakingRef = useRef(false);
    const remoteVideosRef = useRef([]);
    const showChatRef = useRef(false);
    const localMediaRef = useRef({
        audioEnabled: true,
        videoEnabled: true,
        screenSharing: false
    });

    const [stage, setStage] = useState("lobby");
    const [username, setUsername] = useState(userData?.name || "");
    const [isJoining, setIsJoining] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState("idle");
    const [mediaError, setMediaError] = useState("");
    const [toast, setToast] = useState(null);
    const [messages, setMessages] = useState([]);
    const [message, setMessage] = useState("");
    const [newMessages, setNewMessages] = useState(0);
    const [showChat, setShowChat] = useState(false);
    const [showParticipants, setShowParticipants] = useState(false);
    const [participants, setParticipants] = useState([]);
    const [remoteVideos, setRemoteVideos] = useState([]);
    const [tileOrder, setTileOrder] = useState(["local"]);
    const [pinnedId, setPinnedId] = useState(null);
    const [tileDensity, setTileDensity] = useState("comfortable");
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [localMedia, setLocalMedia] = useState({
        audioEnabled: true,
        videoEnabled: true,
        screenSharing: false
    });
    const [localSpeaking, setLocalSpeaking] = useState(false);

    useEffect(() => {
        setUsername((current) => current || userData?.name || "");
    }, [userData]);

    useEffect(() => {
        showChatRef.current = showChat;
    }, [showChat]);

    useEffect(() => {
        localMediaRef.current = localMedia;
    }, [localMedia]);

    const setLocalVideoStream = useCallback((stream) => {
        if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream || null;
        }
    }, []);

    const updateRemoteVideos = useCallback((updater) => {
        setRemoteVideos((current) => {
            const next = typeof updater === "function" ? updater(current) : updater;
            remoteVideosRef.current = next;
            return next;
        });
    }, []);

    const updateParticipantMedia = useCallback((id, updates) => {
        setParticipants((current) => current.map((participant) =>
            participant.id === id ? { ...participant, ...updates } : participant
        ));
        updateRemoteVideos((current) => current.map((video) =>
            video.socketId === id ? { ...video, ...updates } : video
        ));
    }, [updateRemoteVideos]);

    const stopStream = (stream) => {
        stream?.getTracks().forEach((track) => track.stop());
    }

    const tuneSender = async (sender, isScreenSharing = false) => {
        if (!sender?.getParameters) return;

        const parameters = sender.getParameters();
        parameters.encodings = parameters.encodings?.length ? parameters.encodings : [{}];
        parameters.encodings[0].maxBitrate = isScreenSharing ? 2500000 : 1200000;
        parameters.encodings[0].maxFramerate = isScreenSharing ? 30 : 24;

        try {
            await sender.setParameters(parameters);
        } catch {
            // Some browsers reject sender parameter changes until negotiation completes.
        }
    }

    const negotiateConnection = useCallback(async (peerId) => {
        const connection = peersRef.current[peerId];
        if (!connection || connection.signalingState !== "stable" || !socketRef.current) return;

        try {
            const offer = await connection.createOffer();
            await connection.setLocalDescription(offer);
            socketRef.current.emit("signal", peerId, JSON.stringify({ sdp: connection.localDescription }));
        } catch (error) {
            setToast({ severity: "error", message: "Unable to negotiate video connection." });
        }
    }, []);

    const addLocalTracks = useCallback((connection) => {
        const stream = localStreamRef.current;
        if (!stream) return;

        const existingTrackIds = connection.getSenders().map((sender) => sender.track?.id);
        stream.getTracks().forEach((track) => {
            if (!existingTrackIds.includes(track.id)) {
                const sender = connection.addTrack(track, stream);
                tuneSender(sender, localMedia.screenSharing);
            }
        });
    }, [localMedia.screenSharing]);

    const createPeerConnection = useCallback((peerId) => {
        if (peersRef.current[peerId]) return peersRef.current[peerId];

        const connection = new RTCPeerConnection(peerConfigConnections);
        peersRef.current[peerId] = connection;

        connection.onicecandidate = (event) => {
            if (event.candidate && socketRef.current) {
                socketRef.current.emit("signal", peerId, JSON.stringify({ ice: event.candidate }));
            }
        };

        connection.ontrack = (event) => {
            const [stream] = event.streams;
            const participant = participants.find((item) => item.id === peerId);

            updateRemoteVideos((current) => {
                const existing = current.find((item) => item.socketId === peerId);
                if (existing) {
                    return current.map((item) =>
                        item.socketId === peerId ? { ...item, stream, name: participant?.name || item.name } : item
                    );
                }

                return [
                    ...current,
                    {
                        socketId: peerId,
                        stream,
                        name: participant?.name || "Participant",
                        audioEnabled: true,
                        videoEnabled: true,
                        screenSharing: false,
                        isSpeaking: false
                    }
                ];
            });

            setTileOrder((current) => current.includes(peerId) ? current : [...current, peerId]);
        };

        connection.onconnectionstatechange = () => {
            updateParticipantMedia(peerId, { connectionStatus: connection.connectionState });
        };

        addLocalTracks(connection);
        return connection;
    }, [addLocalTracks, participants, updateParticipantMedia, updateRemoteVideos]);

    const replaceOutgoingVideoTrack = useCallback(async (track, stream, isScreenSharing) => {
        const replacementTasks = Object.values(peersRef.current).map(async (connection) => {
            const sender = connection.getSenders().find((item) => item.track?.kind === "video");
            if (sender) {
                await sender.replaceTrack(track);
                await tuneSender(sender, isScreenSharing);
            }
        });

        await Promise.allSettled(replacementTasks);
        localStreamRef.current = stream;
        setLocalVideoStream(stream);
    }, [setLocalVideoStream]);

    const emitMediaState = useCallback((nextState) => {
        socketRef.current?.emit("participant-media-state", nextState);
    }, []);

    const initializeMedia = useCallback(async () => {
        setMediaError("");

        if (!navigator.mediaDevices?.getUserMedia) {
            setMediaError("This browser does not support camera and microphone access.");
            return null;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia(cameraConstraints);
            cameraStreamRef.current = stream;
            localStreamRef.current = stream;
            setLocalVideoStream(stream);
            setLocalMedia({ audioEnabled: true, videoEnabled: true, screenSharing: false });
            return stream;
        } catch (error) {
            const message = error.name === "NotAllowedError"
                ? "Camera or microphone permission was denied. Allow access in your browser settings and try again."
                : "Could not start your camera or microphone. Check that no other app is using them.";
            setMediaError(message);
            setLocalMedia({ audioEnabled: false, videoEnabled: false, screenSharing: false });
            return null;
        }
    }, [setLocalVideoStream]);

    useEffect(() => {
        initializeMedia();

        return () => {
            Object.values(peersRef.current).forEach((connection) => connection.close());
            peersRef.current = {};
            socketRef.current?.disconnect();
            stopStream(localStreamRef.current);
            stopStream(screenStreamRef.current);
            audioAnalyserRef.current?.context?.close?.();
        };
    }, [initializeMedia]);

    useEffect(() => {
        if (stage !== "meeting") return;

        const timer = setInterval(() => {
            setElapsedSeconds((seconds) => seconds + 1);
        }, 1000);

        return () => clearInterval(timer);
    }, [stage]);

    const startVoiceActivityDetection = useCallback(() => {
        const audioTrack = localStreamRef.current?.getAudioTracks()[0];
        if (!audioTrack || audioAnalyserRef.current) return;

        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return;

        const context = new AudioContextClass();
        const source = context.createMediaStreamSource(new MediaStream([audioTrack]));
        const analyser = context.createAnalyser();
        const data = new Uint8Array(analyser.frequencyBinCount);

        analyser.fftSize = 512;
        source.connect(analyser);
        audioAnalyserRef.current = { context, analyser, data, frame: null };

        const tick = () => {
            analyser.getByteFrequencyData(data);
            const average = data.reduce((total, value) => total + value, 0) / data.length;
            const isSpeaking = localMediaRef.current.audioEnabled && average > 18;

            if (speakingRef.current !== isSpeaking) {
                speakingRef.current = isSpeaking;
                setLocalSpeaking(isSpeaking);
                socketRef.current?.emit("speaker-state", isSpeaking);
                updateParticipantMedia("local", { isSpeaking });
            }

            audioAnalyserRef.current.frame = requestAnimationFrame(tick);
        };

        tick();
    }, [updateParticipantMedia]);

    const handleSignal = useCallback(async (fromId, rawMessage) => {
        const signal = JSON.parse(rawMessage);
        const connection = createPeerConnection(fromId);

        try {
            if (signal.sdp) {
                await connection.setRemoteDescription(new RTCSessionDescription(signal.sdp));

                if (signal.sdp.type === "offer") {
                    const answer = await connection.createAnswer();
                    await connection.setLocalDescription(answer);
                    socketRef.current?.emit("signal", fromId, JSON.stringify({ sdp: connection.localDescription }));
                }
            }

            if (signal.ice) {
                await connection.addIceCandidate(new RTCIceCandidate(signal.ice));
            }
        } catch (error) {
            setToast({ severity: "error", message: "A participant connection could not be established." });
        }
    }, [createPeerConnection]);

    const connectToSocketServer = useCallback(() => {
        if (socketRef.current?.connected) return;

        const socket = io.connect(server, {
            transports: ["websocket", "polling"],
            reconnectionAttempts: 8,
            reconnectionDelay: 800,
            secure: window.location.protocol === "https:"
        });

        socketRef.current = socket;
        setConnectionStatus("connecting");

        socket.on("connect", () => {
            socketIdRef.current = socket.id;
            setConnectionStatus("connected");
            socket.emit("join-call", { roomId, name: username.trim() || "Guest" });
        });

        socket.on("connect_error", () => {
            setConnectionStatus("error");
            setToast({ severity: "error", message: "Could not connect to the meeting server." });
        });

        socket.on("reconnect_attempt", () => setConnectionStatus("reconnecting"));
        socket.on("disconnect", () => setConnectionStatus("disconnected"));
        socket.on("signal", handleSignal);

        socket.on("user-joined", (joinedId, clients, serverParticipants = []) => {
            setParticipants(serverParticipants);
            serverParticipants.forEach((participant) => {
                updateParticipantMedia(participant.id, participant);
            });

            clients.forEach((clientId) => {
                if (clientId !== socket.id) createPeerConnection(clientId);
            });

            if (joinedId === socket.id) {
                clients.forEach((clientId) => {
                    if (clientId !== socket.id) negotiateConnection(clientId);
                });
            }
        });

        socket.on("participants-updated", (serverParticipants = []) => {
            setParticipants(serverParticipants);
            serverParticipants.forEach((participant) => updateParticipantMedia(participant.id, participant));
        });

        socket.on("participant-media-state", (id, participant) => {
            updateParticipantMedia(id, participant);
        });

        socket.on("speaker-state", (id, isSpeaking) => {
            updateParticipantMedia(id, { isSpeaking });
        });

        socket.on("room-notification", (notification) => {
            setToast({ severity: "info", message: notification.message });
        });

        socket.on("chat-message", (data, sender, senderId, timestamp) => {
            setMessages((current) => [...current, { data, sender, senderId, timestamp: timestamp || Date.now() }]);
            if (senderId !== socket.id && !showChatRef.current) {
                setNewMessages((count) => count + 1);
            }
        });

        socket.on("user-left", (id, participant) => {
            peersRef.current[id]?.close();
            delete peersRef.current[id];
            updateRemoteVideos((current) => current.filter((video) => video.socketId !== id));
            setTileOrder((current) => current.filter((tileId) => tileId !== id));
            setPinnedId((current) => current === id ? null : current);
            setToast({ severity: "info", message: `${participant?.name || "A participant"} left the meeting` });
        });
    }, [
        createPeerConnection,
        handleSignal,
        negotiateConnection,
        roomId,
        updateParticipantMedia,
        updateRemoteVideos,
        username
    ]);

    const joinMeeting = async () => {
        if (!username.trim() || isJoining) return;

        setIsJoining(true);
        let stream = localStreamRef.current;
        if (!stream) {
            stream = await initializeMedia();
        }

        if (!stream) {
            setIsJoining(false);
            return;
        }

        setParticipants([{
            id: "local",
            name: username.trim(),
            joinedAt: Date.now(),
            connectionStatus: "connected",
            isSpeaking: false,
            ...localMedia
        }]);
        setStage("meeting");
        setElapsedSeconds(0);
        connectToSocketServer();
        startVoiceActivityDetection();
        setIsJoining(false);
    }

    const toggleAudio = () => {
        const audioTrack = localStreamRef.current?.getAudioTracks()[0] || cameraStreamRef.current?.getAudioTracks()[0];
        if (!audioTrack) {
            setToast({ severity: "warning", message: "No microphone track is available." });
            return;
        }

        const nextEnabled = !localMedia.audioEnabled;
        audioTrack.enabled = nextEnabled;
        cameraStreamRef.current?.getAudioTracks().forEach((track) => {
            track.enabled = nextEnabled;
        });

        const nextState = { ...localMedia, audioEnabled: nextEnabled };
        setLocalMedia(nextState);
        updateParticipantMedia("local", nextState);
        emitMediaState(nextState);
    }

    const toggleVideo = () => {
        if (localMedia.screenSharing) {
            setToast({ severity: "info", message: "Stop presenting before toggling camera video." });
            return;
        }

        const videoTrack = cameraStreamRef.current?.getVideoTracks()[0];
        if (!videoTrack) {
            setToast({ severity: "warning", message: "No camera track is available." });
            return;
        }

        const nextEnabled = !localMedia.videoEnabled;
        videoTrack.enabled = nextEnabled;
        const nextState = { ...localMedia, videoEnabled: nextEnabled };
        setLocalMedia(nextState);
        updateParticipantMedia("local", nextState);
        emitMediaState(nextState);
    }

    const stopScreenShare = useCallback(async () => {
        const cameraVideoTrack = cameraStreamRef.current?.getVideoTracks()[0];
        if (!cameraVideoTrack) return;

        stopStream(screenStreamRef.current);
        screenStreamRef.current = null;
        const cameraStream = cameraStreamRef.current;
        await replaceOutgoingVideoTrack(cameraVideoTrack, cameraStream, false);

        const nextState = { ...localMedia, screenSharing: false, videoEnabled: cameraVideoTrack.enabled };
        setLocalMedia(nextState);
        updateParticipantMedia("local", nextState);
        emitMediaState(nextState);
    }, [emitMediaState, localMedia, replaceOutgoingVideoTrack, updateParticipantMedia]);

    const startScreenShare = async () => {
        if (!navigator.mediaDevices?.getDisplayMedia) {
            setToast({ severity: "warning", message: "Screen sharing is not supported in this browser." });
            return;
        }

        try {
            const screenStream = await navigator.mediaDevices.getDisplayMedia(screenConstraints);
            const screenTrack = screenStream.getVideoTracks()[0];
            if (!screenTrack) return;

            screenStreamRef.current = screenStream;
            screenTrack.onended = () => {
                stopScreenShare();
            };

            const mixedStream = new MediaStream([
                screenTrack,
                ...(cameraStreamRef.current?.getAudioTracks() || [])
            ]);

            await replaceOutgoingVideoTrack(screenTrack, mixedStream, true);
            const nextState = { ...localMedia, screenSharing: true, videoEnabled: true };
            setLocalMedia(nextState);
            updateParticipantMedia("local", nextState);
            emitMediaState(nextState);
            setToast({ severity: "success", message: "Screen sharing started." });
        } catch (error) {
            setToast({ severity: "error", message: "Screen sharing was cancelled or blocked." });
        }
    }

    const handleScreenShare = () => {
        if (localMedia.screenSharing) {
            stopScreenShare();
        } else {
            startScreenShare();
        }
    }

    const leaveMeeting = () => {
        socketRef.current?.disconnect();
        Object.values(peersRef.current).forEach((connection) => connection.close());
        peersRef.current = {};
        stopStream(localStreamRef.current);
        stopStream(screenStreamRef.current);
        window.location.href = localStorage.getItem("token") ? "/home" : "/";
    }

    const sendMessage = () => {
        const trimmedMessage = message.trim();
        if (!trimmedMessage || !socketRef.current) return;

        socketRef.current.emit("chat-message", trimmedMessage, username.trim() || "Guest");
        setMessage("");
    }

    const copyInviteLink = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            setToast({ severity: "success", message: "Meeting link copied." });
        } catch {
            setToast({ severity: "error", message: "Could not copy the meeting link." });
        }
    }

    const moveTile = (tileId, direction) => {
        setTileOrder((current) => {
            const index = current.indexOf(tileId);
            if (index === -1) return current;

            const nextIndex = direction === "left"
                ? Math.max(0, index - 1)
                : Math.min(current.length - 1, index + 1);
            const next = [...current];
            const [item] = next.splice(index, 1);
            next.splice(nextIndex, 0, item);
            return next;
        });
    }

    const openChat = () => {
        setShowParticipants(false);
        setShowChat((value) => !value);
        setNewMessages(0);
    }

    const openParticipants = () => {
        setShowChat(false);
        setShowParticipants((value) => !value);
    }

    const localParticipant = useMemo(() => ({
        id: "local",
        name: username.trim() || "You",
        stream: localStreamRef.current,
        isLocal: true,
        connectionStatus,
        ...localMedia,
        isSpeaking: localSpeaking
    }), [connectionStatus, localMedia, localSpeaking, username]);

    const remoteTiles = useMemo(() => {
        return remoteVideos.map((video) => {
            const participant = participants.find((item) => item.id === video.socketId);
            return {
                id: video.socketId,
                name: participant?.name || video.name || "Participant",
                stream: video.stream,
                isLocal: false,
                audioEnabled: participant?.audioEnabled ?? video.audioEnabled,
                videoEnabled: participant?.videoEnabled ?? video.videoEnabled,
                screenSharing: participant?.screenSharing ?? video.screenSharing,
                isSpeaking: participant?.isSpeaking ?? video.isSpeaking,
                connectionStatus: participant?.connectionStatus || video.connectionStatus || "connected"
            }
        });
    }, [participants, remoteVideos]);

    const tiles = useMemo(() => {
        const allTiles = [localParticipant, ...remoteTiles];
        const orderedTiles = [...allTiles].sort((a, b) => {
            if (a.id === pinnedId) return -1;
            if (b.id === pinnedId) return 1;

            const aIndex = tileOrder.indexOf(a.id);
            const bIndex = tileOrder.indexOf(b.id);
            return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
        });

        return orderedTiles;
    }, [localParticipant, pinnedId, remoteTiles, tileOrder]);

    const participantCount = Math.max(participants.length, tiles.length);
    const panelOpen = showChat || showParticipants;

    return (
        <div className={styles.videoPage}>
            {stage === "lobby" ? (
                <div className={styles.lobby}>
                    <section className={styles.lobbyPanel}>
                        <p className={styles.roomLabel}>Pre-call lobby</p>
                        <h1>Join {displayRoomName}</h1>
                        <p className={styles.lobbyCopy}>Check your camera and microphone before entering. Your media starts automatically after joining.</p>

                        <TextField
                            fullWidth
                            id="display-name"
                            label="Display name"
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            variant="outlined"
                            inputProps={{ maxLength: 48 }}
                        />

                        {mediaError ? <Alert severity="error">{mediaError}</Alert> : null}

                        <div className={styles.lobbyActions}>
                            <Button size="large" variant="contained" disabled={!username.trim() || isJoining || Boolean(mediaError)} onClick={joinMeeting}>
                                {isJoining ? "Joining..." : "Join meeting"}
                            </Button>
                            <Button size="large" variant="outlined" startIcon={<ContentCopyIcon />} onClick={copyInviteLink}>
                                Copy link
                            </Button>
                        </div>
                    </section>

                    <section className={styles.previewCard}>
                        {!localStreamRef.current && !mediaError ? <LinearProgress className={styles.previewLoading} /> : null}
                        <video ref={localVideoRef} autoPlay muted playsInline></video>
                        <div className={styles.previewFooter}>
                            <span>{mediaError ? "Preview unavailable" : "Camera preview"}</span>
                            <div>
                                {localMedia.audioEnabled ? <MicIcon /> : <MicOffIcon />}
                                {localMedia.videoEnabled ? <VideocamIcon /> : <VideocamOffIcon />}
                            </div>
                        </div>
                    </section>
                </div>
            ) : (
                <div className={`${styles.meetingShell} ${panelOpen ? styles.panelOpen : ""}`}>
                    <main className={styles.meetingMain}>
                        <header className={styles.meetingHeader}>
                            <div>
                                <p>{displayRoomName}</p>
                                <h1>{participantCount} participant{participantCount === 1 ? "" : "s"}</h1>
                            </div>
                            <div className={styles.meetingMeta}>
                                <Chip label={formatDuration(elapsedSeconds)} />
                                <Chip color={connectionStatus === "connected" ? "success" : "warning"} label={connectionStatus} />
                                {localMedia.screenSharing ? <Chip color="primary" label="You are presenting" /> : null}
                            </div>
                        </header>

                        <section className={`${styles.videoGrid} ${styles[tileDensity]} ${pinnedId ? styles.hasPinnedTile : ""}`}>
                            {tiles.map((tile) => (
                                <VideoTile
                                    key={tile.id}
                                    tile={tile}
                                    isLocal={tile.id === "local"}
                                    isPinned={pinnedId === tile.id}
                                    onPin={(id) => setPinnedId((current) => current === id ? null : id)}
                                    onMoveLeft={(id) => moveTile(id, "left")}
                                    onMoveRight={(id) => moveTile(id, "right")}
                                />
                            ))}
                        </section>
                    </main>

                    {panelOpen ? (
                        <aside className={styles.sidePanel}>
                            <div className={styles.panelHeader}>
                                <div>
                                    <p>{showChat ? "Messages" : "Participants"}</p>
                                    <h2>{showChat ? "Meeting chat" : `${participantCount} in call`}</h2>
                                </div>
                                <IconButton onClick={() => { setShowChat(false); setShowParticipants(false); }}>
                                    <CloseIcon />
                                </IconButton>
                            </div>

                            {showChat ? (
                                <>
                                    <div className={styles.chattingDisplay}>
                                        {messages.length !== 0 ? messages.map((item, index) => (
                                            <div className={styles.chatBubble} key={`${item.timestamp}-${index}`}>
                                                <div>
                                                    <strong>{item.sender}</strong>
                                                    <span>{new Date(item.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                                                </div>
                                                <p>{item.data}</p>
                                            </div>
                                        )) : <p className={styles.emptyChat}>No messages yet.</p>}
                                    </div>

                                    <form className={styles.chattingArea} onSubmit={(event) => { event.preventDefault(); sendMessage(); }}>
                                        <TextField fullWidth size="small" value={message} onChange={(e) => setMessage(e.target.value)} label="Message" variant="outlined" />
                                        <Button type="submit" variant='contained' disabled={!message.trim()}>Send</Button>
                                    </form>
                                </>
                            ) : (
                                <div className={styles.participantList}>
                                    {tiles.map((tile) => (
                                        <div className={styles.participantRow} key={`participant-${tile.id}`}>
                                            <div>
                                                <span>{tile.name.charAt(0).toUpperCase()}</span>
                                                <div>
                                                    <strong>{tile.name}</strong>
                                                    <p>{tile.connectionStatus || "connected"}</p>
                                                </div>
                                            </div>
                                            <div>
                                                {tile.isSpeaking ? <GraphicEqIcon /> : null}
                                                {tile.audioEnabled ? <MicIcon /> : <MicOffIcon />}
                                                {tile.videoEnabled || tile.screenSharing ? <VideocamIcon /> : <VideocamOffIcon />}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </aside>
                    ) : null}

                    <div className={styles.buttonContainers}>
                        <Tooltip title={localMedia.videoEnabled ? "Turn camera off" : "Turn camera on"}>
                            <IconButton onClick={toggleVideo} className={styles.controlButton}>
                                {localMedia.videoEnabled ? <VideocamIcon /> : <VideocamOffIcon />}
                            </IconButton>
                        </Tooltip>
                        <Tooltip title={localMedia.audioEnabled ? "Mute microphone" : "Unmute microphone"}>
                            <IconButton onClick={toggleAudio} className={styles.controlButton}>
                                {localMedia.audioEnabled ? <MicIcon /> : <MicOffIcon />}
                            </IconButton>
                        </Tooltip>
                        <Tooltip title={localMedia.screenSharing ? "Stop sharing" : "Share screen"}>
                            <IconButton onClick={handleScreenShare} className={localMedia.screenSharing ? styles.activeControlButton : styles.controlButton}>
                                {localMedia.screenSharing ? <StopScreenShareIcon /> : <ScreenShareIcon />}
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Change tile size">
                            <IconButton onClick={() => setTileDensity((current) => current === "comfortable" ? "compact" : "comfortable")} className={styles.controlButton}>
                                <GridViewIcon />
                            </IconButton>
                        </Tooltip>
                        <Badge badgeContent={newMessages} max={99} color='error'>
                            <Tooltip title="Chat">
                                <IconButton onClick={openChat} className={showChat ? styles.activeControlButton : styles.controlButton}>
                                    <ChatIcon />
                                </IconButton>
                            </Tooltip>
                        </Badge>
                        <Tooltip title="Participants">
                            <IconButton onClick={openParticipants} className={showParticipants ? styles.activeControlButton : styles.controlButton}>
                                <PeopleAltIcon />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Leave meeting">
                            <IconButton onClick={leaveMeeting} className={styles.endCallButton}>
                                <CallEndIcon />
                            </IconButton>
                        </Tooltip>
                    </div>
                </div>
            )}

            <Snackbar open={Boolean(toast)} autoHideDuration={4000} onClose={() => setToast(null)}>
                {toast ? <Alert severity={toast.severity} onClose={() => setToast(null)}>{toast.message}</Alert> : undefined}
            </Snackbar>
        </div>
    )
}
