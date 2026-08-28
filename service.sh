#!/bin/bash

# ==============================================================================
# V-Face Service Manager Script
# Supports: start | stop | restart | status | logs
# Targets:  all (default) | core-user | backend | frontend | db
# ==============================================================================

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_DIR="${PROJECT_ROOT}/.pids"
LOG_DIR="${PROJECT_ROOT}/logs"

CORE_USER_DIR="${PROJECT_ROOT}/services/core-user"

CORE_USER_PID_FILE="${PID_DIR}/core_user.pid"
BACKEND_PID_FILE="${PID_DIR}/backend.pid"
FRONTEND_PID_FILE="${PID_DIR}/frontend.pid"

CORE_USER_LOG_FILE="${LOG_DIR}/core_user.log"
BACKEND_LOG_FILE="${LOG_DIR}/backend.log"
FRONTEND_LOG_FILE="${LOG_DIR}/frontend.log"

CORE_USER_PORT=8001
BACKEND_PORT=8000
FRONTEND_PORT=3000

# Colors
GREEN="\033[0;32m"
RED="\033[0;31m"
YELLOW="\033[1;33m"
BLUE="\033[0;34m"
MAGENTA="\033[0;35m"
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

# Helper: resolve Python executable
get_python_exec() {
    local exec="${PROJECT_ROOT}/venv/bin/python"
    if [ ! -f "$exec" ]; then
        exec="${PROJECT_ROOT}/.venv/bin/python"
    fi
    if [ ! -f "$exec" ]; then
        exec="python3"
    fi
    echo "$exec"
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
# CORE USER SERVICE (Port 8001)
# ------------------------------------------------------------------------------
start_core_user() {
    echo -e "${MAGENTA}▶ Starting Core User Service (IAM/Auth/RBAC/Org)...${NC}"

    if [ -f "${CORE_USER_PID_FILE}" ]; then
        local pid
        pid=$(cat "${CORE_USER_PID_FILE}")
        if is_pid_running "$pid"; then
            echo -e "${YELLOW}⚠ Core User Service is already running (PID: ${pid}) on port ${CORE_USER_PORT}${NC}"
            return 0
        fi
    fi

    local port_pid
    port_pid=$(get_pid_by_port "${CORE_USER_PORT}")
    if [ -n "$port_pid" ]; then
        echo -e "${YELLOW}⚠ Port ${CORE_USER_PORT} is already in use by PID ${port_pid}.${NC}"
        echo "$port_pid" > "${CORE_USER_PID_FILE}"
        return 0
    fi

    local PYTHON_EXEC
    PYTHON_EXEC=$(get_python_exec)

    cd "${CORE_USER_DIR}" || exit 1
    nohup "${PYTHON_EXEC}" -m uvicorn app.main:app --reload --host 0.0.0.0 --port "${CORE_USER_PORT}" >> "${CORE_USER_LOG_FILE}" 2>&1 &
    local new_pid=$!
    echo "$new_pid" > "${CORE_USER_PID_FILE}"

    sleep 1.5
    if is_pid_running "$new_pid"; then
        echo -e "${GREEN}✔ Core User Service started! (PID: ${new_pid})${NC}"
        echo -e "  API URL:  ${CYAN}http://localhost:${CORE_USER_PORT}${NC}"
        echo -e "  Docs URL: ${CYAN}http://localhost:${CORE_USER_PORT}/docs${NC}"
        echo -e "  Logs:     ${CORE_USER_LOG_FILE}"
    else
        echo -e "${RED}✖ Failed to start Core User Service. Check logs: ${CORE_USER_LOG_FILE}${NC}"
        rm -f "${CORE_USER_PID_FILE}"
        return 1
    fi
}

stop_core_user() {
    echo -e "${MAGENTA}■ Stopping Core User Service...${NC}"
    local pid=""

    if [ -f "${CORE_USER_PID_FILE}" ]; then
        pid=$(cat "${CORE_USER_PID_FILE}")
    fi

    if [ -z "$pid" ] || ! is_pid_running "$pid"; then
        pid=$(get_pid_by_port "${CORE_USER_PORT}")
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
        echo -e "${GREEN}✔ Core User Service (PID: ${pid}) stopped.${NC}"
    else
        echo -e "${YELLOW}Core User Service is not running.${NC}"
    fi

    local remaining_pid
    remaining_pid=$(get_pid_by_port "${CORE_USER_PORT}")
    if [ -n "$remaining_pid" ]; then
        kill -9 "$remaining_pid" 2>/dev/null
    fi

    rm -f "${CORE_USER_PID_FILE}"
}

# ------------------------------------------------------------------------------
# BACKEND - FACE AI (Port 8000)
# ------------------------------------------------------------------------------
start_backend() {
    echo -e "${BLUE}▶ Starting Face AI Attendance Backend...${NC}"

    if [ -f "${BACKEND_PID_FILE}" ]; then
        local pid
        pid=$(cat "${BACKEND_PID_FILE}")
        if is_pid_running "$pid"; then
            echo -e "${YELLOW}⚠ Backend is already running (PID: ${pid}) on port ${BACKEND_PORT}${NC}"
            return 0
        fi
    fi

    local port_pid
    port_pid=$(get_pid_by_port "${BACKEND_PORT}")
    if [ -n "$port_pid" ]; then
        echo -e "${YELLOW}⚠ Port ${BACKEND_PORT} is already in use by PID ${port_pid}.${NC}"
        echo "$port_pid" > "${BACKEND_PID_FILE}"
        return 0
    fi

    local PYTHON_EXEC
    PYTHON_EXEC=$(get_python_exec)

    cd "${PROJECT_ROOT}" || exit 1
    nohup "${PYTHON_EXEC}" -m uvicorn app.main:app --reload --host 0.0.0.0 --port "${BACKEND_PORT}" >> "${BACKEND_LOG_FILE}" 2>&1 &
    local new_pid=$!
    echo "$new_pid" > "${BACKEND_PID_FILE}"

    sleep 1.5
    if is_pid_running "$new_pid"; then
        echo -e "${GREEN}✔ Face AI Backend started! (PID: ${new_pid})${NC}"
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
    echo -e "${BLUE}■ Stopping Face AI Backend...${NC}"
    local pid=""

    if [ -f "${BACKEND_PID_FILE}" ]; then
        pid=$(cat "${BACKEND_PID_FILE}")
    fi

    if [ -z "$pid" ] || ! is_pid_running "$pid"; then
        pid=$(get_pid_by_port "${BACKEND_PORT}")
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

        echo -e "${GREEN}✔ Face AI Backend (PID: ${pid}) stopped.${NC}"
    else
        echo -e "${YELLOW}Face AI Backend is not running.${NC}"
    fi

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
    echo -e "${CYAN}▶ Starting Frontend (Vite/React)...${NC}"

    if [ -f "${FRONTEND_PID_FILE}" ]; then
        local pid
        pid=$(cat "${FRONTEND_PID_FILE}")
        if is_pid_running "$pid"; then
            echo -e "${YELLOW}⚠ Frontend is already running (PID: ${pid}) on port ${FRONTEND_PORT}${NC}"
            return 0
        fi
    fi

    local port_pid
    port_pid=$(get_pid_by_port "${FRONTEND_PORT}")
    if [ -n "$port_pid" ]; then
        echo -e "${YELLOW}⚠ Port ${FRONTEND_PORT} is already in use by PID ${port_pid}.${NC}"
        echo "$port_pid" > "${FRONTEND_PID_FILE}"
        return 0
    fi

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
        echo -e "${GREEN}✔ Frontend started! (PID: ${new_pid})${NC}"
        echo -e "  Web URL: ${CYAN}http://localhost:${FRONTEND_PORT}${NC}"
        echo -e "  Logs:    ${FRONTEND_LOG_FILE}"
    else
        echo -e "${RED}✖ Failed to start Frontend. Check logs: ${FRONTEND_LOG_FILE}${NC}"
        rm -f "${FRONTEND_PID_FILE}"
        return 1
    fi
}

stop_frontend() {
    echo -e "${CYAN}■ Stopping Frontend...${NC}"
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
    echo -e "${BOLD}====== V-Face Ecosystem Services Status ======${NC}"

    # Database
    if command -v docker &>/dev/null; then
        local db_container
        db_container=$(docker ps --filter "name=vface_postgres" --format "{{.Status}}" 2>/dev/null)
        if [ -n "$db_container" ]; then
            echo -e "  PostgreSQL:   ${GREEN}● Running (${db_container})${NC}"
        else
            echo -e "  PostgreSQL:   ${RED}○ Stopped${NC}"
        fi
    fi

    # Core User
    local core_user_pid=""
    if [ -f "${CORE_USER_PID_FILE}" ]; then
        core_user_pid=$(cat "${CORE_USER_PID_FILE}")
    fi
    if [ -z "$core_user_pid" ] || ! is_pid_running "$core_user_pid"; then
        core_user_pid=$(get_pid_by_port "${CORE_USER_PORT}")
    fi

    if [ -n "$core_user_pid" ] && is_pid_running "$core_user_pid"; then
        echo -e "  Core User:    ${GREEN}● Running${NC} (PID: ${core_user_pid}, Port: ${CORE_USER_PORT}) -> http://localhost:${CORE_USER_PORT}/docs"
    else
        echo -e "  Core User:    ${RED}○ Stopped${NC}"
    fi

    # Backend Face AI
    local backend_pid=""
    if [ -f "${BACKEND_PID_FILE}" ]; then
        backend_pid=$(cat "${BACKEND_PID_FILE}")
    fi
    if [ -z "$backend_pid" ] || ! is_pid_running "$backend_pid"; then
        backend_pid=$(get_pid_by_port "${BACKEND_PORT}")
    fi

    if [ -n "$backend_pid" ] && is_pid_running "$backend_pid"; then
        echo -e "  Face AI:      ${GREEN}● Running${NC} (PID: ${backend_pid}, Port: ${BACKEND_PORT}) -> http://localhost:${BACKEND_PORT}/docs"
    else
        echo -e "  Face AI:      ${RED}○ Stopped${NC}"
    fi

    # Frontend
    local frontend_pid=""
    if [ -f "${FRONTEND_PID_FILE}" ]; then
        frontend_pid=$(cat "${FRONTEND_PID_FILE}")
    fi
    if [ -z "$frontend_pid" ] || ! is_pid_running "$frontend_pid"; then
        frontend_pid=$(get_pid_by_port "${FRONTEND_PORT}")
    fi

    if [ -n "$frontend_pid" ] && is_pid_running "$frontend_pid"; then
        echo -e "  Frontend:     ${GREEN}● Running${NC} (PID: ${frontend_pid}, Port: ${FRONTEND_PORT}) -> http://localhost:${FRONTEND_PORT}"
    else
        echo -e "  Frontend:     ${RED}○ Stopped${NC}"
    fi
    echo -e "${BOLD}==============================================${NC}"
}

# ------------------------------------------------------------------------------
# LOGS
# ------------------------------------------------------------------------------
view_logs() {
    local target=${1:-"all"}
    case "$target" in
        core-user)
            echo -e "${MAGENTA}Following Core User logs (${CORE_USER_LOG_FILE})... (Press Ctrl+C to exit)${NC}"
            tail -f "${CORE_USER_LOG_FILE}"
            ;;
        backend)
            echo -e "${BLUE}Following Face AI Backend logs (${BACKEND_LOG_FILE})... (Press Ctrl+C to exit)${NC}"
            tail -f "${BACKEND_LOG_FILE}"
            ;;
        frontend)
            echo -e "${CYAN}Following Frontend logs (${FRONTEND_LOG_FILE})... (Press Ctrl+C to exit)${NC}"
            tail -f "${FRONTEND_LOG_FILE}"
            ;;
        all|*)
            echo -e "${CYAN}Following All logs... (Press Ctrl+C to exit)${NC}"
            tail -f "${CORE_USER_LOG_FILE}" "${BACKEND_LOG_FILE}" "${FRONTEND_LOG_FILE}"
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
            core-user)
                start_core_user
                ;;
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
                start_core_user
                start_backend
                start_frontend
                ;;
        esac
        ;;
    stop)
        case "$TARGET" in
            core-user)
                stop_core_user
                ;;
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
                stop_core_user
                ;;
        esac
        ;;
    restart)
        case "$TARGET" in
            core-user)
                stop_core_user
                start_core_user
                ;;
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
                stop_core_user
                start_db
                start_core_user
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
        echo -e "${BOLD}Usage: $0 {start|stop|restart|status|logs} [all|core-user|backend|frontend|db]${NC}"
        echo ""
        echo "Examples:"
        echo "  $0 start                  # Start DB, Core User, Face AI & Frontend"
        echo "  $0 stop                   # Stop all services"
        echo "  $0 restart                # Restart all services"
        echo "  $0 start core-user        # Start Core User Service only (Port 8001)"
        echo "  $0 stop core-user         # Stop Core User Service only"
        echo "  $0 start backend          # Start Face AI Backend only (Port 8000)"
        echo "  $0 stop backend           # Stop Face AI Backend only"
        echo "  $0 start frontend         # Start Frontend only (Port 5173)"
        echo "  $0 stop frontend          # Stop Frontend only"
        echo "  $0 status                 # Check status of all services"
        echo "  $0 logs core-user         # Stream Core User logs"
        echo "  $0 logs backend           # Stream Face AI Backend logs"
        exit 1
        ;;
esac
