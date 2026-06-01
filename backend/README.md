# BaatChIIT Backend

Backend service for BaatChIIT, a real-time video conferencing platform.

The backend handles authentication, meeting history, real-time signaling, participant management, and database operations. It works alongside WebRTC and Socket.IO to enable real-time communication between users.

## Features

* JWT Authentication
* User Registration & Login
* Protected Routes
* Meeting History Management
* Real-Time Signaling with Socket.IO
* Participant State Management
* MongoDB Integration
* CORS & Environment Configuration

---

## Tech Stack

* Node.js
* Express.js
* MongoDB Atlas
* Mongoose
* JWT
* Socket.IO

---

## Environment Variables

Create a `.env` file in the backend root directory.

```env
PORT=8000

MONGO_URI=your_mongodb_connection_string

JWT_SECRET=your_secret_key

JWT_EXPIRES_IN_SECONDS=604800

CLIENT_URLS=http://localhost:3000
```

---

## Installation

Install dependencies:

```bash
npm install
```

Start development server:

```bash
npm run dev
```

Start production server:

```bash
npm start
```

---

## API Routes

### Authentication

```http
POST /api/v1/users/register
POST /api/v1/users/login
GET  /api/v1/users/me
```

### Meeting History

```http
GET  /api/v1/users/get_all_activity
POST /api/v1/users/add_to_activity
```

---

## Deployment

Backend is designed to be deployed on platforms such as:

* Render
* Railway

Database:

* MongoDB Atlas

---

## Author

Anand Vardhan

Computer Science & Data Science Student
