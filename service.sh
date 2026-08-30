#!/bin/bash

# ==============================================================================
# V-Face Service Manager Script (Linux / macOS)
# Supports: start | stop | restart | status | test | logs
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
GRAY="\033[0;90m"
NC="\033[0m" # No Color

# Ensure directories exist
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
    lsof -ti tcp:"${port}" -sTCP:LISTEN 2>/dev/null | head -n 1
}

# Helper: safely stop a process tree
stop_process_tree() {
    local pid=$1
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
    fi
}

# Helper: test if Python executable actually runs
is_python_works() {
    local path=$1
    [ -n "$path" ] && [ -f "$path" ] && "$path" -c "import sys; print('ok')" 2>/dev/null | grep -q "ok"
}

is_python_has_uvicorn() {
    local path=$1
    is_python_works "$path" && "$path" -c "import uvicorn; print('ok')" 2>/dev/null | grep -q "ok"
}

# Helper: resolve Python executable & auto-prepare environment
get_python_exec() {
    local candidates=(
        "${PROJECT_ROOT}/venv-linux/bin/python"
        "${PROJECT_ROOT}/venv/bin/python"
        "${PROJECT_ROOT}/.venv/bin/python"
    )

    for cand in "${candidates[@]}"; do
        if is_python_works "$cand"; then
            if is_python_has_uvicorn "$cand"; then
                echo "$cand"
                return 0
            else
                echo -e "${YELLOW}Installing missing dependencies into $cand...${NC}" >&2
                "$cand" -m pip install -r "${PROJECT_ROOT}/requirements.txt" --quiet 2>/dev/null
                "$cand" -m pip install -r "${CORE_USER_DIR}/requirements.txt" --quiet 2>/dev/null
                echo "$cand"
                return 0
            fi
        fi
    done

    # Check global python3
    if command -v python3 &>/dev/null; then
        if python3 -c "import uvicorn" 2>/dev/null; then
            echo "python3"
            return 0
        fi
    fi

    # Determine target venv directory (if venv was made on Windows, use venv-linux)
    local target_venv_name="venv"
    if [ -f "${PROJECT_ROOT}/venv/pyvenv.cfg" ] && grep -qiE '^[a-zA-Z]:\\' "${PROJECT_ROOT}/venv/pyvenv.cfg"; then
        target_venv_name="venv-linux"
        echo -e "${CYAN}ℹ Existing ./venv belongs to Windows. Creating dedicated Linux environment in ./${target_venv_name}...${NC}" >&2
    fi

    local target_venv_path="${PROJECT_ROOT}/${target_venv_name}"
    echo -e "${YELLOW}Creating Python virtual environment in ./${target_venv_name}...${NC}" >&2
    if python3 -m venv "${target_venv_path}" 2>/dev/null; then
        local venv_python="${target_venv_path}/bin/python"
        if is_python_works "$venv_python"; then
            echo -e "${YELLOW}Installing backend and core-user dependencies...${NC}" >&2
            "$venv_python" -m pip install --upgrade pip --quiet
            if [ -f "${PROJECT_ROOT}/requirements.txt" ]; then
                "$venv_python" -m pip install -r "${PROJECT_ROOT}/requirements.txt" --quiet
            fi
            if [ -f "${CORE_USER_DIR}/requirements.txt" ]; then
                "$venv_python" -m pip install -r "${CORE_USER_DIR}/requirements.txt" --quiet
            fi
            echo "$venv_python"
            return 0
        fi
    fi

    echo "python3"
    return 0
}

# Helper: check docker installation and daemon status
is_docker_installed() {
    command -v docker &>/dev/null
}

is_docker_running() {
    if ! is_docker_installed; then
        return 1
    fi
    docker info &>/dev/null
}

# ------------------------------------------------------------------------------
# DATABASE (Docker Compose)
# ------------------------------------------------------------------------------
start_db() {
    local compose_file="${PROJECT_ROOT}/docker-compose.yml"
    
    if ! is_docker_installed; then
        echo -e "${YELLOW}⚠ [DB] Docker is not installed or not in PATH. Skipping PostgreSQL database auto-start.${NC}"
        return 1
    fi

    if ! is_docker_running; then
        echo -e "${RED}⚠ [DB] Docker is installed but Docker daemon / Docker Desktop is NOT running.${NC}"
        echo -e "${YELLOW}  Please start Docker daemon (e.g. 'sudo systemctl start docker' or Docker Desktop) to enable PostgreSQL.${NC}"
        return 1
    fi

    echo -e "${CYAN}[DB]${NC} Starting PostgreSQL container..."
    if docker compose version &>/dev/null; then
        docker compose -f "$compose_file" up -d postgres
    elif command -v docker-compose &>/dev/null; then
        docker-compose -f "$compose_file" up -d postgres
    else
        echo -e "${YELLOW}⚠ [DB] Docker Compose not found.${NC}"
        return 1
    fi
    echo -e "${GREEN}✔ [DB] PostgreSQL is running.${NC}"
}

