#!/bin/bash

# ==============================================================================
# V-Face Service Manager Script
# Supports: start | stop | restart | status | logs
# Targets:  all (default) | backend | frontend | db
# ==============================================================================

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_DIR="${PROJECT_ROOT}/.pids"
LOG_DIR="${PROJECT_ROOT}/logs"

BACKEND_PID_FILE="${PID_DIR}/backend.pid"
FRONTEND_PID_FILE="${PID_DIR}/frontend.pid"
BACKEND_LOG_FILE="${LOG_DIR}/backend.log"
FRONTEND_LOG_FILE="${LOG_DIR}/frontend.log"

BACKEND_PORT=8000
FRONTEND_PORT=5173

# Colors
GREEN="\033[0;32m"
RED="\033[0;31m"
YELLOW="\033[1;33m"
BLUE="\033[0;34m"
CYAN="\033[0;36m"
BOLD="\033[1m"
NC="\033[0m" # No Color

mkdir -p "${PID_DIR}" "${LOG_DIR}"

# Helper: check if a PID is running
is_pid_running() {
    local pid=$1
    if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
        return 0
    fi
    return 1
}

# Helper: find PID by port
get_pid_by_port() {
    local port=$1
    lsof -ti tcp:"${port}" -sTCP:LISTEN 2>/dev/null
}

# ------------------------------------------------------------------------------
# DATABASE (Docker Compose)
# ------------------------------------------------------------------------------
start_db() {
    if command -v docker-compose &>/dev/null || docker compose version &>/dev/null; then
        echo -e "${CYAN}[DB]${NC} Starting PostgreSQL container..."
        if docker compose version &>/dev/null; then
            docker compose -f "${PROJECT_ROOT}/docker-compose.yml" up -d postgres
        else
            docker-compose -f "${PROJECT_ROOT}/docker-compose.yml" up -d postgres
        fi
        echo -e "${GREEN}✔ [DB] PostgreSQL is running.${NC}"
    else
        echo -e "${YELLOW}⚠ [DB] Docker not found or not running. Skipping database container auto-start.${NC}"
    fi
}

stop_db() {
    if command -v docker-compose &>/dev/null || docker compose version &>/dev/null; then
        echo -e "${CYAN}[DB]${NC} Stopping PostgreSQL container..."
        if docker compose version &>/dev/null; then
            docker compose -f "${PROJECT_ROOT}/docker-compose.yml" stop postgres
        else
            docker-compose -f "${PROJECT_ROOT}/docker-compose.yml" stop postgres
        fi
        echo -e "${GREEN}✔ [DB] PostgreSQL container stopped.${NC}"
    fi
}

# ------------------------------------------------------------------------------
# BACKEND
# ------------------------------------------------------------------------------
start_backend() {
    echo -e "${BLUE}▶ Starting Backend (FastAPI)...${NC}"

    # Check if already running by PID file
    if [ -f "${BACKEND_PID_FILE}" ]; then
        local pid
        pid=$(cat "${BACKEND_PID_FILE}")
        if is_pid_running "$pid"; then
            echo -e "${YELLOW}⚠ Backend is already running (PID: ${pid}) on port ${BACKEND_PORT}${NC}"
            return 0
        fi
    fi

    # Check if port is occupied
    local port_pid
    port_pid=$(get_pid_by_port "${BACKEND_PORT}")
    if [ -n "$port_pid" ]; then
        echo -e "${YELLOW}⚠ Port ${BACKEND_PORT} is already in use by PID ${port_pid}.${NC}"
        echo "$port_pid" > "${BACKEND_PID_FILE}"
        return 0
    fi

    # Determine Python executable
    local PYTHON_EXEC="${PROJECT_ROOT}/venv/bin/python"
    if [ ! -f "$PYTHON_EXEC" ]; then
        PYTHON_EXEC="python3"
    fi

    # Run backend
    cd "${PROJECT_ROOT}" || exit 1
    nohup "${PYTHON_EXEC}" -m uvicorn app.main:app --reload --host 0.0.0.0 --port "${BACKEND_PORT}" >> "${BACKEND_LOG_FILE}" 2>&1 &
    local new_pid=$!
    echo "$new_pid" > "${BACKEND_PID_FILE}"

    sleep 1.5
    if is_pid_running "$new_pid"; then
        echo -e "${GREEN}✔ Backend started successfully! (PID: ${new_pid})${NC}"
        echo -e "  API URL:  ${CYAN}http://localhost:${BACKEND_PORT}${NC}"
        echo -e "  Docs URL: ${CYAN}http://localhost:${BACKEND_PORT}/docs${NC}"
        echo -e "  Logs:     ${BACKEND_LOG_FILE}"
    else
        echo -e "${RED}✖ Failed to start Backend. Check logs: ${BACKEND_LOG_FILE}${NC}"
        rm -f "${BACKEND_PID_FILE}"
        return 1
    fi
}

