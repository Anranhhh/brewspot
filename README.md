# ☕ BrewSpot — Aesthetic Coffee Shop Discovery & Social Network

<p align="center">
  <img src="https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&q=80&w=1200" alt="BrewSpot Banner" width="100%" style="border-radius: 12px;" />
</p>

<p align="center">
  <b>BrewSpot</b> is a full-stack mobile & web application designed for coffee lovers to discover aesthetic coffee shops, share photo posts, interact with fellow coffee enthusiasts, and send real-time direct messages.
</p>

---

## 🌟 Key Features

- **☕ Discovery & Inspiration Feed**: Explore aesthetic coffee posts with ratings, locations, captions, and creator profiles.
- **🔍 Smart Search & Exploration**: Filter posts by coffee shop names, cities, or tags without interrupting your browsing flow.
- **📸 Native Post Creation**: Take photos or upload from library using Capacitor Camera plugin, set aesthetic ratings (1–5 stars), add locations, and publish to Supabase.
- **💬 Real-Time Comments & Likes**: Engage with posts by liking, saving, and writing comments stored in Supabase PostgreSQL.
- **🗑️ Author Post Management**: Secure post ownership verification allowing authors to delete their own published posts.
- **👤 Public Profiles & Follow System**: Real follower and following tracking stored in database (users start at 0 followers/following).
- **✉️ 1-on-1 Direct Messaging**: Standalone chat window with full message history between users stored in Supabase PostgreSQL.
- **📱 Native Mobile Ready**: Cross-platform iOS and Android app powered by Capacitor.

---

## 🛠️ Technology Stack

### Frontend
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS + Custom Aesthetic Design System
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Mobile Native Bridge**: Capacitor 8 (Camera, Haptics, Geolocation, Keyboard, SplashScreen, StatusBar)

### Backend
- **Framework**: Python 3.10+ Flask REST API
- **ORM & Database Client**: Supabase Python SDK
- **Data Validation**: Pydantic
- **Authentication**: Supabase Auth (JWT Bearer Token verification)

### Database
- **Engine**: Supabase PostgreSQL
- **Tables**: `users`, `posts`, `cafes`, `comments`, `notifications`, `post_likes`, `post_saves`, `direct_messages`

---

## 📁 Repository Structure

```
brewspot/
├── server/                     # Python Flask Backend
│   ├── api/                    # API Endpoints (post_api, user_api, messages_api, cafe_api, auth_api)
│   ├── services/               # Business Logic Layer (post_service, user_service, auth_service)
│   ├── repositories/           # Supabase Database Access Layer
│   ├── schemas.py              # Request/Response Validation Schemas
│   └── app.py                  # Flask Application Entry Point
├── src/                        # React TypeScript Frontend
│   ├── components/             # Reusable UI Components (BottomNav, CafeCard, etc.)
│   ├── screens/                # Main Application Screens
│   │   ├── Discovery.tsx       # Inspiration & Search Feed
│   │   ├── Explore.tsx         # Cafe Search & Map View
│   │   ├── PostDetails.tsx     # Post Detail & Comments View
│   │   ├── NewPost.tsx         # Create & Publish Post Screen
│   │   ├── Profile.tsx         # Logged-in User Profile Screen
│   │   ├── UserProfile.tsx     # Public Profile Viewer Screen
│   │   ├── Messages.tsx        # Direct Messages List Screen
│   │   └── ChatWindow.tsx      # 1-on-1 Direct Chat Window
│   ├── services/               # API Service Client (api.ts)
│   └── App.tsx                 # App Root & Navigation Router
├── ios/                        # Xcode iOS Native Project
├── android/                    # Android Studio Project
└── capacitor.config.json       # Capacitor Configuration
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v18+ and `npm`
- **Python**: v3.10+ and `pip`
- **Supabase Project**: Supabase URL and Anon/Service Key

---

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/brewspot.git
cd brewspot
```

---

### 2. Backend Setup (Flask API)

1. Create a Python virtual environment:
   ```bash
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Configure environment variables in `.env`:
   ```env
   SUPABASE_URL=https://your-supabase-project.supabase.co
   SUPABASE_KEY=your-supabase-anon-key
   PORT=5001
   ```

4. Start the Flask Backend API server:
   ```bash
   python -m server.app
   ```

---

### 3. Frontend Setup (React + Vite)

1. Install Node.js dependencies:
   ```bash
   npm install
   ```

2. Start the Vite development server:
   ```bash
   npm run dev
   ```

3. Open `http://localhost:5173` in your browser.

---

### 4. Running Native Mobile Apps (Capacitor)

1. Build the production web bundle and sync native platforms:
   ```bash
   npm run cap:sync
   ```

2. Open iOS project in Xcode:
   ```bash
   npx cap open ios
   ```

3. Open Android project in Android Studio:
   ```bash
   npx cap open android
   ```

---

## 🔒 Security & Verification

- **Role-Based Authorization**: Post deletion enforces `user_id == post.user_id` verification before permitting database record deletion.
- **Input Validation**: API requests strictly validated using Pydantic schemas.
- **Token Handling**: Supabase Auth JWT tokens passed securely via `Authorization: Bearer <token>` headers.

---

## 📜 License

Distributed under the MIT License. See `LICENSE` for details.

---

<p align="center">
  Crafted with ❤️ for Coffee Enthusiasts everywhere.
</p>
