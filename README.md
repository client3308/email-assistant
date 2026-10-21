# AI Email Assistant (Powered by GitHub Copilot)

A high-performance desktop web application (Node.js + Express) featuring a Gmail-style interface powered by **GitHub Copilot (GPT-4o)** with personalized authentication, smart contextual reply drafting, and interactive review-and-send capabilities.

![GitHub Copilot Enabled](https://img.shields.io/badge/AI-GitHub%20Copilot%20(GPT--4o)-blue?logo=githubcopilot)
![Node.js](https://img.shields.io/badge/Node.js-v24+-green?logo=node.js)
![Express](https://img.shields.io/badge/Express-5.x-lightgrey?logo=express)

---

## 🌟 Key Features

### 1. GitHub Copilot Integration (Replaced Gemini Flash)
- **Live Copilot Generation**: Connects directly to GitHub Copilot's `gpt-4o` and `gpt-4o-mini` models to craft executive-level email responses.
- **Auto-Discovery**: Automatically recognizes active system Git Credentials / GitHub tokens without tedious manual copy-pasting.
- **Tone Customization**: Switch on the fly between **Professional**, **Friendly / Casual**, or **Direct / Action-Oriented**.
- **Context-Aware Prompts**: Provide ad-hoc instructions (e.g. *"Politely decline the keynote"* or *"Confirm 3 PM on Zoom"*).
- **Intelligent Offline Fallback**: High-fidelity local assistant ensures the app works smoothly under all network conditions.

### 2. User Authentication & Profile System (Replaced Static Placeholder)
- **Interactive Sign-In**: Replaced the static avatar placeholder with a full account switcher, sign-in modal, and profile management dropdown.
- **One-Click Verified Profiles**: Instant 1-click access to verified profiles (including GitHub Copilot-linked identities like `Diamond Mutua` and `Alex Mercer`).
- **Custom Account Onboarding**: Sign in with any custom name, email address, and professional title.
- **Dynamic Signature Generation**: Copilot automatically tailors draft greetings and sign-offs to match the active user's name and title.

### 3. Gmail-Style Dual-Pane Workspace
- **Left Navigation**: Live inbox with unread counts, search filtering by sender/subject/body, and read/replied status pills.
- **Right Split Panel**:
  - **Incoming Message Card**: Inspect full sender details, timestamp, and message body.
  - **Copilot Recommendation Panel**: Live drafting, one-click clipboard copy, and "Review & Send Reply" workflow.
- **Simulate Incoming Emails**: Click `+ Simulate Email` to inject custom mock inbound emails and observe Copilot analyze and draft responses in real-time.

---

## 🚀 Quick Start

### 1. Launch with Batch Script
Double-click `launch.bat` in the project root:
```cmd
launch.bat
```
This automatically boots the Node.js server and launches `http://localhost:3000` in your default browser.

### 2. Or Start via Terminal
```bash
npm install
npm start
```
Then visit [http://localhost:3000](http://localhost:3000).

---

## ⚙️ Configuration

Create a `.env` file (copied from `.env.example`):
```env
PORT=3000
COPILOT_API_KEY=
COPILOT_MODEL=gpt-4o
```
*Note: If `COPILOT_API_KEY` is omitted, the app will automatically authenticate using your system Git Credential Helper if you are logged in to GitHub with Copilot.*

---

## 👤 Author
Developed and maintained by **Diamond Mutua** (`client3308`).
