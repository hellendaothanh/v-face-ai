<div align="center">

# V-Face Pro: Enterprise Microservices Ecosystem (Face AI, Core User IAM, HRM & Helpdesk)

[English](README.md) | [Tiếng Việt](README_VI.md)

---

</div>

**V-Face Pro** is an enterprise-grade microservices ecosystem designed for intelligent workforce management, identity access control, and multi-service expansion (Face AI Attendance, HRM, Helpdesk). Built with **FastAPI** (Python 3.13) and **React 19 + Tailwind CSS**, powered by the **AI ArcFace Core v1.4.0** engine (**InsightFace buffalo_l** with 512-dimensional vector embeddings, **PostgreSQL 16 with pgvector HNSW indexing**), **MiniFASNetV2 Anti-Spoofing Liveness**, **Multi-Threaded Camera Manager**, **Stranger Threat Detection**, and a standalone **Core User & IAM Service (Port 8001)** for unified enterprise authentication, granular RBAC, and organization hierarchy.

---

## 1. High-Level Microservices Architecture

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                   Frontend: React 19 + Vite + Tailwind CSS + Recharts (Port 3000)      │
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

<div align="center">

![Realtime Dashboard Workspace](docs/screenshots/dashboard.png)
*Figure 1: V-Face Pro Live Attendance Dashboard & Camera Surveillance Workspace*

</div>

---

## 2. Quick Start & Multi-Service Orchestration

V-Face provides unified service management scripts for **Windows PowerShell** (`service.ps1`), **Linux/macOS Bash** (`service.sh`), and `Makefile`.

### 2.1. Primary Commands

| Action | Windows PowerShell (`service.ps1`) | Linux/macOS (`service.sh`) | `make` Command | Description |
| :--- | :--- | :--- | :--- | :--- |
| **Start All** | `.\service.ps1 start` | `./service.sh start` | `make start` | Spawns PostgreSQL, Core User, Face AI & Frontend |
| **Stop All** | `.\service.ps1 stop` | `./service.sh stop` | `make stop` | Safely terminates all running services |
| **Restart All** | `.\service.ps1 restart` | `./service.sh restart` | `make restart` | Restarts all services and containers |
| **Check Status**| `.\service.ps1 status` | `./service.sh status` | `make status` | Displays PIDs, listening ports (8001, 8000, 3000, 5432) |
| **Realtime Logs**| `.\service.ps1 logs` | `./service.sh logs` | `make logs` | Streams consolidated logs of all services |

### 2.2. Granular Microservice Control

```powershell
# Windows PowerShell:
.\service.ps1 start core-user      # Start Core User Service only (Port 8001)
.\service.ps1 logs core-user       # Stream Core User logs
.\service.ps1 restart backend      # Restart Face AI Backend (Port 8000)
.\service.ps1 start frontend       # Start React Web App (Port 3000)
```

```bash
# Linux / macOS:
./service.sh start core-user       # Start Core User Service only (Port 8001)
./service.sh logs core-user        # Stream Core User logs
./service.sh restart backend       # Restart Face AI Backend (Port 8000)
./service.sh start frontend        # Start React Web App (Port 3000)
```

---

## 3. Ecosystem Services & API Documentation

