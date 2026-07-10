# QuickChat React Frontend

A premium, modern, responsive chat application built with React, Vite, and Tailwind CSS. It communicates with the QuickChat backend via REST APIs and real-time WebSockets (Socket.io).

## 🚀 Key Features

- **Real-Time Messaging**: Instant delivery, typing indicators, and read receipts powered by Socket.io.
- **Unified Actions**: Message reply quotes, message editing, message deletion, and multiple emoji reactions.
- **Dynamic File Sharing**: Drag-and-drop or select images, videos, audio, and documents (uploads via HTTP, displays inline).
- **Responsive Layout**: Designed for mobile drawer transitions, adaptive sidebars, and fluid glassmorphic cards.
- **Search Capabilities**: Instant debounced user search to start new chats, and MongoDB-indexed text search for old messages.
- **Theme Settings**: Light and Dark mode options, default dark Slate theme.
- **Avatar Profiles**: Predefined colors palette to dynamically style user avatar initials.

## 🛠️ Tech Stack

- **Framework**: React 19 (JavaScript) + Vite 8
- **Styling**: Tailwind CSS v4 (`@tailwindcss/vite` configuration)
- **Icons**: React Icons (Fi icons)
- **Routing**: React Router DOM (v7)
- **HTTP Client**: Axios (v1.18) with cookies refresh interceptor
- **Real-Time Client**: Socket.io Client (v4.8)
- **Notifications**: React Toastify (v11)
- **Emoji Picker**: Emoji Picker React (v4.19)

## 📦 Getting Started

### 1. Installation

From the `client` folder, install the NPM packages:
```bash
npm install
```

### 2. Run the Development Server

Start Vite in development mode:
```bash
npm run dev
```
Open `http://localhost:5173` in your web browser.

### 3. Production Build

Build the production bundle for deployment:
```bash
npm run build
```
Verify the production files in the `/dist` output directory.

## 🔗 Environment Connections

- **REST API Base**: `http://localhost:5000/api/v1`
- **Socket Server URL**: `http://localhost:5000`
- **Uploads Static Server**: `http://localhost:5000/uploads/...`
