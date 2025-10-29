# No-Code API Connector - Docker Commands

.PHONY: help build up down restart logs clean dev prod

# Default target
help: ## Show this help message
	@echo "Available commands:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-15s %s\n", $$1, $$2}'

# Development commands
build: ## Build all Docker images
	docker-compose build

build-no-cache: ## Build all Docker images without cache
	docker-compose build --no-cache

up: ## Start all services
	docker-compose up -d

up-dev: ## Start only core services (MongoDB, Backend, Frontend)
	docker-compose up -d mongodb backend frontend

up-full: ## Start all services including Airflow
	docker-compose up -d

down: ## Stop all services
	docker-compose down

restart: ## Restart all services
	docker-compose restart

restart-dev: ## Restart only core services
	docker-compose restart mongodb backend frontend

# Logging and monitoring
logs: ## Show logs from all services
	docker-compose logs -f

logs-backend: ## Show backend logs
	docker-compose logs -f backend

logs-frontend: ## Show frontend logs
	docker-compose logs -f frontend

logs-db: ## Show MongoDB logs
	docker-compose logs -f mongodb

# Database operations
db-shell: ## Connect to MongoDB shell
	docker-compose exec mongodb mongosh -u admin -p password123 --authenticationDatabase admin dataplatform_db

db-backup: ## Backup MongoDB database
	@echo "Creating backup..."
	@mkdir -p backup
	docker-compose exec mongodb mongodump --db dataplatform_db --out /tmp/backup
	docker cp $$(docker-compose ps -q mongodb):/tmp/backup ./backup/
	@echo "Backup saved to ./backup/"

db-restore: ## Restore MongoDB from backup (requires ./backup directory)
	@echo "Restoring from backup..."
	docker cp ./backup/dataplatform_db $$(docker-compose ps -q mongodb):/tmp/backup
	docker-compose exec mongodb mongorestore --db dataplatform_db --drop /tmp/backup/dataplatform_db
	@echo "Restore completed!"

# Cleanup commands
clean: ## Remove all containers and volumes
	docker-compose down -v

clean-all: ## Remove all containers, volumes, and images
	docker-compose down -v --rmi all

clean-logs: ## Clean all log files
	docker-compose exec backend rm -rf /var/www/html/logs/*
	docker-compose exec mongodb rm -rf /data/db/diagnostic.data /data/db/journal /data/db/WiredTiger*

# Development helpers
shell-backend: ## Open shell in backend container
	docker-compose exec backend bash

shell-frontend: ## Open shell in frontend container
	docker-compose exec frontend sh

shell-db: ## Open shell in MongoDB container
	docker-compose exec mongodb bash

# Testing
test-backend: ## Run backend tests
	docker-compose exec backend composer test

test-frontend: ## Run frontend tests
	docker-compose exec frontend npm test

# Production
prod-build: ## Build for production
	docker-compose -f docker-compose.yml build

prod-up: ## Start production environment
	docker-compose -f docker-compose.yml up -d

# Quick setup for new developers
setup: ## Initial setup for new developers
	@echo "Setting up No-Code API Connector..."
	make build
	make up-dev
	@echo "Waiting for services to be ready..."
	@sleep 30
	@echo "Setup complete! Access the application at:"
	@echo "  Frontend: http://localhost:3000"
	@echo "  Backend:  http://localhost:8000"
	@echo "  MongoDB:  localhost:27017 (admin/password123)"

# Status check
status: ## Show status of all services
	docker-compose ps
	@echo ""
	@echo "Service URLs:"
	@echo "  Frontend:    http://localhost:3000"
	@echo "  Backend:     http://localhost:8000"
	@echo "  MongoDB:     localhost:27017"
	@echo "  Redis:       localhost:6379"
	@echo "  Airflow:     http://localhost:8080"