#!/bin/bash
# Production Deployment Script for no-code-api-connector
# Version: 1.0.0
# Date: October 19, 2025

set -e  # Exit on any error

# Configuration
APP_NAME="no-code-api-connector"
DEPLOY_ENV="${1:-production}"
BACKUP_DIR="/var/backups/$APP_NAME"
LOG_FILE="/var/log/$APP_NAME/deploy_$(date +%Y%m%d_%H%M%S).log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR] $(date +'%Y-%m-%d %H:%M:%S') $1${NC}" | tee -a "$LOG_FILE"
    echo "$1" >&2
}

warn() {
    echo -e "${YELLOW}[WARN] $(date +'%Y-%m-%d %H:%M:%S') $1${NC}" | tee -a "$LOG_FILE"
}

info() {
    echo -e "${BLUE}[INFO] $(date +'%Y-%m-%d %H:%M:%S') $1${NC}" | tee -a "$LOG_FILE"
}

# Pre-deployment checks
pre_deployment_checks() {
    log "🔍 Running pre-deployment checks..."

    # Check if required commands exist
    info "Checking required commands..."
    command -v node >/dev/null 2>&1 || { error "Node.js is not installed"; exit 1; }
    command -v npm >/dev/null 2>&1 || { error "npm is not installed"; exit 1; }
    command -v mongodump >/dev/null 2>&1 || { error "mongodump is not available"; exit 1; }

    # Check Node.js version
    NODE_VERSION=$(node --version | sed 's/v//')
    if [[ "$(printf '%s\n' "$NODE_VERSION" "18.0.0" | sort -V | head -n1)" != "18.0.0" ]]; then
        error "Node.js version 18+ required. Current: $NODE_VERSION"
        exit 1
    fi

    # Check environment variables
    info "Checking environment variables..."
    [ -z "$MONGODB_URI" ] && { error "MONGODB_URI not set"; exit 1; }
    [ -z "$MONGODB_DB" ] && { error "MONGODB_DB not set"; exit 1; }

    # Check MongoDB connectivity
    info "Testing MongoDB connectivity..."
    if ! mongosh --eval "db.runCommand('ping')" "$MONGODB_URI/$MONGODB_DB" >/dev/null 2>&1; then
        error "Cannot connect to MongoDB at $MONGODB_URI/$MONGODB_DB"
        exit 1
    fi

    # Check disk space
    AVAILABLE_SPACE=$(df / | tail -1 | awk '{print $4}')
    if [ "$AVAILABLE_SPACE" -lt 1048576 ]; then  # 1GB in KB
        error "Insufficient disk space. At least 1GB required."
        exit 1
    fi

    log "✅ Pre-deployment checks passed"
}

# Backup database
backup_database() {
    log "💾 Creating database backup..."
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_PATH="$BACKUP_DIR/backup_$TIMESTAMP"

    mkdir -p "$BACKUP_DIR" 2>/dev/null || { error "Cannot create backup directory"; exit 1; }

    info "Backing up database to: $BACKUP_PATH"

    if mongodump --uri="$MONGODB_URI" --db="$MONGODB_DB" --out="$BACKUP_PATH" --gzip; then
        # Calculate backup size
        BACKUP_SIZE=$(du -sh "$BACKUP_PATH" | cut -f1)
        log "✅ Database backup created successfully: $BACKUP_PATH (Size: $BACKUP_SIZE)"
        echo "$BACKUP_PATH" > .last_backup
    else
        error "Database backup failed"
        exit 1
    fi
}

# Install dependencies
install_dependencies() {
    log "📦 Installing dependencies..."

    # Clean npm cache
    info "Cleaning npm cache..."
    npm cache clean --force >/dev/null 2>&1 || warn "Failed to clean npm cache"

    # Install dependencies
    info "Installing production dependencies..."
    if npm ci --production --silent; then
        log "✅ Dependencies installed successfully"
    else
        error "Failed to install dependencies"
        exit 1
    fi
}

# Build application
build_application() {
    log "🔨 Building application..."

    # Clean previous build
    info "Cleaning previous build..."
    rm -rf .next 2>/dev/null || true

    # Build application
    info "Building Next.js application..."
    if npm run build; then
        log "✅ Application built successfully"
    else
        error "Build failed"
        exit 1
    fi
}

# Run tests (optional)
run_tests() {
    if [ "${RUN_TESTS:-false}" = "true" ]; then
        log "🧪 Running tests..."

        # Run unit tests
        info "Running unit tests..."
        if npm run test:unit; then
            log "✅ Unit tests passed"
        else
            warn "Unit tests failed - continuing deployment"
        fi

        # Run API tests (if MongoDB available)
        info "Running API tests..."
        if npm run test:api; then
            log "✅ API tests passed"
        else
            warn "API tests failed - continuing deployment"
        fi
    else
        info "Skipping tests (set RUN_TESTS=true to enable)"
    fi
}

