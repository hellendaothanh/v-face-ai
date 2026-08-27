<div align="center">

# V-Face Pro: Enterprise AI Face Recognition Attendance & HRM System

[🇬🇧 English](README.md) | [🇻🇳 Tiếng Việt](README_VI.md)

---

</div>

**V-Face Pro** is an enterprise-grade full-stack smart attendance and workforce intelligence solution. Built with **FastAPI** (Python 3.13) and **React 19 + Tailwind CSS**, powered by **PostgreSQL 16 with pgvector** (512-dimensional ArcFace embeddings), **InsightFace (buffalo_l)** optimized for **Apple Silicon M4 CoreML/MPS**, **MiniFASNetV2 Anti-Spoofing**, **Multi-Threaded Camera Manager**, **Stranger Threat Detection**, **Attendance Request / Exception Management**, and **Interactive HRM Analytics BI Dashboards (Recharts)**.

---

## 1. 🏗️ High-Level System Architecture

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                   Frontend: React 19 + Vite + Tailwind CSS + Recharts                  │
│  ┌───────────────────────┬──────────────────────┬───────────────────────────────────┐  │
│  │  Realtime Dashboard   │   HRM & Attendance   │   Camera Devices & BI Analytics   │  │
│  │ • 3 View Modes+Fullscr│ • 5-Photo Multi-Face │ • Multi-Device RTSP Switcher      │  │
│  │ • Bounding Box HUD    │ • Leave & Exceptions │ • Weekly Line / Dept Bar / Hourly │  │
│  └───────────────────────┴──────────────────────┴───────────────────────────────────┘  │
└────────────────────────────▲──────────────────────────────────▲────────────────────────┘
                             │ REST API (Axios)                 │ WebSocket (/ws/attendance)
                             ▼                                  ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        FastAPI Async Backend Framework (Port 8000)                     │
│ ────────────────────────────────────────────────────────────────────────────────────── │
│ • CameraManager: Multi-threaded worker lifecycle for concurrent RTSP / Webcam streams  │
│ • StreamProcessor: Multi-face parallel inference pipeline (asyncio.gather)             │
│ • Anti-Spoofing Engine: MiniFASNetV2 ONNX + Fourier Moire texture analysis             │
│ • Continuous Self-Learning (Auto Face Update): Embeds newest vector when confidence>95%│
│ • Stranger Threat Detector: 3-frame counter trigger (<70% match) + Audio security siren│
│ • Exception Calculator: Dynamic work-hour synthesis matching approved leave requests   │
│ • TrueType Font Engine: In-canvas Unicode Vietnamese text & bounding box HUD renderer  │
└────────────────────────────┬──────────────────────────────────┬────────────────────────┘
                             │                                  │
                             ▼                                  ▼
┌────────────────────────────────────────┐   ┌───────────────────────────────────────────┐
│     PostgreSQL 16 + pgvector Database  │   │            Local File Storage             │
│ • HNSW Cosine Distance Index (<=>)     │   │ • 5-angle face enrollment photos (.jpg)   │
│ • Employees, FaceFeatures, Devices     │   │ • Real-time cropped check-in snapshots    │
│ • AttendanceRecords, LeaveRequests     │   │ • AI Weights: InsightFace & MiniFASNet    │
└────────────────────────────────────────┘   └───────────────────────────────────────────┘
```

---

## 2. 🚀 Quick Start & Service Orchestration (Recommended)

V-Face provides an automated service management script ([service.sh](file:///Users/hautp/Documents/Projects/v-face/service.sh)) and `Makefile` to start, stop, restart, and monitor all processes without juggling multiple terminal tabs.

### 2.1. Primary Commands

| Action | `service.sh` Command | `make` Command | Description |
| :--- | :--- | :--- | :--- |
| **Start All** | `./service.sh start` | `make start` | Spawns PostgreSQL container, Backend & Frontend |
| **Stop All** | `./service.sh stop` | `make stop` | Safely terminates all running services |
| **Restart All** | `./service.sh restart` | `make restart` | Restarts all containers and workers |
| **Check Status** | `./service.sh status` | `make status` | Displays PIDs, listening ports (8000, 5173, 5432) & health |
| **Realtime Logs** | `./service.sh logs` | `make logs` | Streams consolidated backend & frontend logs |

### 2.2. Granular Service Control

```bash
# Manage Backend only (FastAPI on Port 8000)
./service.sh restart backend
./service.sh logs backend      # Output file: logs/backend.log

