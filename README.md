# Glide - P2P File & Text Sharing PWA 🚀

Glide is a premium, lightning-fast peer-to-peer file and text sharing application. It works directly in the browser, can be installed as a Progressive Web App (PWA), and uses WebRTC DataChannels to transfer files locally without ever uploading them to a cloud server. 

## Features ✨

- **Lightning Fast Transfers**: Files are transferred directly between devices using WebRTC DataChannels.
- **No File Limits**: Transfer large files and multiple files instantly.
- **Privacy First**: The signaling server only establishes the connection. Your files are never stored or relayed through the backend.
- **Trusted Devices**: Save devices for 1-click reconnections using local IndexedDB storage.
- **Text Sharing**: A real-time, low-latency text sharing panel for instant clipboard syncing.
- **Installable PWA**: Works offline, fully responsive, and feels like a native app on Mobile, Tablet, and Desktop.
- **Minimal, Premium UI**: Beautiful animations powered by Framer Motion, with a strict monochrome design system.

## Tech Stack 🛠

**Frontend**:
- React 19 + Vite
- Tailwind CSS v3
- Framer Motion (Animations)
- Lucide React (Icons)
- vite-plugin-pwa (Service Workers & Manifest)
- localforage (IndexedDB Storage)

**Backend (Signaling Server)**:
- Node.js
- Express
- Socket.IO

---

## Local Development Setup 💻

You need to run both the Client (Frontend) and Server (Backend) simultaneously.

### 1. Start the Signaling Server
Open a terminal and run:
```bash
cd server
npm install
npm start
```
*The server will run on `http://localhost:3001`.*

### 2. Start the Client Application
Open a second terminal and run:
```bash
cd client
npm install
npm run dev
```
*The client will run on `http://localhost:5173`.*

Open `http://localhost:5173` in two different browser windows to simulate two devices and test the pairing code!

---

## Deployment Guide 🌍

Because this project is split into a static frontend and a Node.js backend, you will need to deploy them separately. 

### Step 1: Deploy the Backend (Render, Railway, or Fly.io)

We recommend using **Render** as it offers a free tier for Node.js web services.

1. Create a GitHub repository and push this code. *(Note: make sure to add `node_modules` to your `.gitignore` first!)*
2. Go to [Render](https://render.com/) and click **New +** -> **Web Service**.
3. Connect your GitHub repository.
4. **Root Directory**: `server`
5. **Environment**: `Node`
6. **Build Command**: `npm install`
7. **Start Command**: `npm start`
8. Click **Create Web Service**. 
9. Once deployed, copy your Live URL (e.g., `https://glide-server.onrender.com`).

### Step 2: Deploy the Frontend (Vercel or Netlify)

We recommend **Vercel** for lightning-fast frontend deployments.

1. Go to [Vercel](https://vercel.com/) and click **Add New Project**.
2. Import the same GitHub repository.
3. **Framework Preset**: `Vite`
4. **Root Directory**: `client`
5. **Environment Variables**: 
   Add a new variable so the frontend knows where your live signaling server is located:
   - **Name**: `VITE_SERVER_URL`
   - **Value**: `https://your-backend-url.onrender.com` *(Replace with your URL from Step 1)*
6. Click **Deploy**.

### Step 3: Enjoy!
Once Vercel finishes deploying, visit your live `.vercel.app` URL. You can now open this URL on your phone and laptop and share files directly over the internet! 

*(Note: WebRTC transfers work best when both devices are on the same Wi-Fi network, but will also work over cellular networks utilizing free STUN servers provided by Google).*
