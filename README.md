# 🔭 Daily Cosmos

> Browse NASA's Astronomy Picture of the Day — stunning space images and videos since 1995.

A clean, responsive web viewer for [NASA's APOD API](https://api.nasa.gov/).  
Built for students and space enthusiasts.

---

## ✨ Features

- 📷 Daily astronomy photos and videos from NASA
- ⬅️ ➡️ Navigate between days (arrow buttons or **swipe on mobile**)
- 🎲 Random date explorer
- 🔍 Fullscreen lightbox viewer
- 📥 Download HD images directly to your computer
- 🔑 Personal API key support (1,000 req/hour vs 30 on default)
- ✨ Cinematic Ken Burns effect on image load
- 📱 Fully responsive — works on mobile, tablet, and desktop

---

## 🚀 Getting Started

No build step required. Just open `index.html` in any modern browser.

```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
cd YOUR_REPO
open index.html
```

Or deploy instantly → [GitHub Pages](#-deploy-to-github-pages)

---

## 🔑 API Key

The app uses NASA's `DEMO_KEY` by default (30 requests/hour per IP).  
For more requests, get a **free personal key** at [api.nasa.gov](https://api.nasa.gov/) and click the 🔑 button in the app.

Your key is stored **only** in your browser's `localStorage` — never sent anywhere else.

---

## 📁 Project Structure

```
├── index.html        # HTML structure
├── css/
│   └── style.css     # All styles & animations
├── js/
│   └── app.js        # All JavaScript logic
└── README.md
```

---

## 🌐 Deploy to GitHub Pages

1. Push this repo to GitHub
2. Go to **Settings → Pages**
3. Set source to `main` branch, `/ (root)`
4. Your site will be live at `https://YOUR_USERNAME.github.io/YOUR_REPO/`

---

## ⚠️ Disclaimer

Daily Cosmos is an independent project and is not affiliated with, endorsed by, or sponsored by NASA.  
All images and descriptions are © NASA / respective copyright holders.