# Manage Frontend only (Vite/React on Port 5173)
./service.sh restart frontend
./service.sh logs frontend     # Output file: logs/frontend.log

# Manage Database only (Postgres pgvector container)
./service.sh restart db
```

---

## 3. 💻 Manual Setup & Local Development

### Step 1: Start PostgreSQL + pgvector Docker Container
```bash
docker compose up -d
```

### Step 2: Start FastAPI Backend
```bash
# Activate Python virtual environment
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run Uvicorn ASGI server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
- **Backend Base URL**: `http://localhost:8000`
- **Interactive Swagger Docs**: `http://localhost:8000/docs`
- **Live WebSocket Feed**: `ws://localhost:8000/ws/attendance`

### Step 3: Start Vite + React Frontend
In a new terminal window:
```bash
cd frontend
npm install
npm run dev
```
- **Frontend Web Dashboard**: `http://localhost:5173`

---

## 4. 🌟 Key Enterprise Features

### 4.1. 🖥️ Realtime AI Live Monitor (Multi-View System)
- **4 Ergonomic View Modes**:
  - **Standard (5/7 Grid)**: Balanced view between live video and attendance feed.
  - **Wide (8/4 Grid)**: 2/3 wide camera view for large control rooms.
  - **Cinema (12/12 Full-Width)**: Top ultra-wide video monitor + dual bottom telemetry cards.
  - **Fullscreen Mode (`Maximize2`)**: Full-screen kiosk display for reception desks and security gates.
- **Dynamic AI HUD Bounding Boxes**:
  - 🟢 **Emerald Box**: Verified employee check-in + Employee code + Confidence %.
  - ✨ **Gold Box**: Auto-Learned template update triggered ($\ge 95\%$).
  - 🟡 **Amber Box**: Employee already checked in (5-minute cooldown debounce).
  - 🔴 **Rose Box**: Unknown stranger detected ($< 70\%$ match).
  - 🚨 **Flashing Crimson Box**: Anti-spoofing attack blocked.

### 4.2. 🛡️ Face Anti-Spoofing & Stranger Threat Alert
- **Liveness Detection (MiniFASNetV2 ONNX + Fourier Moire Analysis)**: Detects printed photos, smartphone screen replays, and tablet presentations.
- **Stranger Alert Engine**: Consecutive 3-frame counter triggers real-time WebSocket security broadcasts, snapshots, and audio alarm sirens.

### 4.3. 👥 Multi-Template Enrollment & Continuous Self-Learning (Auto Face Update)
- **5-Angle Photo Registration**: Enrolls Portrait, Left Tilt, Right Tilt, Slight Downward, and Smile angles to maximize accuracy under angled camera views.
- **Continuous Self-Learning**: When an employee checks in with high confidence ($\ge 95\%$), the backend seamlessly saves the new feature vector to PostgreSQL, allowing the system to self-adapt as employees change hairstyles or age over time.

### 4.4. 📝 Attendance Requests & Leave Exception Management
- **4 Supported Request Types**:
  1. `HALF_DAY_LEAVE_AM`: Morning half-day leave (Credited 0.5 work-day).
  2. `HALF_DAY_LEAVE_PM`: Afternoon half-day leave (Credited 0.5 work-day).
  3. `BUSINESS_TRIP`: Offsite business trip (Credited 1.0 work-day).
  4. `LATE_EXCUSE`: Late arrival / early departure justification (Credited 1.0 work-day, waives penalties).
- **Approval Workflow & Daily Synthesis**: Manager review workflow automatically reconciles daily timecards against approved exemptions.

### 4.5. 📹 Centralized Multi-Camera Manager (`CameraManager`)
- **Multi-Threaded Architecture**: Manages multiple concurrent RTSP cameras (Tapo C200, Hikvision, Dahua) and built-in FaceTime HD webcams.
- **Real-Time Remote Toggle Switch**: Instantly start or stop camera workers via `PUT /api/v1/devices/{id}/toggle`.
- **Purpose Categorization**: Assigns cameras as `CHECK_IN` (Entrance), `CHECK_OUT` (Exit), or `BOTH` (Bi-directional gate).

