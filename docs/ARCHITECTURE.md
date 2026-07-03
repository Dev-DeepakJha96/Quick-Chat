# Quick-Chat — Architecture Documentation

---

## 1. Project Structure

```
Quick-Chat/
├── docs/                          # Documentation (this directory)
├── server/                        # Backend — Express 5 + Mongoose 9 + Socket.IO
│   ├── .env                       # Environment variables (gitignored, contains secrets)
│   ├── package.json
│   └── src/
│       ├── app.js                 # Express app setup (middleware, routes, error handling)
│       ├── server.js              # Entry point — connect DB, create HTTP server, init Socket.IO
│       ├── config/
│       │   ├── database.config.js # MongoDB connection with retry logic
│       │   ├── env.config.js      # Environment variable validation & config object
│       │   ├── logger.config.js   # Winston logger (console + file transports)
│       │   └── socket.config.js   # Socket.IO server init + event handlers
│       ├── controllers/
│       │   ├── auth.controller.js
│       │   ├── conversation.controller.js
│       │   └── message.controller.js
│       ├── middlewares/
│       │   ├── auth.middlware.js  # JWT protect middleware (typo in filename)
│       │   ├── error.middleware.js # Global error handler
│       │   └── validation.middleware.js # Zod schema validation
│       ├── models/
│       │   ├── User.js
│       │   ├── Conversation.model.js
│       │   └── Message.model.js
│       ├── routes/
│       │   ├── index.js            # Route aggregator
│       │   ├── auth.routes.js
│       │   ├── conversation.routes.js
│       │   └── message.routes.js
│       ├── services/
│       │   ├── auth.services.js
│       │   ├── conversation.service.js
│       │   ├── message.service.js
│       │   ├── socket.service.js   # DEAD CODE (never imported)
│       │   └── email/
│       │       ├── sendmail.js
│       │       └── templates/
│       │           └── auth.template.js
│       ├── utils/
│       │   ├── ApiResponse.js
│       │   ├── AppError.js
│       │   ├── asyncHanlder.js     # Typo in filename (Handler → Hanlder)
│       │   ├── crypto.js
│       │   └── jwt.js
│       └── validators/
│           ├── auth.validator.js
│           ├── conversation.validation.js
│           └── message.validation.js
│
├── client/                        # Frontend — React 19 + Vite 8 + Tailwind v4
│   ├── .env                       # VITE_API_URL, VITE_SOCKET_URL
│   ├── index.html
│   ├── vite.config.js
│   ├── package.json
│   └── src/
│       ├── main.jsx               # React entry point
│       ├── App.jsx                # Router + Providers + Route definitions
│       ├── index.css              # Tailwind v4 imports + @theme + @layer components
│       ├── context/
│       │   ├── AuthContext.jsx     # Auth state, register, login, logout, updateProfile
│       │   ├── ChatContext.jsx     # Conversations, messages, search, typing state
│       │   └── SocketContext.jsx   # Socket.IO connection, event listeners, emit helpers
│       ├── pages/
│       │   ├── LoginPage.jsx
│       │   ├── RegisterPage.jsx
│       │   └── ChatPage.jsx
│       ├── components/
│       │   ├── chat/
│       │   │   ├── ChatWindow.jsx
│       │   │   ├── ConversationList.jsx
│       │   │   ├── MessageList.jsx
│       │   │   ├── MessageInput.jsx
│       │   │   └── SearchUsers.jsx
│       │   └── common/
│       │       ├── ErrorBoundary.jsx
│       │       ├── LoadingSpinner.jsx
│       │       └── ProtectedRoute.jsx
│       └── services/
│           └── api.js             # Axios instance with interceptors
```

---

## 2. Backend Architecture

### 2.1 Request Lifecycle

```
HTTP Request
  → express.json() / cookieParser() / compression()
  → CORS / Helmet / Rate Limiter
  → Morgan (dev) or custom logger (prod)
  → Request ID middleware
  → Route matching (/api/v1/...)
    → Validation middleware (Zod)
    → Auth middleware (protect)
    → Controller
      → Service
        → Model (Mongoose)
      → ApiResponse
    → Response JSON
  → Error Handler (if error thrown)
```

