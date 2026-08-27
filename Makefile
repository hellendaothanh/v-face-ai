.PHONY: start stop restart status logs help start-backend stop-backend start-frontend stop-frontend

help:
	@echo "V-Face Management Commands:"
	@echo "  make start            - Start database, backend, and frontend"
	@echo "  make stop             - Stop backend and frontend"
	@echo "  make restart          - Restart all services"
	@echo "  make status           - View running status of services"
	@echo "  make logs             - Tail logs for all services"
	@echo "  make start-backend    - Start backend only"
	@echo "  make stop-backend     - Stop backend only"
	@echo "  make start-frontend   - Start frontend only"
	@echo "  make stop-frontend    - Stop frontend only"

start:
	@./service.sh start

stop:
	@./service.sh stop

restart:
	@./service.sh restart

status:
	@./service.sh status

logs:
	@./service.sh logs

start-backend:
	@./service.sh start backend

stop-backend:
	@./service.sh stop backend

start-frontend:
	@./service.sh start frontend

stop-frontend:
	@./service.sh stop frontend
