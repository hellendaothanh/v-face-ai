<div align="center">

# V-Face Pro: Enterprise Microservices Ecosystem (Face AI, Core User IAM, HRM & Helpdesk)

[🇬🇧 English](README.md) | [🇻🇳 Tiếng Việt](README_VI.md)

---

</div>

**V-Face Pro** is an enterprise-grade microservices ecosystem designed for intelligent workforce management, identity access control, and multi-service expansion (Face AI Attendance, HRM, Helpdesk). Built with **FastAPI** (Python 3.13) and **React 19 + Tailwind CSS**, powered by **PostgreSQL 16 with pgvector** (512-dimensional ArcFace embeddings), **InsightFace (buffalo_l)** optimized for Apple Silicon and x86, **MiniFASNetV2 Anti-Spoofing**, **Multi-Threaded Camera Manager**, **Stranger Threat Detection**, and a standalone **Core User & IAM Service (Port 8001)** for unified enterprise authentication, granular RBAC, and organization hierarchy.

---

## 1. 🏗️ High-Level Microservices Architecture

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                   Frontend: React 19 + Vite + Tailwind CSS + Recharts (Port 5173)      │
│  ┌───────────────────────┬──────────────────────┬───────────────────────────────────┐  │
│  │  Realtime Dashboard   │   HRM & Attendance   │   Camera Devices & BI Analytics   │  │
│  │ • 3 View Modes+Fullscr│ • 5-Photo Multi-Face │ • Multi-Device RTSP Switcher      │  │
│  │ • Bounding Box HUD    │ • Leave & Exceptions │ • Weekly Line / Dept Bar / Hourly │  │
│  └───────────────────────┴──────────────────────┴───────────────────────────────────┘  │
└────────────────────────────▲──────────────────────────────────▲────────────────────────┘
                             │ REST API (Axios)                 │ WebSocket (/ws/attendance)
                             ▼                                  ▼
┌──────────────────────────────────────────────┐   ┌────────────────────────────────────────────┐
│      Core User & IAM Service (Port 8001)     │   │      Face AI Attendance Service (Port 8000)│
│ ──────────────────────────────────────────── │   │ ────────────────────────────────────────── │
│ • JWT Token & Refresh Token Management (Auth)│   │ • Multi-camera RTSP/Webcam Worker Pool     │
│ • Role-Based Access Control (RBAC System)    │   │ • 512D ArcFace Recognition Engine          │
│ • User Profiles, Avatars & Unified User Code │   │ • Anti-Spoofing MiniFASNetV2 Liveness      │
│ • Departments & Positions Hierarchy          │   │ • Continuous Self-Learning Auto Face Update│
│ • Foundation for HRM & Helpdesk Services     │   │ • Stranger Threat Detector & Realtime WS   │
└──────────────────────┬───────────────────────┘   └─────────────────────┬──────────────────────┘
                       │                                                 │
                       ▼                                                 ▼