stop_backend() {
    echo -e "${BLUE}■ Stopping Backend...${NC}"
    local pid=""

    if [ -f "${BACKEND_PID_FILE}" ]; then
        pid=$(cat "${BACKEND_PID_FILE}")
    fi

    # If no valid PID in file, look up by port
    if [ -z "$pid" ] || ! is_pid_running "$pid"; then
        pid=$(get_pid_by_port "${BACKEND_PORT}")
    fi

    if [ -n "$pid" ] && is_pid_running "$pid"; then
        kill "$pid" 2>/dev/null
        # Wait up to 5 seconds
        for _ in {1..10}; do
            if ! is_pid_running "$pid"; then
                break
            fi
            sleep 0.5
        done

        # Force kill if still running
        if is_pid_running "$pid"; then
            kill -9 "$pid" 2>/dev/null
        fi

        echo -e "${GREEN}✔ Backend (PID: ${pid}) stopped.${NC}"
    else
        echo -e "${YELLOW}Backend is not running.${NC}"
    fi

    # Also cleanup any leftover uvicorn processes on port 8000
    local remaining_pid
    remaining_pid=$(get_pid_by_port "${BACKEND_PORT}")
    if [ -n "$remaining_pid" ]; then
        kill -9 "$remaining_pid" 2>/dev/null
    fi

    rm -f "${BACKEND_PID_FILE}"
}

# ------------------------------------------------------------------------------
# FRONTEND
# ------------------------------------------------------------------------------
start_frontend() {
    echo -e "${BLUE}▶ Starting Frontend (Vite/React)...${NC}"

    # Check if already running by PID file
    if [ -f "${FRONTEND_PID_FILE}" ]; then
        local pid
        pid=$(cat "${FRONTEND_PID_FILE}")
        if is_pid_running "$pid"; then
            echo -e "${YELLOW}⚠ Frontend is already running (PID: ${pid}) on port ${FRONTEND_PORT}${NC}"
            return 0
        fi
    fi

    # Check if port is occupied
    local port_pid
    port_pid=$(get_pid_by_port "${FRONTEND_PORT}")
    if [ -n "$port_pid" ]; then
        echo -e "${YELLOW}⚠ Port ${FRONTEND_PORT} is already in use by PID ${port_pid}.${NC}"
        echo "$port_pid" > "${FRONTEND_PID_FILE}"
        return 0
    fi

    # Check node_modules
    if [ ! -d "${PROJECT_ROOT}/frontend/node_modules" ]; then
        echo -e "${YELLOW}Installing frontend dependencies...${NC}"
        (cd "${PROJECT_ROOT}/frontend" && npm install)
    fi

    cd "${PROJECT_ROOT}/frontend" || exit 1
    nohup npm run dev >> "${FRONTEND_LOG_FILE}" 2>&1 &
    local new_pid=$!
    echo "$new_pid" > "${FRONTEND_PID_FILE}"

    sleep 1.5
    if is_pid_running "$new_pid"; then
        echo -e "${GREEN}✔ Frontend started successfully! (PID: ${new_pid})${NC}"
        echo -e "  Web URL: ${CYAN}http://localhost:${FRONTEND_PORT}${NC}"
        echo -e "  Logs:    ${FRONTEND_LOG_FILE}"
    else
        echo -e "${RED}✖ Failed to start Frontend. Check logs: ${FRONTEND_LOG_FILE}${NC}"
        rm -f "${FRONTEND_PID_FILE}"
        return 1
    fi
}

stop_frontend() {
    echo -e "${BLUE}■ Stopping Frontend...${NC}"
    local pid=""

    if [ -f "${FRONTEND_PID_FILE}" ]; then
        pid=$(cat "${FRONTEND_PID_FILE}")
    fi

    if [ -z "$pid" ] || ! is_pid_running "$pid"; then
        pid=$(get_pid_by_port "${FRONTEND_PORT}")
    fi

    if [ -n "$pid" ] && is_pid_running "$pid"; then
        kill "$pid" 2>/dev/null
        for _ in {1..10}; do
            if ! is_pid_running "$pid"; then
                break
            fi
            sleep 0.5
        done

        if is_pid_running "$pid"; then
            kill -9 "$pid" 2>/dev/null
        fi

        echo -e "${GREEN}✔ Frontend (PID: ${pid}) stopped.${NC}"
    else
        echo -e "${YELLOW}Frontend is not running.${NC}"
    fi

    local remaining_pid
    remaining_pid=$(get_pid_by_port "${FRONTEND_PORT}")
    if [ -n "$remaining_pid" ]; then
        kill -9 "$remaining_pid" 2>/dev/null
    fi

    rm -f "${FRONTEND_PID_FILE}"
}