### 2.2 Auth Flow

```
Register
  → POST /api/v1/auth/register
  → Validate with Zod (username, email, password)
  → Check duplicates in User collection
  → Hash password with bcrypt (cost 12)
  → Generate email verification token (crypto.randomBytes → SHA-256)
  → Store hashed token + expiry (10 min)
  → Send verification email
  → Return 201 with { user, verificationToken }

Verify Email
  → POST /api/v1/auth/verify-email
  → Hash incoming token, match against stored hash
  → Mark isEmailVerified = true
  → Return 200

Login
  → POST /api/v1/auth/login
  → Find user by email, select +password
  → Compare password with bcrypt
  → Check isEmailVerified (403 if not)
  → Sign accessToken (15 min, sub = userId)
  → Sign refreshToken (30 day, sub = userId)
  → Hash refreshToken, store in user doc
  → Set httpOnly cookies: accessToken + refreshToken
  → Return 200 with { user, accessToken }

Refresh
  → POST /api/v1/auth/refresh
  → Read refreshToken from cookie
  → Verify JWT, hash token, compare with stored hash
  → Rotate: sign new accessToken + new refreshToken
  → Update stored hash
  → Return 200 with new accessToken

Logout
  → POST /api/v1/auth/logout (requires protect)
  → Clear refreshToken in DB
  → Clear cookies
  → Return 200

Forgot Password
  → POST /api/v1/auth/forgot-password
  → Find user by email (silent fail if not found — security)
  → Generate reset token, hash + store with 15 min expiry
  → Send email with raw token
  → Return 200

Reset Password
  → POST /api/v1/auth/reset-password
  → Hash incoming token, find matching user
  → Update password, clear resetToken + refreshToken
  → Return 200

Change Password
  → PATCH /api/v1/auth/change-password (requires protect)
  → Verify current password
  → Update password, sign new accessToken
  → Return 200

Get Me
  → GET /api/v1/auth/me (requires protect)
  → Return user document

Update Me
  → PATCH /api/v1/auth/update-me (requires protect)
  → Update username/email/avatarColor with duplicate checks
  → Return updated user
```

### 2.3 Conversation Flow

```
Create/Get Conversation
  → POST /api/v1/conversations (requires protect)
  → Validate participantId (MongoDB ObjectId)
  → Check both users exist and are active
  → Conversation.findOrCreate (sorted participants, unique index)
  → Populate participants
  → Return 201

List Conversations
  → GET /api/v1/conversations (requires protect)
  → Find conversations where user is a participant
  → Populate participants + lastMessage
  → For each conversation, query unread count (N+1 problem!)
  → Sort by lastMessageAt descending
  → Paginate with limit/skip
  → Return 200

Get Conversation
  → GET /api/v1/conversations/:id (requires protect)
  → Find by ID + verify user is participant
  → Return 200

Get Conversation Messages
  → GET /api/v1/conversations/:id/messages (requires protect)
  → Delegate to MessageService.getMessages
  → Paginate with cursor (before timestamp)
  → Return 200

Delete/Archive Conversation
  → DELETE /api/v1/conversations/:id (requires protect)
  → Remove user from participants array
  → If no participants left, set isActive = false
  → Return 200
```

### 2.4 Message Flow

```
Send Message
  → POST /api/v1/messages (requires protect)
  → Validate conversationId + text
  → Verify user is participant of conversation
  → Create Message document
  → Message.pre('save') updates conversation.lastMessage + lastMessageAt
  → Populate sender info
  → Return 201

Get Messages
  → GET /api/v1/messages/:conversationId (requires protect)
  → Verify user is participant
  → Query messages with cursor pagination (before)
  → Exclude soft-deleted messages (isDeleted: false)
  → Exclude messages deleted for user (deletedFor: { $ne: userId })
  → Populate sender + replyTo
  → Return 200 with hasMore + nextBefore cursor

Delete Message
  → DELETE /api/v1/messages/:messageId (requires protect)
  → Find message
  → Verify user is participant of parent conversation
  → If user is sender → soft delete (isDeleted = true)
  → If user is not sender → add to deletedFor array
  → If all participants deleted → mark isDeleted = true globally
  → Return 200

Mark as Read
  → POST /api/v1/messages/mark-read (requires protect)
  → updateMany: $push readBy for unread messages
  → Return 200 with updatedCount

Search Messages
  → GET /api/v1/messages/search?q= (requires protect)
  → Get user's conversations
  → Regex search on text field within those conversations
  → Return 200 with results
```