stop_db() {
    local compose_file="${PROJECT_ROOT}/docker-compose.yml"
    if ! is_docker_installed; then
        return 0
    fi
    if ! is_docker_running; then
        echo -e "${YELLOW}⚠ [DB] Docker daemon is not running.${NC}"
        return 0
    fi
    echo -e "${CYAN}[DB]${NC} Stopping PostgreSQL container..."
    if docker compose version &>/dev/null; then
        docker compose -f "$compose_file" stop postgres
    elif command -v docker-compose &>/dev/null; then
        docker-compose -f "$compose_file" stop postgres
    fi
    echo -e "${GREEN}✔ [DB] PostgreSQL container stopped.${NC}"
}

# ------------------------------------------------------------------------------
# CORE USER SERVICE (Port 8001)
# ------------------------------------------------------------------------------
start_core_user() {
    echo -e "${MAGENTA}▶ Starting Core User Service (IAM/Auth/RBAC/Org)...${NC}"

    # Check PID file
    if [ -f "${CORE_USER_PID_FILE}" ]; then
        local pid
        pid=$(cat "${CORE_USER_PID_FILE}" | tr -d '[:space:]')
        if [ -n "$pid" ] && is_pid_running "$pid"; then
            echo -e "${YELLOW}⚠ Core User Service is already running (PID: ${pid}) on port ${CORE_USER_PORT}${NC}"
            return 0
        fi
    fi

    # Check port
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
    nohup "${PYTHON_EXEC}" -m uvicorn app.main:app --host 0.0.0.0 --port "${CORE_USER_PORT}" >> "${CORE_USER_LOG_FILE}" 2>&1 &
    local new_pid=$!
    echo "$new_pid" > "${CORE_USER_PID_FILE}"

    # Wait for port to become active (up to 8 seconds)
    for _ in {1..8}; do
        sleep 1
        port_pid=$(get_pid_by_port "${CORE_USER_PORT}")
        if [ -n "$port_pid" ]; then
            break
        fi
    done

    port_pid=$(get_pid_by_port "${CORE_USER_PORT}")
    if [ -n "$port_pid" ]; then
        echo "$port_pid" > "${CORE_USER_PID_FILE}"
        echo -e "${GREEN}✔ Core User Service started! (PID: ${port_pid})${NC}"
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
    local stopped=0

    if [ -f "${CORE_USER_PID_FILE}" ]; then
        local pid
        pid=$(cat "${CORE_USER_PID_FILE}" | tr -d '[:space:]')
        if [ -n "$pid" ] && is_pid_running "$pid"; then
            stop_process_tree "$pid"
            stopped=1
            echo -e "${GREEN}✔ Core User Service (PID: ${pid}) stopped.${NC}"
        fi
        rm -f "${CORE_USER_PID_FILE}"
    fi

    local port_pid
    port_pid=$(get_pid_by_port "${CORE_USER_PORT}")
    if [ -n "$port_pid" ]; then
        stop_process_tree "$port_pid"
        stopped=1
        echo -e "${GREEN}✔ Cleaned up process occupying port ${CORE_USER_PORT} (PID: ${port_pid}).${NC}"
    fi

    if [ "$stopped" -eq 0 ]; then
        echo -e "${YELLOW}Core User Service is not running.${NC}"
    fi
}