# ------------------------------------------------------------------------------
# STATUS
# ------------------------------------------------------------------------------
status() {
    echo -e "${BOLD}====== V-Face Services Status ======${NC}"

    # Database status
    if command -v docker &>/dev/null; then
        local db_container
        db_container=$(docker ps --filter "name=vface_postgres" --format "{{.Status}}" 2>/dev/null)
        if [ -n "$db_container" ]; then
            echo -e "  PostgreSQL: ${GREEN}● Running (${db_container})${NC}"
        else
            echo -e "  PostgreSQL: ${RED}○ Stopped${NC}"
        fi
    fi

    # Backend status
    local backend_pid=""
    if [ -f "${BACKEND_PID_FILE}" ]; then
        backend_pid=$(cat "${BACKEND_PID_FILE}")
    fi
    if [ -z "$backend_pid" ] || ! is_pid_running "$backend_pid"; then
        backend_pid=$(get_pid_by_port "${BACKEND_PORT}")
    fi

    if [ -n "$backend_pid" ] && is_pid_running "$backend_pid"; then
        echo -e "  Backend:    ${GREEN}● Running${NC} (PID: ${backend_pid}, Port: ${BACKEND_PORT}) -> http://localhost:${BACKEND_PORT}/docs"
    else
        echo -e "  Backend:    ${RED}○ Stopped${NC}"
    fi

    # Frontend status
    local frontend_pid=""
    if [ -f "${FRONTEND_PID_FILE}" ]; then
        frontend_pid=$(cat "${FRONTEND_PID_FILE}")
    fi
    if [ -z "$frontend_pid" ] || ! is_pid_running "$frontend_pid"; then
        frontend_pid=$(get_pid_by_port "${FRONTEND_PORT}")
    fi

    if [ -n "$frontend_pid" ] && is_pid_running "$frontend_pid"; then
        echo -e "  Frontend:   ${GREEN}● Running${NC} (PID: ${frontend_pid}, Port: ${FRONTEND_PORT}) -> http://localhost:${FRONTEND_PORT}"
    else
        echo -e "  Frontend:   ${RED}○ Stopped${NC}"
    fi
    echo -e "${BOLD}====================================${NC}"
}

# ------------------------------------------------------------------------------
# LOGS
# ------------------------------------------------------------------------------
view_logs() {
    local target=${1:-"all"}
    case "$target" in
        backend)
            echo -e "${CYAN}Following Backend logs (${BACKEND_LOG_FILE})... (Press Ctrl+C to exit)${NC}"
            tail -f "${BACKEND_LOG_FILE}"
            ;;
        frontend)
            echo -e "${CYAN}Following Frontend logs (${FRONTEND_LOG_FILE})... (Press Ctrl+C to exit)${NC}"
            tail -f "${FRONTEND_LOG_FILE}"
            ;;
        all|*)
            echo -e "${CYAN}Following All logs... (Press Ctrl+C to exit)${NC}"
            tail -f "${BACKEND_LOG_FILE}" "${FRONTEND_LOG_FILE}"
            ;;
    esac
}

# ------------------------------------------------------------------------------
# MAIN CLI ROUTER
# ------------------------------------------------------------------------------
COMMAND=$1
TARGET=${2:-"all"}

case "$COMMAND" in
    start)
        case "$TARGET" in
            backend)
                start_backend
                ;;
            frontend)
                start_frontend
                ;;
            db)
                start_db
                ;;
            all|*)
                start_db
                start_backend
                start_frontend
                ;;
        esac
        ;;
    stop)
        case "$TARGET" in
            backend)
                stop_backend
                ;;
            frontend)
                stop_frontend
                ;;
            db)
                stop_db
                ;;
            all|*)
                stop_frontend
                stop_backend
                ;;
        esac
        ;;
    restart)
        case "$TARGET" in
            backend)
                stop_backend
                start_backend
                ;;
            frontend)
                stop_frontend
                start_frontend
                ;;
            db)
                stop_db
                start_db
                ;;
            all|*)
                stop_frontend
                stop_backend
                start_db
                start_backend
                start_frontend
                ;;
        esac
        ;;
    status)
        status
        ;;
    logs)
        view_logs "$TARGET"
        ;;
    *)
        echo -e "${BOLD}Usage: $0 {start|stop|restart|status|logs} [all|backend|frontend|db]${NC}"
        echo ""
        echo "Examples:"
        echo "  $0 start              # Start both backend & frontend (+ db)"
        echo "  $0 stop               # Stop both backend & frontend"
        echo "  $0 restart            # Restart both"
        echo "  $0 start backend      # Start backend only"
        echo "  $0 stop backend       # Stop backend only"
        echo "  $0 start frontend     # Start frontend only"
        echo "  $0 stop frontend      # Stop frontend only"
        echo "  $0 status             # Check service status"
        echo "  $0 logs backend       # Stream backend logs"
        echo "  $0 logs frontend      # Stream frontend logs"
        exit 1
        ;;
esac