### 4.6. 📊 Interactive HRM Analytics & BI Dashboard (Recharts)
- 📈 **LineChart**: 7/14/30-day weekly punctuality rate trend.
- 📊 **BarChart**: Department lateness distribution across IT, Engineering, Sales, HR, etc.
- 🌊 **AreaChart**: 30-minute hourly check-in arrival density curves with gradient fills.
- 📌 **Executive KPI Cards**: Average punctuality rate, peak arrival time slot, most punctual department, and total daily throughput.

---

## 5. 📡 REST API & WebSocket Endpoint Reference

| Module | Method | Endpoint | Description |
| :--- | :---: | :--- | :--- |
| **Employees** | `GET` | `/api/v1/employees` | List paginated employees |
| | `POST` | `/api/v1/employees` | Create employee profile |
| | `POST` | `/api/v1/employees/{id}/register-face` | Extract & register 512D face embeddings |
| | `DELETE` | `/api/v1/employees/{id}` | Delete employee and associated face vectors |
| **Attendance** | `GET` | `/api/v1/attendance` | Query historical attendance logs with filters |
| | `POST` | `/api/v1/attendance/check-in` | Manual photo upload check-in |
| **Requests** | `GET` | `/api/v1/requests` | List leave and exception requests |
| | `POST` | `/api/v1/requests` | Submit new attendance request |
| | `PUT` | `/api/v1/requests/{id}/approve` | Approve request |
| | `PUT` | `/api/v1/requests/{id}/reject` | Reject request |
| | `GET` | `/api/v1/requests/daily-summary` | Generate daily work-day synthesis report |
| **Devices** | `GET` | `/api/v1/devices` | List camera devices with live FPS and telemetry |
| | `POST` | `/api/v1/devices` | Add new RTSP / Webcam camera device |
| | `PUT` | `/api/v1/devices/{id}/toggle` | Remote live toggle (start/stop worker thread) |
| | `PUT` | `/api/v1/devices/{id}` | Update device configuration |
| | `DELETE` | `/api/v1/devices/{id}` | Delete camera device |
| **Analytics BI**| `GET` | `/api/v1/analytics/weekly-punctuality` | 7-day punctuality rate trend (LineChart) |
| | `GET` | `/api/v1/analytics/department-lateness`| Department lateness statistics (BarChart) |
| | `GET` | `/api/v1/analytics/hourly-density` | 30-min time slot check-in density (AreaChart) |
| | `GET` | `/api/v1/analytics/summary` | Executive HRM KPI summary metrics |
| **Camera & WS**| `GET` | `/api/v1/camera/status` | Video stream status & AI diagnostics |
| | `GET` | `/api/v1/camera/video_feed` | Live MJPEG video stream with HUD overlays |
| | `WS` | `/ws/attendance` | Real-time WebSocket event broadcaster |

---

## 6. ⚙️ Environment Configuration (`.env`)

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `POSTGRES_SERVER` | `127.0.0.1` | PostgreSQL database host address |
| `POSTGRES_PORT` | `5432` | Database port |
| `POSTGRES_USER` / `PASSWORD` | `postgres` / `postgres123` | Database credentials |
| `POSTGRES_DB` | `vface_db` | PostgreSQL database name |
| `FACE_MODEL_NAME` | `buffalo_l` | InsightFace model name (ArcFace 512D) |
| `CAMERA_BLUR_THRESHOLD` | `15.0` | Motion blur Laplacian variance threshold |
| `CAMERA_MIN_FACE_SIZE` | `60` | Minimum bounding box size in pixels |
| `CAMERA_SIMILARITY_THRESHOLD`| `0.58` | Cosine similarity threshold for positive identification |
| `LIVENESS_THRESHOLD` | `0.50` | Anti-Spoofing real-face confidence threshold |
| `STRANGER_CONFIDENCE_THRESHOLD`| `0.70` | Similarity threshold below which a face is marked stranger |
| `STRANGER_CONSECUTIVE_FRAMES` | `3` | Frame count required before firing stranger alert |
| `STRANGER_COOLDOWN_SECONDS` | `60` | Cooldown period between stranger security alerts |

---

## 7. 📄 License & Attribution

Developed with ❤️ for intelligent enterprise workforce automation. Powered by [InsightFace](https://github.com/deepinsight/insightface), [pgvector](https://github.com/pgvector/pgvector), [FastAPI](https://fastapi.tiangolo.com/), and [React](https://react.dev/).