# ------------------------------------------------------------------------------
# BACKEND - FACE AI (Port 8000)
# ------------------------------------------------------------------------------
start_backend() {
    echo -e "${BLUE}▶ Starting Face AI Attendance Backend...${NC}"

    # Check PID file
    if [ -f "${BACKEND_PID_FILE}" ]; then
        local pid
        pid=$(cat "${BACKEND_PID_FILE}" | tr -d '[:space:]')
        if [ -n "$pid" ] && is_pid_running "$pid"; then
            echo -e "${YELLOW}⚠ Backend is already running (PID: ${pid}) on port ${BACKEND_PORT}${NC}"
            return 0
        fi
    fi

    # Check port
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
    nohup "${PYTHON_EXEC}" -m uvicorn app.main:app --host 0.0.0.0 --port "${BACKEND_PORT}" >> "${BACKEND_LOG_FILE}" 2>&1 &
    local new_pid=$!
    echo "$new_pid" > "${BACKEND_PID_FILE}"

    # Wait for port to become active (up to 8 seconds)
    for _ in {1..8}; do
        sleep 1
        port_pid=$(get_pid_by_port "${BACKEND_PORT}")
        if [ -n "$port_pid" ]; then
            break
        fi
    done

    port_pid=$(get_pid_by_port "${BACKEND_PORT}")
    if [ -n "$port_pid" ]; then
        echo "$port_pid" > "${BACKEND_PID_FILE}"
        echo -e "${GREEN}✔ Face AI Backend started! (PID: ${port_pid})${NC}"
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
    local stopped=0

    if [ -f "${BACKEND_PID_FILE}" ]; then
        local pid
        pid=$(cat "${BACKEND_PID_FILE}" | tr -d '[:space:]')
        if [ -n "$pid" ] && is_pid_running "$pid"; then
            stop_process_tree "$pid"
            stopped=1
            echo -e "${GREEN}✔ Face AI Backend (PID: ${pid}) stopped.${NC}"
        fi
        rm -f "${BACKEND_PID_FILE}"
    fi

    local port_pid
    port_pid=$(get_pid_by_port "${BACKEND_PORT}")
    if [ -n "$port_pid" ]; then
        stop_process_tree "$port_pid"
        stopped=1
        echo -e "${GREEN}✔ Cleaned up process occupying port ${BACKEND_PORT} (PID: ${port_pid}).${NC}"
    fi

    if [ "$stopped" -eq 0 ]; then
        echo -e "${YELLOW}Face AI Backend is not running.${NC}"
    fi
}

# ------------------------------------------------------------------------------
# FRONTEND
# ------------------------------------------------------------------------------
start_frontend() {
    echo -e "${CYAN}▶ Starting Frontend (Vite/React)...${NC}"

    if [ -f "${FRONTEND_PID_FILE}" ]; then
        local pid
        pid=$(cat "${FRONTEND_PID_FILE}" | tr -d '[:space:]')
        if [ -n "$pid" ] && is_pid_running "$pid"; then
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

    local frontend_dir="${PROJECT_ROOT}/frontend"
    if [ ! -d "${frontend_dir}/node_modules" ]; then
        echo -e "${YELLOW}Installing frontend dependencies...${NC}"
        (cd "${frontend_dir}" && npm install)
    fi

    cd "${frontend_dir}" || exit 1
    nohup npm run dev >> "${FRONTEND_LOG_FILE}" 2>&1 &
    local new_pid=$!
    echo "$new_pid" > "${FRONTEND_PID_FILE}"

    # Wait for port to become active (up to 8 seconds)
    for _ in {1..8}; do
        sleep 1
        port_pid=$(get_pid_by_port "${FRONTEND_PORT}")
        if [ -n "$port_pid" ]; then
            break
        fi
    done

    port_pid=$(get_pid_by_port "${FRONTEND_PORT}")
    if [ -n "$port_pid" ]; then
        local local_ip
        local_ip=$(ipconfig getifaddr en0 2>/dev/null || ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -n 1)
        echo "$port_pid" > "${FRONTEND_PID_FILE}"
        echo -e "${GREEN}✔ Frontend started! (PID: ${port_pid})${NC}"
        echo -e "  Local URL:   ${CYAN}http://localhost:${FRONTEND_PORT}${NC}"
        if [ -n "$local_ip" ]; then
            echo -e "  Network URL: ${CYAN}http://${local_ip}:${FRONTEND_PORT}${NC}"
        fi
        echo -e "  Logs:        ${FRONTEND_LOG_FILE}"
    else
        echo -e "${RED}✖ Failed to start Frontend. Check logs: ${FRONTEND_LOG_FILE}${NC}"
        rm -f "${FRONTEND_PID_FILE}"
        return 1
    fi
}