### 2.5 Socket.IO Architecture

```
Server (socket.config.js)
├── Auth Middleware
│   → Reads token from socket.handshake.auth.token
│   → Verifies JWT, loads user
│   → Attaches user + userId to socket
├── Connection Handler
│   → Store connection in connectedUsers Map (userId → socketId)
│   → Update isOnline = true in DB
│   → Notify all conversation partners via user:status event
│   → Join user room (user:userId)
│   → Find and join all conversation rooms (conversation:id)
├── Events
│   ├── message:send
│   │   → Validate conversation access
│   │   → Create Message document
│   │   → Update conversation.lastMessage + lastMessageAt
│   │   → Broadcast to conversation room
│   │   → Callback with { success, message }
│   ├── disconnect
│   │   → Remove from connectedUsers
│   │   → Update isOnline = false, lastSeen = now
│   │   → Notify conversation partners
│   └── MISSING: typing:start, typing:stop, message:read, conversation:join
└── Exports: initSocket, connectedUsers, userSockets, typingUsers

Frontend (SocketContext.jsx)
├── Connection
│   → Reads token from cookie (BUG: looks for 'token', should be 'accessToken')
│   → Connects with auth: { token }
│   → Handles connect/disconnect/reconnect
├── Events Received
│   ├── message:receive → dispatches window event
│   ├── message:readReceipt → dispatches window event
│   ├── messages:read → dispatches window event
│   ├── typing:indicator → dispatches window event
│   ├── user:status → updates onlineUsers map + dispatches window event
│   └── conversations:joined / conversation:joined → dispatches window event
├── Events Emitted
│   ├── message:send (via callback)
│   ├── typing:start
│   ├── typing:stop
│   ├── message:read
│   ├── conversation:join
│   └── conversation:leave
└── Exports: sendMessage, startTyping, stopTyping, markMessageAsRead, joinConversation, leaveConversation
```

---

## 3. Frontend Architecture

### 3.1 State Management

```
App
├── AuthProvider (AuthContext)
│   ├── user, isAuthenticated, loading
│   ├── register(), login(), logout(), updateProfile(), changePassword()
│   └── checkAuth() — calls GET /auth/me
│
├── SocketProvider (SocketContext) — depends on AuthContext
│   ├── isConnected, onlineUsers
│   ├── sendMessage(), startTyping(), stopTyping()
│   ├── markMessageAsRead(), joinConversation()
│   └── Connects/disconnects based on isAuthenticated
│
└── ChatProvider (ChatContext) — depends on AuthContext + SocketContext
    ├── conversations[], activeConversation, messages[]
    ├── typingUsers, searchResults, hasMoreMessages
    ├── selectConversation(), sendMessage(), loadMoreMessages()
    ├── searchUsers(), createConversation(), markMessagesAsRead()
    └── Listens to socket events via window CustomEvents
```

### 3.2 Route Map

| Path | Component | Auth Required | Status |
|------|-----------|---------------|--------|
| `/login` | LoginPage | No | ✅ |
| `/register` | RegisterPage | No | ✅ |
| `/chat` | ChatPage | Yes (ProtectedRoute) | ✅ |
| `/` | Redirect → `/chat` | Yes (ProtectedRoute) | ✅ |
| `*` | Inline 404 page | No | ✅ |
| `/forgot-password` | **MISSING** | No | ❌ |
| `/reset-password` | **MISSING** | No | ❌ |
| `/verify-email` | **MISSING** | No | ❌ |

### 3.3 API Service (api.js)

