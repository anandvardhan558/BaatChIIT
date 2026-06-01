# BaatChIIT

Production-ready MERN + WebRTC video meeting app.

## Local setup

1. Copy `backend/.env.example` to `backend/.env` and fill in MongoDB Atlas plus a strong `JWT_SECRET`.
2. Copy `frontend/.env.example` to `frontend/.env` and set `REACT_APP_API_URL=http://localhost:8000`.
3. Install dependencies in both folders with `npm install`.
4. Start the backend from `backend` with `npm run dev`.
5. Start the frontend from `frontend` with `npm start`.

## Required backend environment variables

- `PORT`: Render/Railway will set this automatically; local default is `8000`.
- `MONGO_URI`: MongoDB Atlas connection string including database name.
- `JWT_SECRET`: at least 32 random characters.
- `JWT_EXPIRES_IN_SECONDS`: optional, defaults to 7 days.
- `CLIENT_URLS`: comma-separated frontend origins, for example `https://your-app.vercel.app,http://localhost:3000`.

## Required frontend environment variables

- `REACT_APP_API_URL`: deployed backend origin, for example `https://your-api.onrender.com`.

## Deployment checklist

- Create a MongoDB Atlas cluster, database user, and network access rule for the backend host.
- Deploy the backend on Render or Railway from `backend`, build command `npm install`, start command `npm start`.
- Set all backend env vars on the hosting platform.
- Confirm `https://your-backend/health` returns `{ "status": "ok" }`.
- Deploy the frontend on Vercel from `frontend`, build command `npm run build`, output directory `build`.
- Set `REACT_APP_API_URL` on Vercel to the backend origin.
- Add the Vercel origin to backend `CLIENT_URLS`.
- Test signup, login, `/home`, `/history`, meeting join, chat, camera/mic, and screen share over HTTPS.