stop_frontend() {
    echo -e "${CYAN}■ Stopping Frontend...${NC}"
    local stopped=0

    if [ -f "${FRONTEND_PID_FILE}" ]; then
        local pid
        pid=$(cat "${FRONTEND_PID_FILE}" | tr -d '[:space:]')
        if [ -n "$pid" ] && is_pid_running "$pid"; then
            stop_process_tree "$pid"
            stopped=1
            echo -e "${GREEN}✔ Frontend (PID: ${pid}) stopped.${NC}"
        fi
        rm -f "${FRONTEND_PID_FILE}"
    fi

    local port_pid
    port_pid=$(get_pid_by_port "${FRONTEND_PORT}")
    if [ -n "$port_pid" ]; then
        stop_process_tree "$port_pid"
        stopped=1
        echo -e "${GREEN}✔ Cleaned up process occupying port ${FRONTEND_PORT} (PID: ${port_pid}).${NC}"
    fi

    if [ "$stopped" -eq 0 ]; then
        echo -e "${YELLOW}Frontend is not running.${NC}"
    fi
}

# ------------------------------------------------------------------------------
# STATUS
# ------------------------------------------------------------------------------
get_service_status() {
    echo -e "\n${BOLD}================ V-Face Services Status Summary ================${NC}"

    # Database & Docker
    if ! is_docker_installed; then
        echo -e "  Docker:       ${YELLOW}○ Not Installed / Not found in PATH${NC}"
        echo -e "  PostgreSQL:   ${RED}○ Offline (Docker missing)${NC}"
    elif ! is_docker_running; then
        echo -e "  Docker:       ${RED}⚠ Stopped / Daemon not running (Please start Docker)${NC}"
        echo -e "  PostgreSQL:   ${RED}○ Offline (Docker daemon stopped)${NC}"
    else
        local db_container
        db_container=$(docker ps --filter "name=vface_postgres" --format "{{.Status}}" 2>/dev/null)
        if [ -n "$db_container" ]; then
            echo -e "  PostgreSQL:   ${GREEN}● Running (${db_container})${NC}"
        else
            echo -e "  PostgreSQL:   ${RED}○ Stopped (Container 'vface_postgres' is not active)${NC}"
        fi
    fi

    # Core User
    local core_user_pid=""
    core_user_pid=$(get_pid_by_port "${CORE_USER_PORT}")
    if [ -z "$core_user_pid" ] && [ -f "${CORE_USER_PID_FILE}" ]; then
        local check_pid
        check_pid=$(cat "${CORE_USER_PID_FILE}" | tr -d '[:space:]')
        if [ -n "$check_pid" ] && is_pid_running "$check_pid"; then
            core_user_pid=$check_pid
        fi
    fi

    if [ -n "$core_user_pid" ]; then
        echo -e "  Core User:    ${GREEN}● Running${NC} (PID: ${core_user_pid}, Port: ${CORE_USER_PORT}) -> http://localhost:${CORE_USER_PORT}/docs"
    else
        echo -e "  Core User:    ${RED}○ Stopped (Port ${CORE_USER_PORT} inactive)${NC}"
    fi

    # Backend Face AI
    local backend_pid=""
    backend_pid=$(get_pid_by_port "${BACKEND_PORT}")
    if [ -z "$backend_pid" ] && [ -f "${BACKEND_PID_FILE}" ]; then
        local check_pid
        check_pid=$(cat "${BACKEND_PID_FILE}" | tr -d '[:space:]')
        if [ -n "$check_pid" ] && is_pid_running "$check_pid"; then
            backend_pid=$check_pid
        fi
    fi

    if [ -n "$backend_pid" ]; then
        echo -e "  Face AI:      ${GREEN}● Running${NC} (PID: ${backend_pid}, Port: ${BACKEND_PORT}) -> http://localhost:${BACKEND_PORT}/docs"
    else
        echo -e "  Face AI:      ${RED}○ Stopped (Port ${BACKEND_PORT} inactive)${NC}"
    fi

    # Frontend
    local frontend_pid=""
    frontend_pid=$(get_pid_by_port "${FRONTEND_PORT}")
    if [ -z "$frontend_pid" ] && [ -f "${FRONTEND_PID_FILE}" ]; then
        local check_pid
        check_pid=$(cat "${FRONTEND_PID_FILE}" | tr -d '[:space:]')
        if [ -n "$check_pid" ] && is_pid_running "$check_pid"; then
            frontend_pid=$check_pid
        fi
    fi

    if [ -n "$frontend_pid" ]; then
        local local_ip
        local_ip=$(ipconfig getifaddr en0 2>/dev/null || ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -n 1)
        if [ -n "$local_ip" ]; then
            echo -e "  Frontend:     ${GREEN}● Running${NC} (PID: ${frontend_pid}, Port: ${FRONTEND_PORT}) -> http://localhost:${FRONTEND_PORT} | http://${local_ip}:${FRONTEND_PORT}"
        else
            echo -e "  Frontend:     ${GREEN}● Running${NC} (PID: ${frontend_pid}, Port: ${FRONTEND_PORT}) -> http://localhost:${FRONTEND_PORT}"
        fi
    else
        echo -e "  Frontend:     ${RED}○ Stopped (Port ${FRONTEND_PORT} inactive)${NC}"
    fi

    echo -e "${BOLD}================================================================${NC}\n"
}

