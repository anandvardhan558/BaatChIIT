const fallbackServer = "http://localhost:8000";

const server = (process.env.REACT_APP_API_URL || fallbackServer).replace(/\/$/, "");

export default server;