# Deploy application
deploy_application() {
    log "🚀 Deploying application..."

    # Stop existing application
    info "Stopping existing application..."
    pm2 stop "$APP_NAME" 2>/dev/null || true
    pm2 delete "$APP_NAME" 2>/dev/null || true

    # Start new application
    info "Starting application with PM2..."
    if pm2 start npm --name "$APP_NAME" -- start; then
        log "✅ Application started successfully"
    else
        error "Failed to start application"
        exit 1
    fi

    # Wait for application to start
    info "Waiting for application to start..."
    sleep 15
}

# Health check
health_check() {
    log "🏥 Running health checks..."

    local max_attempts=5
    local attempt=1

    while [ $attempt -le $max_attempts ]; do
        info "Health check attempt $attempt/$max_attempts..."

        # Check if application is responding
        if curl -f -s --max-time 10 http://localhost:3000/api/health >/dev/null 2>&1; then
            log "✅ Health check passed"
            return 0
        fi

        sleep 5
        ((attempt++))
    done

    error "Health check failed after $max_attempts attempts"
    return 1
}

# Post-deployment validation
post_deployment_validation() {
    log "🔍 Running post-deployment validation..."

    # Check API endpoints
    local endpoints=(
        "/api/status"
        "/api/connections"
        "/api/runs"
        "/api/monitoring/health"
    )

    for endpoint in "${endpoints[@]}"; do
        info "Testing endpoint: $endpoint"
        if curl -f -s --max-time 10 "http://localhost:3000$endpoint" >/dev/null 2>&1; then
            log "✅ $endpoint - OK"
        else
            warn "⚠️  $endpoint - FAILED"
        fi
    done

    # Check database connectivity
    info "Testing database connectivity..."
    if curl -f -s --max-time 10 "http://localhost:3000/api/monitoring/database" >/dev/null 2>&1; then
        log "✅ Database connectivity - OK"
    else
        warn "⚠️  Database connectivity - FAILED"
    fi
}

# Rollback function
rollback() {
    warn "🚨 Initiating rollback..."

    # Stop current application
    pm2 stop "$APP_NAME" 2>/dev/null || true
    pm2 delete "$APP_NAME" 2>/dev/null || true

    # Restore from last backup if available
    if [ -f ".last_backup" ]; then
        local backup_path
        backup_path=$(cat .last_backup)
        if [ -d "$backup_path" ]; then
            info "Restoring database from backup: $backup_path"
            mongorestore --uri="$MONGODB_URI" --db="$MONGODB_DB" --drop "$backup_path/$MONGODB_DB" || {
                error "Database restore failed"
                return 1
            }
        fi
    fi

    # Start previous version (assuming git rollback)
    info "Starting previous version..."
    git checkout HEAD~1 2>/dev/null || warn "Cannot rollback git - manual intervention required"
    npm ci --production --silent && npm run build && pm2 start npm --name "$APP_NAME" -- start

    warn "Rollback completed - manual verification required"
}

# Cleanup function
cleanup() {
    info "🧹 Cleaning up temporary files..."

    # Remove old backups (keep last 5)
    if [ -d "$BACKUP_DIR" ]; then
        ls -t "$BACKUP_DIR"/backup_* 2>/dev/null | tail -n +6 | xargs rm -rf 2>/dev/null || true
    fi

    # Clean npm cache
    npm cache clean --force >/dev/null 2>&1 || true
}

# Main deployment function
main() {
    log "🚀 Starting deployment to $DEPLOY_ENV environment"
    log "📝 Log file: $LOG_FILE"

    # Trap for cleanup and rollback
    trap 'error "Deployment failed - initiating cleanup"; cleanup; exit 1' ERR
    trap 'cleanup' EXIT

    # Run deployment steps
    pre_deployment_checks
    backup_database
    install_dependencies
    build_application
    run_tests
    deploy_application

    # Health check with rollback on failure
    if ! health_check; then
        error "Health check failed - rolling back"
        rollback
        exit 1
    fi

    post_deployment_validation
    cleanup

    log "🎉 Deployment completed successfully!"
    log "🌐 Application is running at: http://localhost:3000"
    log "📊 Check logs at: $LOG_FILE"
    log "🔄 Last backup: $(cat .last_backup 2>/dev/null || echo 'None')"
}

# Show usage
usage() {
    echo "Usage: $0 [environment] [options]"
    echo ""
    echo "Environments:"
    echo "  production    Deploy to production (default)"
    echo "  staging       Deploy to staging"
    echo ""
    echo "Options:"
    echo "  --run-tests   Run tests during deployment"
    echo "  --help        Show this help"
    echo ""
    echo "Examples:"
    echo "  $0 production"
    echo "  $0 staging --run-tests"
    echo ""
    echo "Required environment variables:"
    echo "  MONGODB_URI   MongoDB connection string"
    echo "  MONGODB_DB    Database name"
    echo "  REDIS_URL     Redis URL (optional)"
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --run-tests)
            RUN_TESTS=true
            shift
            ;;
        --help)
            usage
            exit 0
            ;;
        production|staging)
            DEPLOY_ENV="$1"
            shift
            ;;
        *)
            error "Unknown option: $1"
            usage
            exit 1
            ;;
    esac
done

# Run main function
main "$@"