| Service | Port | Base URL | Swagger Documentation | Description |
| :--- | :---: | :--- | :--- | :--- |
| **Core User & IAM** | `8001` | `http://localhost:8001` | [http://localhost:8001/docs](http://localhost:8001/docs) | Authentication, RBAC, Users, Organization |
| **Face AI Attendance** | `8000` | `http://localhost:8000` | [http://localhost:8000/docs](http://localhost:8000/docs) | Face Recognition, Streams, Attendance logs |
| **Frontend Dashboard** | `3000` | `http://localhost:3000` | - | React 19 UI for Attendance & Admin |

### Default Administrator Credentials:
- **Username / Email:** `admin` / `admin@vface.ai`
- **Password:** `admin123`
- **Employee Code:** `EMP000`
- **Assigned Role:** `superadmin`

---

## 4. Key Capabilities by Service

### 4.1. Microservices System Health Matrix
- **Real-Time Latency & Uptime Monitoring**: The `System Health Matrix` sidebar module provides live visual inspection of service operational status (Healthy/Degraded), round-trip response latency (in milliseconds), and version telemetry across microservices.
- **Comprehensive Infrastructure Coverage**:
  - **Core User & IAM Service (Port 8001)**: Monitors authentication throughput, user profile loads, and RBAC permission evaluation latency.
  - **Face AI Attendance Backend (Port 8000)**: Live monitoring of AI Engine warm-up status (InsightFace) and camera worker pools.
  - **PostgreSQL 16 pgvector (Port 5432)**: Validates database connection pools, table migrations, and HNSW vector index readiness.
  - **Realtime WebSocket Channel**: Real-time health validation for `/ws/attendance` streaming connections.

### 4.2. Comprehensive ITIL Helpdesk & Service Desk (`services/core-user` - Port 8001)
- **ITIL Incident & Service Request Lifecycle**: Structured ticket workflow management (`Open` ➜ `In Progress` ➜ `Resolved` ➜ `Closed`).
- **Automated 4-Tier SLA Priority Matrix (P1 to P4)**:
  - Dynamically calculates priority based on **Impact** and **Urgency**: `P1 - Critical` (< 1h SLA), `P2 - High` (< 4h SLA), `P3 - Medium` (< 8h SLA), and `P4 - Low` (< 24h SLA).
- **Multi-Dimensional Contextual Tags**: Fast tagging and routing with badges (`#camera`, `#network`, `#iam`, `#hardware`, `#attendance`).
- **Technical Log History & CSAT Satisfaction Rating**: Real-time back-and-forth technician comments with 1-5 star CSAT feedback upon ticket resolution.
- **Advanced Knowledge Base (KB)**: Self-service solution repository with rich Markdown editor (Bold, Italic, Code blocks, Alert Callouts) and smart search.

### 4.3. Leave & Attendance Exceptions Management (HRM)
- **Comprehensive HR Request Types**:
  - **Full-day Leave & Half-day Leave**: Annual leave, sick leave, unpaid/paid personal leave.
  - **Business Trips & On-site Missions**: Field work and remote client site attendance tracking.
  - **Late Arrival & Early Departure Excuses**: Traffic/incident justifications with auto-exemption from attendance deductions.
  - **Overtime Requests (OT)**: Extra work hour logging and approvals.
- **Multi-Level Approval Workflow**: Role-restricted authorization enabling Department Managers and HR Managers to approve or reject requests with audit commentary.
- **Daily Operational Summary**: Instant summary cards reporting on-duty ratios, absent rates, on-site personnel, and pending approval queues.

### 4.4. 1-Click Biometric Face ID Login (`app/` - Port 8000 & `services/core-user` - Port 8001)
- **Multi-Mode Authentication**: Users can authenticate using traditional username/password or instant **1-Click Face ID**.
- **Interactive Enterprise Biometric HUD**: Live webcam stream with animated oval alignment target frame, scanner indicator, and automatic camera activation.
- **3-Layer Security Pipeline**:
  1. **Anti-Spoofing Liveness Detection (MiniFASNetV2 ONNX)**: Discards printed photos, screens, and masks ($<0.35$ confidence threshold).
  2. **512D ArcFace Extraction & Multi-Template pgvector Matching**: Retrieves the closest facial embedding from the 5 registered angles (`<=>` Cosine Distance).
  3. **Microservice IAM Token Proxy**: Calls Core User IAM Service (`POST /api/v1/auth/face-token`) to issue standard JWT access & refresh tokens.
- **Personalized Onboarding**: Automatically redirects user to the Dashboard with personalized greetings upon successful face recognition.

<div align="center">

![1-Click Biometric Face ID Login](docs/screenshots/login_face_id.png)
*Figure 2: 1-Click Biometric Face ID Login with Live Optical Liveness HUD & Language Switcher*

</div>

### 4.5. Unified HR & Biometrics Management Hub (`UnifiedHRHub` - Port 3000 & Port 8001)

The **Unified HR Hub** centralizes workforce operations, 512D facial biometrics, and Zero-Trust IAM access control across 3 dedicated workspace tabs:

<div align="center">

![Unified HR & Biometrics Management Hub](docs/screenshots/hr_hub.png)
*Figure 3: Unified HR & Biometrics Hub (Personnel Roster, 512D Vector Embeddings & IAM Sync)*

</div>

#### Tab 1: Personnel & Face AI 512D Roster
- **Employee Directory**: Instant search, department filtering, employment status, and IAM account linkage.
- **5-Angle Face Enrollment (5 Templates / Employee)**: Guided 5-angle capture (Frontal 0°, Tilt Up +15°, Tilt Down -15°, Turn Left -30°, and Turn Right +30°).
- **Live Biometric Verification Modal**: Instant face-match test against pgvector embeddings with real-time confidence scores and cosine similarity metrics (`POST /api/v1/employees/{id}/verify-face`).

#### Tab 2: RBAC Roles & Granular Permissions
- **14 Atomic Permissions Matrix**: Fine-grained access control across modules (`User`, `Attendance`, `Camera`, `RBAC`, `Organization`, `Helpdesk`).
- **Anti-Privilege Escalation**: Prevents subordinate privilege escalation and locks immutable system roles (`superadmin`).

#### Tab 3: Organizational Structure (Departments & Positions)
- **Hierarchy Management**: Department and job position management with employee counts and structural mapping.

### 4.6. Face AI Attendance & Camera Monitoring (AI ArcFace Core v1.4.0 - Port 8000)
- **AI ArcFace Core v1.4.0 Engine**: Powered by **InsightFace (buffalo_l)** producing 512-dimensional vector embeddings, paired with **PostgreSQL 16 pgvector HNSW indexing** for sub-second recognition.
- **Continuous Self-Learning (Auto Face Update)**: Dynamically extracts and enriches auxiliary facial templates when check-in confidence $\ge 95\%$.
- **Flexible Camera View Modes**:
  - **3 Viewport Layouts**: `Standard` (4:3 crisp), `Wide` (16:9 widescreen), and `Cinema` (21:9 ultra-wide).
  - **HUD Bounding Box Overlay & Fullscreen**: Real-time on-screen identity tags displaying Name, User Code, Similarity %, and Check-in status.
- **Stranger Threat Alert with Anti-Spam Debounce**:
  - **Threat Detection Threshold**: Flags unrecognized faces with match confidence $< 70\%$.
  - **3-Consecutive-Frame Counter**: Filters out transient movement artifacts and passing pedestrians.
  - **60-Second Cooldown Debounce**: Prevents siren alarm spamming and preserves WebSocket bandwidth.

### 4.7. Header Quick Controls & Multi-Device Stream Switcher
- **Quick Source Switcher**: Instant one-click toggle in the top navigation header between `[PC Webcam]` (Integrated Laptop Camera) and `[IP Cam]` (RTSP stream from Tapo C200, Hikvision, Dahua).
- **Global Stream Power Control**: One-click `[Turn On Camera]` / `[Turn Off Camera]` master toggle without navigating away from the current view.
- **Real-Time Backend Latency & Health Indicator**: Displays live API roundtrip ping (ms), WebSocket streaming status, and active camera source telemetry directly in the global header.

### 4.8. My Account Self-Service & Secure Password Management
- **Full-Screen Profile Workspace ("My Account")**: Dedicated left-sidebar navigation tab allowing all authenticated users to manage their personal profile and credentials.
- **Hero Identity Banner**: Features initials avatar, Username, Employee/User Code, Department & Position badges, RBAC role chips (`superadmin`, `admin`, `hr_manager`, etc.), and live Face AI biometric vector counters (`5/5 templates`).
- **Profile Self-Service**: Full Name and Phone Number self-updates with automatic dual-sync between Core User IAM and Face AI Employee roster, while protecting immutable system fields (Email, User Code).
- **Self-Service Password Change**:
  - Secure old password verification.
  - New password length validation ($\ge 6$ chars) with confirm password matching.
  - Eye visibility toggles and one-way `bcrypt` password hashing.

### 4.9. Enterprise Zero-Trust Defense-in-Depth Authorization (RBAC & ABAC)
- **3-Layer Security Architecture**:
  - **Layer 1 (Gateway / Core IAM)**: Signature validation, Token expiry, and active account verification.
  - **Layer 2 (Atomic RBAC Guards)**: 14 atomic permission codes verified via FastAPI dependency factories (`RequirePermission(...)`, `require_permissions(...)`).
  - **Layer 3 (ABAC Row-Level Security Scoping)**:
    - `Superadmin` and `HR Manager`: Unrestricted organization-wide query access.
    - `Department Manager`: Queries automatically scoped to `department_id == current_user.department_id`, **completely preventing cross-department data exposure**.
- **Anti-Privilege Escalation Matrix**:
  - Non-superadmins cannot create or edit roles granting permissions they do not possess.
  - Subordinate accounts cannot assign `superadmin` role to other users.
  - System default roles (`superadmin`) are permanently locked and cannot be deleted or stripped of privileges.
  - Strict self-deletion protection prevents users from accidentally deleting their own active session.

### 4.10. Full Internationalization & Multilingual Support (i18n)
- **Bi-Directional Language Switching**: Instant toggle between **English (`[EN]`)** and **Vietnamese (`[VI]`)** via the header language switcher and login screen toggle.
- **Comprehensive Localization**: Covers 100% of UI strings, form labels, table columns, biometric HUD guidance messages, error notifications, and date/time formatting.

### 4.11. Smart Floating "Scroll to Top" Action Button
- **Glassmorphism & Neon Glow Design**: Circular floating button (`fixed bottom-7 right-7 z-50`) with an indigo ambient glow.
- **SVG Circular Scroll Progress Meter**: Dynamically traces page scroll percentage (0% to 100%) in an animated glowing ring.
- **Smart Visibility & Micro-Animations**:
  - Automatically hidden at top of viewport; smoothly fades and zooms in when scrolled beyond `240px`.
  - Tooltip on hover displaying `XX% • Back to top`.
  - Native smooth scrolling behavior returning the user to the top with a single click.

---

## 5. REST API Reference Overview

### Core User, IAM & Helpdesk Endpoints (Port 8001)
- `POST /api/v1/auth/login` - User login and token generation
- `POST /api/v1/auth/face-token` - Issue JWT tokens for biometrically verified Face ID users
- `POST /api/v1/auth/refresh` - Refresh access token
- `GET /api/v1/auth/me` - Current user profile, roles, and permissions
- `POST /api/v1/auth/change-password` - Change account password
- `GET /api/v1/users` - List users with search & department filters
- `POST /api/v1/users` - Create user profile and assign roles
- `GET /api/v1/rbac/roles` - Manage roles and permission assignments
- `GET /api/v1/rbac/permissions` - List available system permissions
- `GET /api/v1/organization/departments` - List departments
- `GET /api/v1/organization/positions` - List job positions
- `GET /api/v1/helpdesk/tickets` - List & filter ITIL support tickets
- `POST /api/v1/helpdesk/tickets` - Create new support ticket / incident
- `PATCH /api/v1/helpdesk/tickets/{id}` - Update ticket status & resolution
- `POST /api/v1/helpdesk/tickets/{id}/comments` - Add internal / public comment
- `POST /api/v1/helpdesk/tickets/{id}/feedback` - Submit CSAT rating
- `GET /api/v1/helpdesk/kb/categories` - List KB categories
- `GET /api/v1/helpdesk/kb/articles` - Search KB solution articles
- `POST /api/v1/helpdesk/kb/articles` - Publish new KB solution article
- `PUT /api/v1/helpdesk/kb/articles/{id}` - Update KB solution article
- `DELETE /api/v1/helpdesk/kb/articles/{id}` - Delete KB article
- `POST /api/v1/helpdesk/kb/articles/{id}/helpful` - Vote KB article as helpful
- `GET /health` - Microservice health status and uptime telemetry

### Face AI & Attendance Endpoints (Port 8000)
- `POST /api/v1/auth/face-login` - 1-Click Biometric Face ID login with anti-spoofing & IAM token proxy
- `GET /api/v1/employees` - List registered facial profiles
- `POST /api/v1/employees/{id}/register-face` - Register 512D face embeddings (5 angles)
- `POST /api/v1/employees/{id}/verify-face` - Live face match verification modal against registered pgvector templates
- `GET /api/v1/attendance` - Query attendance history with multi-filter parameters
- `POST /api/v1/attendance/check-in` - Manual photo verification and check-in
- `GET /api/v1/requests` - Query HRM leave and exception requests
- `POST /api/v1/requests` - Submit leave, excuse, business trip, or overtime request
- `PUT /api/v1/requests/{id}/approve` - Approve pending HRM request
- `PUT /api/v1/requests/{id}/reject` - Reject pending HRM request
- `GET /api/v1/requests/daily-summary` - Daily attendance and exception summary
- `GET /api/v1/devices` - List and query camera devices telemetry
- `PUT /api/v1/devices/{id}/toggle` - Quick toggle remote camera stream worker
- `GET /api/v1/analytics/summary` - Executive HRM BI analytics
- `GET /api/v1/analytics/weekly-punctuality` - Weekly punctuality chart metrics
- `GET /api/v1/analytics/department-lateness` - Department lateness breakdown metrics
- `GET /api/v1/analytics/hourly-density` - Hourly check-in density metrics
- `WS /ws/attendance` - Real-time WebSocket attendance and threat feed
- `GET /health` - Microservice health status and AI engine status

---

## 6. Automated Testing Suites

### 6.1. Comprehensive 10-Module Microservices & Biometrics E2E Suite (`tests/test_e2e_full_system.py`)
Run the all-inclusive microservices E2E test suite covering Zero-Trust security, RBAC, ABAC Data Scoping, anti-privilege escalation, organizations, unified identity sync, 5-angle biometrics, live verification, ITIL helpdesk, 1-Click Face ID login, and password self-service:

```powershell
# Windows
.\venv\Scripts\python.exe tests/test_e2e_full_system.py

# Linux / macOS
./venv/bin/python tests/test_e2e_full_system.py
```

**Results (44/44 Tests PASS - 100%)**:
- **Module 1**: Authentication & JWT (`/auth/login`, `/auth/me`, token verification)
- **Module 2**: RBAC Roles & Authorization (Role listing, admin existence, 14 atomic permissions)
- **Module 3**: Organization Structure (Departments, Positions CRUD)
- **Module 4**: Unified Personnel & IAM Sync (Face AI Employee $\leftrightarrow$ Core User IAM sync)
- **Module 5**: 5-Angle Face Registration & pgvector (5 vector embeddings stored & linked)
- **Module 6**: Live Face Verification & Attendance (`/verify-face`, `/attendance/check-in`)
- **Module 7**: ITIL Helpdesk & Service Tickets (Ticket creation, AI auto-resolution response)
- **Module 8**: 1-Click Biometric Face ID Login (`POST /auth/face-login`, JWT issuance, `/auth/me` verification)
- **Module 9**: My Account Profile Update & Password Change (`PUT /users/{id}/profile`, `POST /auth/change-password`)
- **Module 10**: Zero-Trust Security, ABAC Data Scoping & Anti-Privilege Escalation (Immutable `superadmin` role protection, privilege escalation prevention, departmental data scoping, self-deletion prevention)

### 6.2. Playwright Frontend & UI Testing
- **UI & Flow Verification (`e2e/dashboard.spec.js`)**: Tests seamless tab switching, live dashboards, and ensures zero runtime errors.
- **Localization Integrity (`e2e/i18n.spec.js`)**: Guarantees zero Vietnamese strings appear in English mode.
- **Security & Secret Leak Audit (`e2e/security.spec.js`)**: Verifies `.gitignore` rules and ensures credentials/private RTSP URLs are never committed.

```powershell
# Run Playwright tests on Windows
.\service.ps1 test

# Or on Linux / macOS
./service.sh test
```

---

## 7. Security & Configuration Management

- **Environment Isolation**: All `.env`, `.env.*`, `secrets.json`, SSL certificates (`*.pem`, `*.key`, `*.cert`), and log/upload directories are strictly ignored via `.gitignore` to prevent credential exposure.
- **Sample Data**: Use `.env.example` and sample URLs (`rtsp://admin:password@192.168.1.100:554/stream1`) for configuration reference.

---

## 8. Enterprise Feature Roadmap

The V-Face Pro architecture is designed for continuous enterprise capability expansion across four strategic milestones:

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           V-FACE PRO ENTERPRISE ROADMAP                                │
├──────────────────────────┬──────────────────────────┬───────────────────────────────────┤
│ Phase 1: Biometrics & AI │ Phase 2: HRM & Payroll   │ Phase 3: Access Control & IoT     │
│ • PPE / Mask Detection   │ • Multi-Shift Scheduling │ • Turnstile / Barrier Gate Relay  │
│ • Gesture Liveness Check │ • Automated Payroll Calc │ • Wiegand & MQTT IoT Protocols    │
│ • Multi-Face Batch RTSP  │ • Export Excel & PDF     │ • TensorRT Edge Box (Jetson)      │
└──────────────────────────┴──────────────────────────┴───────────────────────────────────┘
```

### Phase 1: Advanced AI & Biometrics (Face AI Hub Expansion)
- **PPE Compliance & Mask Detection (YOLOv8 / MobileNet)**: Real-time detection of surgical masks, safety helmets, and protective eyewear for factory floors, cleanrooms, and construction sites with compliance logging.
- **Interactive Gesture Liveness (Challenge-Response)**: Multi-modal active anti-spoofing requiring micro-gestures (e.g., eye blink sequence, head nod, or natural smile) to eliminate high-definition video playback and deepfake spoofing.
- **Multi-Face Batch Attendance (High-Density RTSP)**: Parallel batch facial extraction and pgvector multi-matching for up to 10 simultaneous faces per frame on turnstile camera streams.
- **Demographics & Mood Analytics**: Passive workplace sentiment scoring and aggregate age/gender distributions for smart office analytics.

### Phase 2: Enterprise HRM, Shift Scheduling & Automated Payroll
- **Complex Multi-Shift Roster**: Support for rotating shifts, overnight shifts, flexible work hours, grace periods, and automated shift swapping workflows.
- **Automated Payroll Engine**: Instant timesheet computation linking attendance logs, approved overtime (OT), late deductions, and leave balances directly into customizable payroll formulas with Excel / PDF export.

### Phase 3: Smart Access Control & IoT Hardware Integration
- **Turnstile / Barrier Gate Relay Integration**: Direct hardware triggering via Relay Modules, MQTT brokers, and Wiegand 26/34 controllers for automated physical door unlocking upon valid biometric verification.
- **Edge AI Box Deployment**: Optimized TensorRT / OpenVINO inference pipelines packaged for low-power edge gateways (NVIDIA Jetson Orin Nano, Raspberry Pi 5).

### Phase 4: Mobile & PWA Self-Service Workforce App
- **Geofenced Mobile Check-in**: GPS boundary radius enforcement and corporate Wi-Fi BSSID validation for field engineers and remote workforce check-in.
- **Push Notification Center**: Instant mobile alerts for leave approval updates, shift assignments, and anomalous check-in warnings.

---

## 9. License & Acknowledgments

This project is built on open-source technologies: [InsightFace](https://github.com/deepinsight/insightface), [pgvector](https://github.com/pgvector/pgvector), [FastAPI](https://fastapi.tiangolo.com/), [Playwright](https://playwright.dev/), and [React](https://react.dev/).
