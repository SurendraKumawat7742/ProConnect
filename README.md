## 🚀 ProConnect

> A professional networking platform inspired by LinkedIn, built as a full-stack web 

ProConnect is a full-stack professional networking platform where users can
create profiles, connect with other professionals, share content, and build
their professional network.

## 🌐 Live Demo

[Visit ProConnect](https://linkedin-clone-git-main-surendrakumawat7742s-projects.vercel.app/).

## ✨ Features

- 🔐 User authentication
- 👤 Create and manage professional profiles
- 📝 Create and manage posts
- ❤️ Interact with posts
- 🤝 Connect with other users
- 🔎 Discover other professionals
- 📄 Profile / document generation
- 📷 Image and file uploads
- ⚡ Responsive user interface
- 🔄 REST API based backend
- 🗄️ MongoDB database

---

## 🛠️ Tech Stack

### Frontend

- Next.js
- React
- Redux Toolkit
- React Redux
- Axios
- JavaScript

### Backend

- Node.js
- Express.js
- MongoDB
- Mongoose
- REST APIs
- JWT / Authentication
- Multer
- bcrypt

### Tools

- Git & GitHub
- Vercel
- MongoDB

---

## 🏗️ Project Architecture

ProConnect
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── config/
│   │   ├── layout/
│   │   ├── pages/
│   │   └── styles/
│   └── package.json
│
├── backend/
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   ├── uploads/
│   ├── server.js
│   └── package.json
│
└── README.md

## 🔄 Application Flow

User
  │
  ▼
Frontend (Next.js)
  │
  │ HTTP Requests
  ▼
Backend (Express.js)
  │
  ├── Authentication
  ├── User Management
  ├── Post Management
  ├── Connection Management
  └── File Handling
  │
  ▼
MongoDB

## Getting Started

### Clone the repository

git clone https://github.com/SurendraKumawat7742/ProConnect.git
cd ProConnect

### Setup Backend

cd backend
npm install

Create a .env file inside the backend directory:

MONGO_URI=your_mongodb_connection_string

Start the backend server:

npm run dev

### Setup Frontend

Open a new terminal

cd frontend
npm install
npm run dev

### Open

Open your browser and visit:

http://localhost:9080

## Deployment

The application frontend is deployed using Vercel.
