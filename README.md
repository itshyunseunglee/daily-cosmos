# 🔭 Daily Cosmos

> Browse NASA's Astronomy Picture of the Day — stunning space images and videos since 1995.

A clean, responsive web viewer for [NASA's APOD API](https://api.nasa.gov/).  
Built for students and space enthusiasts.

🌐 **Live site → [itshyunseunglee.github.io/daily-cosmos](https://itshyunseunglee.github.io/daily-cosmos/)**

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

## ⚠️ Disclaimer

Daily Cosmos is an independent project and is not affiliated with, endorsed by, or sponsored by NASA.  
All images and descriptions are © NASA / respective copyright holders.
