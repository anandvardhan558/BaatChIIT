import * as React from 'react';
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    CssBaseline,
    IconButton,
    InputAdornment,
    Snackbar,
    TextField,
    ThemeProvider,
    Typography,
    createTheme
} from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import VideoCallIcon from '@mui/icons-material/VideoCall';
import ScreenShareIcon from '@mui/icons-material/ScreenShare';
import SecurityIcon from '@mui/icons-material/Security';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import "../App.css";

const authTheme = createTheme({
    palette: {
        primary: { main: '#2563eb' },
        secondary: { main: '#0f172a' },
        background: { default: '#f8fafc' }
    },
    shape: {
        borderRadius: 12,
    },
    typography: {
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
        button: {
            textTransform: 'none',
            fontWeight: 800,
        }
    },
});

const initialErrors = {
    name: "",
    username: "",
    password: ""
};

export default function Authentication() {
    const navigate = useNavigate();
    const { handleRegister, handleLogin, userData, authLoading } = React.useContext(AuthContext);

    const [formState, setFormState] = React.useState("login");
    const [username, setUsername] = React.useState("");
    const [password, setPassword] = React.useState("");
    const [name, setName] = React.useState("");
    const [showPassword, setShowPassword] = React.useState(false);
    const [fieldErrors, setFieldErrors] = React.useState(initialErrors);
    const [serverError, setServerError] = React.useState("");
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [toast, setToast] = React.useState(null);

    React.useEffect(() => {
        if (!authLoading && userData) {
            navigate("/home", { replace: true });
        }
    }, [authLoading, navigate, userData]);

    const validate = () => {
        const nextErrors = { ...initialErrors };
        const cleanUsername = username.trim();
        const cleanName = name.trim();

        if (formState === "signup" && cleanName.length < 2) {
            nextErrors.name = "Enter your full name.";
        }

        if (!cleanUsername) {
            nextErrors.username = "Username is required.";
        } else if (cleanUsername.length < 3) {
            nextErrors.username = "Username must be at least 3 characters.";
        }

        if (!password) {
            nextErrors.password = "Password is required.";
        } else if (formState === "signup" && password.length < 6) {
            nextErrors.password = "Password must be at least 6 characters.";
        }

        setFieldErrors(nextErrors);
        return !Object.values(nextErrors).some(Boolean);
    }

    const switchMode = (mode) => {
        setFormState(mode);
        setFieldErrors(initialErrors);
        setServerError("");
        setToast(null);
    }

    const submitAuth = async (event) => {
        event.preventDefault();
        if (isSubmitting || !validate()) return;

        setIsSubmitting(true);
        setServerError("");

        try {
            const payload = formState === "login"
                ? await handleLogin(username.trim(), password)
                : await handleRegister(name.trim(), username.trim(), password);

            setToast({
                severity: "success",
                message: formState === "login" ? `Welcome back, ${payload.user.name}.` : "Account created successfully."
            });
            window.setTimeout(() => navigate("/home", { replace: true }), 350);
        } catch (err) {
            const message = err.code === "ERR_NETWORK"
                ? "Network error. Check whether the backend server is reachable."
                : err.response?.data?.message || "Authentication failed. Please try again.";
            setServerError(message);
            setToast({ severity: "error", message });
        } finally {
            setIsSubmitting(false);
        }
    }

    if (authLoading) {
        return (
            <div className="authLoading">
                <CircularProgress />
                <p>Checking your session...</p>
            </div>
        );
    }

    return (
        <ThemeProvider theme={authTheme}>
            <CssBaseline />
            <main className="authPage">
                <section className="authBrandPanel">
                    <div className="brandMark">
                        <LockOutlinedIcon />
                        <span>BaatChIIT</span>
                    </div>

                    <div className="authWelcome">
                        <Chip color="primary" label="Secure video meetings" />
                        <h1>Meet, present, and collaborate without friction.</h1>
                        <p>Production-ready rooms with JWT sessions, meeting history, chat, screen sharing, and responsive layouts.</p>
                    </div>

                    <div className="authHighlights" aria-label="Product highlights">
                        <div>
                            <VideoCallIcon />
                            <span>HD calls</span>
                        </div>
                        <div>
                            <ScreenShareIcon />
                            <span>Fast presenting</span>
                        </div>
                        <div>
                            <SecurityIcon />
                            <span>JWT protected</span>
                        </div>
                    </div>
                </section>

                <section className="authCardShell">
                    <Box component="form" className="authCard" onSubmit={submitAuth} noValidate>
                        <div className="authCardHeader">
                            <p>{formState === "login" ? "Welcome back" : "Create workspace access"}</p>
                            <h2>{formState === "login" ? "Sign in to continue" : "Create your account"}</h2>
                            <span>{formState === "login" ? "Use your BaatChIIT username and password." : "Start with a secure meeting profile."}</span>
                        </div>

                        <div className="authTabs" role="tablist" aria-label="Authentication mode">
                            <button type="button" className={formState === "login" ? "active" : ""} onClick={() => switchMode("login")}>
                                Login
                            </button>
                            <button type="button" className={formState === "signup" ? "active" : ""} onClick={() => switchMode("signup")}>
                                Sign up
                            </button>
                        </div>

                        {serverError ? <Alert severity="error">{serverError}</Alert> : null}

                        {formState === "signup" ? (
                            <TextField
                                required
                                fullWidth
                                id="full-name"
                                label="Full name"
                                name="name"
                                value={name}
                                error={Boolean(fieldErrors.name)}
                                helperText={fieldErrors.name || " "}
                                onChange={(e) => setName(e.target.value)}
                                autoComplete="name"
                                disabled={isSubmitting}
                            />
                        ) : null}

                        <TextField
                            required
                            fullWidth
                            id="username"
                            label="Username"
                            name="username"
                            value={username}
                            error={Boolean(fieldErrors.username)}
                            helperText={fieldErrors.username || " "}
                            onChange={(e) => setUsername(e.target.value)}
                            autoComplete="username"
                            disabled={isSubmitting}
                            autoFocus
                        />

                        <TextField
                            required
                            fullWidth
                            name="password"
                            label="Password"
                            value={password}
                            type={showPassword ? "text" : "password"}
                            onChange={(e) => setPassword(e.target.value)}
                            id="password"
                            error={Boolean(fieldErrors.password)}
                            helperText={fieldErrors.password || (formState === "signup" ? "Use at least 6 characters." : " ")}
                            autoComplete={formState === "login" ? "current-password" : "new-password"}
                            disabled={isSubmitting}
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton
                                            aria-label={showPassword ? "Hide password" : "Show password"}
                                            onClick={() => setShowPassword((value) => !value)}
                                            edge="end"
                                        >
                                            {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                                        </IconButton>
                                    </InputAdornment>
                                )
                            }}
                        />

                        <Button
                            type="submit"
                            fullWidth
                            size="large"
                            variant="contained"
                            disabled={isSubmitting}
                            className="authSubmit"
                        >
                            {isSubmitting ? <CircularProgress size={22} color="inherit" /> : formState === "login" ? "Login" : "Create account"}
                        </Button>

                        <Typography color="text.secondary" fontSize=".9rem" textAlign="center">
                            {formState === "login" ? "New here? " : "Already have an account? "}
                            <button type="button" className="textButton" onClick={() => switchMode(formState === "login" ? "signup" : "login")}>
                                {formState === "login" ? "Create an account" : "Login instead"}
                            </button>
                        </Typography>
                    </Box>
                </section>
            </main>

            <Snackbar open={Boolean(toast)} autoHideDuration={3500} onClose={() => setToast(null)}>
                {toast ? <Alert severity={toast.severity} onClose={() => setToast(null)}>{toast.message}</Alert> : undefined}
            </Snackbar>
        </ThemeProvider>
    );
}