# ------------------------------------------------------------------------------
# LOGS
# ------------------------------------------------------------------------------
show_logs() {
    local target=${1:-"all"}
    case "$target" in
        core-user)
            touch "${CORE_USER_LOG_FILE}"
            echo -e "${CYAN}Following Core User logs (${CORE_USER_LOG_FILE})... (Press Ctrl+C to exit)${NC}"
            tail -n 50 -f "${CORE_USER_LOG_FILE}"
            ;;
        backend)
            touch "${BACKEND_LOG_FILE}"
            echo -e "${CYAN}Following Face AI Backend logs (${BACKEND_LOG_FILE})... (Press Ctrl+C to exit)${NC}"
            tail -n 50 -f "${BACKEND_LOG_FILE}"
            ;;
        frontend)
            touch "${FRONTEND_LOG_FILE}"
            echo -e "${CYAN}Following Frontend logs (${FRONTEND_LOG_FILE})... (Press Ctrl+C to exit)${NC}"
            tail -n 50 -f "${FRONTEND_LOG_FILE}"
            ;;
        all|*)
            echo -e "${CYAN}Showing last lines of logs...${NC}"
            if [ -f "${CORE_USER_LOG_FILE}" ]; then
                echo -e "${MAGENTA}--- Core User Log (${CORE_USER_LOG_FILE}) ---${NC}"
                tail -n 15 "${CORE_USER_LOG_FILE}"
            fi
            if [ -f "${BACKEND_LOG_FILE}" ]; then
                echo -e "\n${BLUE}--- Face AI Backend Log (${BACKEND_LOG_FILE}) ---${NC}"
                tail -n 15 "${BACKEND_LOG_FILE}"
            fi
            if [ -f "${FRONTEND_LOG_FILE}" ]; then
                echo -e "\n${YELLOW}--- Frontend Log (${FRONTEND_LOG_FILE}) ---${NC}"
                tail -n 15 "${FRONTEND_LOG_FILE}"
            fi
            echo -e "\n${GRAY}(Tip: Run '$0 logs core-user' or '$0 logs backend' to follow in real-time)${NC}"
            ;;
    esac
}

# ------------------------------------------------------------------------------
# TESTS
# ------------------------------------------------------------------------------
run_e2e_tests() {
    echo -e "\n${CYAN}🚀 Running Playwright E2E Tests for V-Face Ecosystem...${NC}"
    local frontend_dir="${PROJECT_ROOT}/frontend"
    (cd "${frontend_dir}" && npx playwright test)
}

# ------------------------------------------------------------------------------
# USAGE
# ------------------------------------------------------------------------------
show_usage() {
    echo -e "${YELLOW}Usage: $0 {start|stop|restart|status|test|logs} [all|core-user|backend|frontend|db]${NC}\n"
    echo "Examples:"
    echo "  $0 start                  # Start DB, Core User, Face AI & Frontend"
    echo "  $0 stop                   # Stop all services"
    echo "  $0 restart                # Restart all services"
    echo "  $0 start core-user        # Start Core User Service only (Port 8001)"
    echo "  $0 stop core-user         # Stop Core User Service only"
    echo "  $0 start backend          # Start Face AI Backend only (Port 8000)"
    echo "  $0 stop backend           # Stop Face AI Backend only"
    echo "  $0 start frontend         # Start Frontend only (Port 3000)"
    echo "  $0 stop frontend          # Stop Frontend only"
    echo "  $0 status                 # Check status of all ecosystem services"
    echo "  $0 test                   # Run automated Playwright E2E tests"
    echo "  $0 logs core-user         # Stream Core User service logs"
    echo "  $0 logs backend           # Stream Face AI Backend logs"
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
        get_service_status
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
        get_service_status
        ;;
    status)
        get_service_status
        ;;
    test)
        run_e2e_tests
        ;;
    logs)
        show_logs "$TARGET"
        ;;
    help|*)
        show_usage
        ;;
esac