- Axios instance with `baseURL` from `VITE_API_URL`
- `withCredentials: true` for httpOnly cookie auth
- Request interceptor: adds `_t` timestamp (cache busting), logs in dev
- Response interceptor:
  - Handles 401 → clears localStorage, redirects to `/login`
  - Handles 403/404/429/500 with toast messages
  - Handles network errors and timeouts

---

## 4. Database Schema

### 4.1 User

| Field | Type | Notes |
|-------|------|-------|
| username | String | Unique, lowercase, 3-30 chars, alphanumeric + underscore |
| email | String | Unique, lowercase, validated |
| password | String | bcrypt hashed, select: false |
| avatarColor | String | Random hex color from palette |
| role | String | enum: user, admin. Default: user |
| isEmailVerified | Boolean | Default: false |
| refreshToken | String | Hashed, select: false |
| passwordChangedAt | Date | For token invalidation |
| emailVerificationToken | String | Hashed, select: false |
| emailVerificationExpires | Date | 10 min expiry, select: false |
| resetPasswordToken | String | Hashed, select: false |
| resetPasswordExpires | Date | 15 min expiry, select: false |
| isActive | Boolean | Default: true |
| lastLogin | Date | Updated on login |
| lastSeen | Date | Added by fix session |
| isOnline | Boolean | Default: false, added by fix session |

**Indexes:** `{ email: 1, username: 1 }`

### 4.2 Conversation

| Field | Type | Notes |
|-------|------|-------|
| participants | [ObjectId] | ref: User, sorted on save |
| lastMessageAt | Date | Default: Date.now (formerly bug: Date.now()) |
| isActive | Boolean | Default: true |

**Indexes:**
- `{ participants: 1 }` — unique, partial (isActive: true)
- `{ participants: 1, lastMessageAt: -1 }`
- `{ isActive: 1, lastMessageAt: -1 }`

### 4.3 Message

| Field | Type | Notes |
|-------|------|-------|
| conversation | ObjectId | ref: Conversation |
| sender | ObjectId | ref: User |
| text | String | 1-5000 chars |
| attachments | [Attachment] | url, type, name, size, mimeType |
| isEdited | Boolean | Default: false |
| isDeleted | Boolean | Default: false |
| deletedFor | [ObjectId] | Users who deleted this message |
| replyTo | ObjectId | ref: Message |
| readBy | [{ user, readAt }] | Read receipts |
| deliveredTo | [ObjectId] | Delivery tracking |
| reactions | [{ user, emoji, createdAt }] | Emoji reactions |

**Indexes:**
- `{ conversation: 1, createdAt: -1 }`
- `{ sender: 1, createdAt: -1 }`
- `{ conversation: 1, 'readBy.user': 1 }`
- `{ text: 'text' }` — full-text search
- `{ isDeleted: 1 }`

---

## 5. API Endpoint Summary

### Auth (`/api/v1/auth`)

| Method | Path | Auth | Validation |
|--------|------|------|------------|
| POST | /register | No | Zod |
| POST | /verify-email | No | Zod |
| POST | /login | No | Zod |
| POST | /refresh | No | None |
| POST | /logout | protect | None |
| POST | /forgot-password | No | Zod |
| POST | /reset-password | No | Zod |
| GET | /me | protect | None |
| PATCH | /update-me | protect | None |
| PATCH | /change-password | protect | Zod |

### Conversations (`/api/v1/conversations`)

| Method | Path | Auth | Validation |
|--------|------|------|------------|
| GET | / | protect | Query |
| GET | /unread-count | protect | None |
| POST | / | protect | Zod body |
| GET | /:id | protect | None |
| GET | /:id/messages | protect | Query |
| DELETE | /:id | protect | None |

### Messages (`/api/v1/messages`)

| Method | Path | Auth | Validation |
|--------|------|------|------------|
| POST | / | protect | Zod body |
| POST | /mark-read | protect | Zod body |
| GET | /search | protect | None |
| GET | /:conversationId | protect | Query |
| GET | /unread/:conversationId | protect | None |
| DELETE | /:messageId | protect | Params |
