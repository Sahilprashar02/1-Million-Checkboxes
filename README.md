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

## 📦 Installation & Setup

1. **Clone the repository**:
   ```bash
   git clone git@github.com:Sahilprashar02/1-Million-Checkboxes.git
   cd 1-Million-Checkboxes
   ```

2. **Install dependencies**:
   ```bash
   # Install root concurrently tool
   npm install
   # Install server dependencies
   cd server && npm install
   ```

3. **Configure Environment**:
   Create a `.env` file in the `server/` directory:
   ```env
   PORT=5000
   REDIS_HOST=127.0.0.1
   REDIS_PORT=6379
   GOOGLE_CLIENT_ID=your_id
   GOOGLE_CLIENT_SECRET=your_secret
   SESSION_SECRET=your_session_secret
   FRONTEND_URL=http://localhost:3000
   ```

4. **Run with Docker (Redis)**:
   ```bash
   docker run -d --name redis-1m -p 6379:6379 redis
   ```

5. **Start Developing**:
   ```bash
   # From the root directory
   npm run dev
   ```

## 📐 Coordinate System

The app uses a **Relative Indexing** system. When the grid is resized, the checkboxes reflow naturally.
- **ID calculation**: `index = Row * Current_Columns + Column`
- This ensures that a 10x10 view always has IDs 0-99, providing a clean and intuitive experience.

---

<p align="center">
  Made with ❤️ for the Web Dev Cohort 2026
</p>