┌────────────────────────────────────────┐   ┌───────────────────────────────────────────┐
│     PostgreSQL 16 + pgvector Database  │   │            Local File Storage             │
│ • Users, Profiles, Roles, Permissions  │   │ • 5-angle face enrollment photos (.jpg)   │
│ • Departments, Positions Hierarchy     │   │ • Real-time cropped check-in snapshots    │
│ • HNSW Vector Index (<=>), Attendance  │   │ • AI Weights: InsightFace & MiniFASNet    │
└────────────────────────────────────────┘   └───────────────────────────────────────────┘
```

---

## 2. 🚀 Quick Start & Multi-Service Orchestration

V-Face provides unified service management scripts for both **Windows PowerShell** (`service.ps1`) and **Linux/macOS Bash** (`service.sh`) as well as `Makefile`.

### 2.1. Primary Commands

| Action | Windows PowerShell (`service.ps1`) | Linux/macOS (`service.sh`) | `make` Command | Description |
| :--- | :--- | :--- | :--- | :--- |
| **Start All** | `.\service.ps1 start` | `./service.sh start` | `make start` | Spawns PostgreSQL, Core User, Face AI & Frontend |
| **Stop All** | `.\service.ps1 stop` | `./service.sh stop` | `make stop` | Safely terminates all running services |
| **Restart All** | `.\service.ps1 restart` | `./service.sh restart` | `make restart` | Restarts all services and containers |
| **Check Status**| `.\service.ps1 status` | `./service.sh status` | `make status` | Displays PIDs, listening ports & health |
| **Realtime Logs**| `.\service.ps1 logs` | `./service.sh logs` | `make logs` | Streams consolidated logs of all services |

### 2.2. Granular Microservice Control

```powershell
# Windows PowerShell Examples:
.\service.ps1 start core-user      # Start Core User Service only (Port 8001)
.\service.ps1 logs core-user       # Stream Core User logs
.\service.ps1 restart backend      # Restart Face AI Backend (Port 8000)
.\service.ps1 start frontend       # Start React Web App (Port 5173)
```

```bash
# Linux/macOS Bash Examples:
./service.sh start core-user       # Start Core User Service only (Port 8001)
./service.sh logs core-user        # Stream Core User logs
./service.sh restart backend       # Restart Face AI Backend (Port 8000)
./service.sh start frontend        # Start React Web App (Port 5173)
```

---

## 3. 🌐 Ecosystem Services & API Documentation

| Service | Port | Base URL | Swagger Documentation | Description |
| :--- | :---: | :--- | :--- | :--- |
| **Core User & IAM** | `8001` | `http://localhost:8001` | [http://localhost:8001/docs](http://localhost:8001/docs) | Authentication, RBAC, Users, Organization |
| **Face AI Attendance** | `8000` | `http://localhost:8000` | [http://localhost:8000/docs](http://localhost:8000/docs) | Face Recognition, Streams, Attendance logs |
| **Frontend Dashboard** | `5173` | `http://localhost:5173` | - | React 19 UI for Attendance & Admin |

### Default Administrator Credentials (Seeded on first startup):
- **Username / Email:** `admin` / `admin@vface.ai`
- **Password:** `admin123`
- **Employee Code:** `EMP000`
- **Assigned Role:** `superadmin`

---

## 4. 🌟 Key Capabilities by Service

### 4.1. 🔑 Core User & IAM Service (`services/core-user` - Port 8001)
- **JWT Authentication**: Secure login, refresh token rotation, and password hashing (`bcrypt`).
- **Granular RBAC**: Role-Based Access Control with 14+ granular module permissions (`core_user`, `attendance`, `hrm`, `helpdesk`) and pre-configured roles (`superadmin`, `hr_manager`, `dept_manager`, `it_support`, `employee`).
- **User & Profile Management**: Unified `user_code` identifier across systems, personal profiles, and avatars.
- **Organization Structure**: Hierarchical Departments (parent/child, department managers) and Position ranks.

### 4.2. 👁️ Face AI Attendance Service (`app/` - Port 8000)
- **InsightFace ArcFace 512D**: Sub-second face recognition with cosine similarity and pgvector HNSW indexing.
- **Liveness Anti-Spoofing (MiniFASNetV2 ONNX)**: Blocks 2D screen replays and printed photos.
- **Continuous Self-Learning**: Automatically enriches face embeddings when check-in confidence $\ge 95\%$.
- **Stranger Threat Alert**: 3-consecutive-frame threat detection with audio siren and WebSocket broadcast.
- **Multi-Camera Manager**: Multi-threaded RTSP and webcam stream orchestrator.
- **Attendance Requests & BI Analytics**: Leave justification workflows and interactive Recharts dashboards.

---

## 5. 📡 REST API Reference Overview

### Core User & IAM Endpoints (Port 8001)
- `POST /api/v1/auth/login` - User login and token generation
- `POST /api/v1/auth/refresh` - Refresh access token
- `GET /api/v1/auth/me` - Current user profile, roles, and permissions
- `POST /api/v1/auth/change-password` - Change account password
- `GET /api/v1/users` - List users with search & department filters
- `POST /api/v1/users` - Create user profile and assign roles
- `GET /api/v1/rbac/roles` - Manage roles and permission assignments
- `GET /api/v1/rbac/permissions` - List available system permissions
- `GET /api/v1/organization/departments` - List departments
- `GET /api/v1/organization/positions` - List job positions

### Face AI & Attendance Endpoints (Port 8000)
- `GET /api/v1/employees` - List registered facial profiles
- `POST /api/v1/employees/{id}/register-face` - Register 512D face embeddings
- `GET /api/v1/attendance` - Query attendance history
- `POST /api/v1/attendance/check-in` - Manual photo verification
- `GET /api/v1/devices` - List connected RTSP & webcam streams
- `GET /api/v1/analytics/summary` - Executive HRM BI analytics
- `WS /ws/attendance` - Real-time WebSocket attendance feed

---

## 6. 🧪 Automated E2E Testing (Playwright)

The project includes an enterprise-grade automated testing suite using Playwright:
- **UI & Flow Verification (`e2e/dashboard.spec.js`)**: Tests seamless tab switching, live dashboards, and ensures zero runtime errors (`ReferenceError`, `TypeError`).
- **English Localization Integrity (`e2e/i18n.spec.js`)**: Guarantees zero Vietnamese strings appear in English mode.
- **Security & Secret Leak Audit (`e2e/security.spec.js`)**: Verifies `.gitignore` rules and ensures credentials/private RTSP URLs are never committed to Git.

```powershell
# Run all automated tests on Windows
.\service.ps1 test

# Or on Linux / macOS
./service.sh test

# Interactive UI Mode
cd frontend
npm run test:e2e:ui
```

---

## 7. 🔒 Security & Git Control

- **Environment Isolation**: `.env`, `.env.*`, `secrets.json`, private keys (`*.pem`, `*.key`), database files, and camera snapshots/logs are fully git-ignored.
- **Credential Hygiene**: Public templates (`.env.example`) strictly use dummy placeholders.

---

## 8. ⚙️ Environment Configuration

### Root Face AI Service (`.env`)
```env
PORT=8000
POSTGRES_SERVER=127.0.0.1
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres123
POSTGRES_DB=vface_db
FACE_MODEL_NAME=buffalo_l
LIVENESS_ENABLED=True
STRANGER_ALERT_ENABLED=True
```

### Core User Service (`services/core-user/.env`)
```env
PORT=8001
POSTGRES_SERVER=127.0.0.1
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres123
POSTGRES_DB=vface_db
JWT_SECRET_KEY=your_production_secret_key
ACCESS_TOKEN_EXPIRE_MINUTES=1440
REFRESH_TOKEN_EXPIRE_DAYS=7
```

---

## 7. 📄 License & Attribution

Developed with ❤️ for intelligent enterprise workforce automation. Powered by [InsightFace](https://github.com/deepinsight/insightface), [pgvector](https://github.com/pgvector/pgvector), [FastAPI](https://fastapi.tiangolo.com/), and [React](https://react.dev/).
