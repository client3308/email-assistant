# AI Email Assistant (Powered by GitHub Copilot)

A high-performance desktop web application (Node.js + Express) featuring a Gmail-style interface powered by **GitHub Copilot (GPT-4o)**, live **Gmail IMAP/SMTP synchronization (`arenawisdom66@gmail.com`)**, personalized authentication, smart contextual reply drafting, and interactive review-and-send capabilities.

![GitHub Copilot Enabled](https://img.shields.io/badge/AI-GitHub%20Copilot%20(GPT--4o)-blue?logo=githubcopilot)
![Live Gmail](https://img.shields.io/badge/Gmail-Live%20Sync%20(arenawisdom66@gmail.com)-red?logo=gmail)
![Node.js](https://img.shields.io/badge/Node.js-v24+-green?logo=node.js)
![Express](https://img.shields.io/badge/Express-5.x-lightgrey?logo=express)

---

## 🌟 Key Features

### 1. Live Gmail Integration (`arenawisdom66@gmail.com`)
- **Direct IMAP Sync (`imap.gmail.com:993`)**: Fetch real incoming messages directly from your live Gmail inbox into the unified interface.
- **Live SMTP Sending (`smtp.gmail.com:465`)**: Dispatch actual email responses directly to recipients using your authorized Gmail credentials.
- **One-Click Sync**: Click the Sync icon next to the inbox header anytime to pull fresh incoming mail in real-time.
- **Google App Password Support**: Secure connection using Google's 16-character App Passwords with zero OAuth consent screens required.

### 2. GitHub Copilot Integration
- **Live Copilot Generation**: Connects directly to GitHub Copilot's `gpt-4o` and `gpt-4o-mini` models to craft executive-level email responses.
- **Auto-Discovery**: Automatically recognizes active system Git Credentials / GitHub tokens without tedious manual copy-pasting.
- **Tone Customization**: Switch on the fly between **Professional**, **Friendly / Casual**, or **Direct / Action-Oriented**.
- **Context-Aware Prompts**: Provide ad-hoc instructions (e.g. *"Politely decline the keynote"* or *"Confirm 3 PM on Zoom"*).
- **Intelligent Offline Fallback**: High-fidelity local assistant ensures the app works smoothly under all network conditions.

### 3. User Authentication & Profile System
- **Interactive Sign-In**: Replaced static placeholders with a full account switcher, sign-in modal, and profile management dropdown.
- **One-Click Verified Profiles**:
  - **Arena Wisdom** (`arenawisdom66@gmail.com` - Live Gmail Connected)
  - **Diamond Mutua** (`diamondmutua07@gmail.com` - GitHub Copilot Linked)
  - **Alex Mercer** (`alex.mercer@enterprise-tech.io`)
- **Dynamic Signature Generation**: Copilot automatically tailors draft greetings and sign-offs to match the active user's credentials.

---

## 🚀 Quick Start

### 1. Launch with Batch Script
Double-click `launch.bat` in the project root:
```cmd
launch.bat
```
This automatically boots the Node.js server and launches `http://localhost:3000` in your default browser.

### 2. Connect Live Gmail (`arenawisdom66@gmail.com`)
1. Click **Live Gmail** in the top header.
2. Enter your 16-character Google App Password (generate at [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)).
3. Click **Connect & Fetch Live Inbox**.

---

## ⚙️ Configuration

Create or update `.env` (copied from `.env.example`):
```env
PORT=3000

# GitHub Copilot
COPILOT_API_KEY=
COPILOT_MODEL=gpt-4o

# Live Gmail
GMAIL_USER=arenawisdom66@gmail.com
GMAIL_APP_PASSWORD=
```

---

## 👤 Author
Developed and maintained by **Diamond Mutua** (`client3308`).
