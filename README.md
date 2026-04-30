<p align="center">
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" />
  <img src="https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white" />
  <img src="https://img.shields.io/badge/WebSockets-010101?style=for-the-badge&logo=socketdotio&logoColor=white" />
  <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" />
</p>

<h1 align="center">1 Million Checkboxes</h1>

<p align="center">
  <b>A high-performance, real-time collaborative experiment.</b>
</p>

---

## 🚀 Features

- **⚡ Real-time Synchronization**: Toggle events are broadcasted instantly to all connected users using WebSockets and Redis Pub/Sub.
- **📦 Compact State Management**: 1,000,000 checkbox states stored efficiently using Redis Bitmaps (~122KB for the entire grid).
- **📐 Dynamic Grid Resizing**: Users can adjust the columns and rows in real-time. The visual layout reflows while preserving every single check mark.
- **🛡️ Secure Auth Wall**: Protected by Google OAuth 2.0 with a convenient "Guest Login" for development testing.
- **🛑 Custom Rate Limiting**: Built-in sliding-window rate limiter using Redis Sorted Sets to prevent spam and ensure system stability.
- **🎨 Cyber HUD Theme**: A premium, dark-mode interface with neon accents and virtualized grid rendering for smooth 60fps performance.

## 🛠️ Technology Stack

- **Backend**: Node.js, Express, `ws` (WebSockets)
- **Database**: Redis (Bitmaps for state, Hashes for config, Sorted Sets for rate limiting)
- **Frontend**: Vanilla JavaScript (Virtualized Grid Engine), HTML5, CSS3 (Glassmorphism)
- **Auth**: Passport.js (Google OAuth 2.0 + Mock Strategy)

## 📂 Codebase Overview

The project is split into two main directories:

### 🎨 `client/` (Frontend)
- **`index.html`**: The UI structure, including the Cyber HUD layout and the Auth landing page.
- **`style.css`**: Premium glassmorphism styles, neon animations, and custom scrollbar logic.
- **`script.js`**: The "Heart" of the frontend. It handles:
  - **Virtualized Grid**: Only renders what you see on screen for 60fps performance.
  - **WebSocket Sync**: Real-time updates from the server.
  - **Reflow Logic**: Recalculates IDs and positions during resizing.

### ⚙️ `server/` (Backend)
- **`src/app.js`**: Coordinates HTTP routes, WebSocket connections, and Redis Pub/Sub.
- **`src/services/redisService.js`**: Manages the 1,000,000 bit bitmap and grid configurations.
- **`src/middleware/rateLimiter.js`**: Protects the server from spam using a sliding-window algorithm.
- **`src/config/passport.js`**: Handles both Google OAuth and the development Guest login.

---

## 🛠️ How to Run Locally

### 1. Prerequisites
Ensure you have the following installed:
- [Node.js](https://nodejs.org/) (v16 or higher)
- [Redis](https://redis.io/) (Local or via Docker)

### 2. Setup Redis
The fastest way is using Docker:
```bash
docker run -d --name redis-1m -p 6379:6379 redis
```

### 3. Install Dependencies
Install all necessary packages for both frontend and backend:
```bash
# In the project root
npm install
cd server && npm install
```

### 4. Configure Environment
Create a `.env` file in the `server/` folder and add your credentials:
```env
PORT=5000
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
GOOGLE_CLIENT_ID=your_id
GOOGLE_CLIENT_SECRET=your_secret
SESSION_SECRET=super_secret_key
FRONTEND_URL=http://localhost:3000
```

### 5. Start the Application
Run the following command from the **root directory**:
```bash
npm run dev
```
- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:5000

---

## 📐 How it Works (System Thinking)

1. **Memory Efficiency**: Instead of storing 1 million objects, we use a **Redis Bitmap**. This reduces the memory footprint for the entire grid to just **~122 KB**.
2. **Dynamic IDs**: The ID of each checkbox is calculated as `Row * Columns + Column`. When you resize, the IDs are reassigned to match the new grid boundaries, allowing for a natural reflow of the data.
3. **Optimistic UI**: When you click a checkbox, it lights up instantly on your screen while the server verifies the change in the background.

---

<p align="center">
  Made with ❤️ for the Web Dev Cohort 2026
</p>
