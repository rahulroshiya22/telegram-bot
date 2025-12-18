# 🚀 How to Host Your Telegram Bot

Since your bot is "All Done", here are the best ways to host it online so it runs 24/7.

## 📋 Prerequisites
1.  **GitHub Account**: You need to upload your code to a GitHub repository.
2.  **API Keys**: Have your `.env` keys ready (`BOT_TOKEN`, `OPENROUTER_API_KEY`, `GOOGLE_AI_KEY`).

---

## ☁️ Option 1: Render.com (Best Free Option)
Render offers a free tier for Node.js services.

1.  **Push to GitHub**:
    -   Initialize git: `git init`
    -   Add files: `git add .`
    -   Commit: `git commit -m "Initial commit"`
    -   Push to a new GitHub repo.
2.  **Create Service**:
    -   Go to [dashboard.render.com](https://dashboard.render.com/).
    -   Click **New +** -> **Web Service**.
    -   Connect your GitHub repo.
3.  **Settings**:
    -   **Runtime**: Node
    -   **Build Command**: `npm install`
    -   **Start Command**: `npm start` (or `node src/index.js`)
4.  **Environment Variables** (Critical):
    -   Click **Advanced** or **Environment**.
    -   Add your keys:
        -   `BOT_TOKEN`: (Your Token)
        -   `OPENROUTER_API_KEY`: (Your Key)
        -   `GOOGLE_AI_KEY`: (Your Key)
5.  **Deploy**: Click "Create Web Service".

*Note: The free tier spins down after inactivity. use a service like UptimeRobot to ping it if it sleeps.*

---

## 🚂 Option 2: Railway.app (Easiest & Fastest)
Railway is cleaner but offers a limited trial (or $5/mo).

1.  Go to [railway.app](https://railway.app/).
2.  Click **Start a New Project** -> **Deploy from GitHub repo**.
3.  Select your bot repo.
4.  Go to **Variables** tab.
5.  Add all your keys (`BOT_TOKEN`, etc.).
6.  It will deploy automatically!

---

## 💻 Option 3: Replit (Quickest for Testing)
1.  Create a new Repl.
2.  Import your GitHub repo.
3.  Add Secrets (Environment Variables) in the "Secrets" (Lock icon) tab.
4.  Click **Run**.
5.  *Note: You need "Always On" (Paid) to keep it running when you close the tab.*

---

## 💡 Important: "Web Process" vs "Worker"
-   Since this is a Telegram **Polling** bot (not Webhook), it runs as a background worker.
-   On **Heroku/Railway**, you might need to specify it's a `worker` in a `Procfile` (if not auto-detected).
    -   Create a file named `Procfile` (no extension) with content: `worker: node src/index.js`

**Enjoy your bot!** 🤖
