#!/bin/bash

# No-Code API Connector Backend Runner
# This script helps you run the backend with custom host and port

# Load environment variables from .env file if it exists
if [ -f ".env" ]; then
    export $(grep -v '^#' .env | xargs)
fi

# Set defaults
BACKEND_HOST=${BACKEND_HOST:-"localhost"}
BACKEND_PORT=${BACKEND_PORT:-8000}

# Function to show usage
show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -h, --host HOST       Set backend host (default: localhost)"
    echo "  -p, --port PORT       Set backend port (default: 8000)"
    echo "  -d, --docker          Run with Docker Compose instead of PHP built-in server"
    echo "  --help                Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                     # Run with defaults (localhost:8000)"
    echo "  $0 -p 8080            # Run on port 8080"
    echo "  $0 -h 0.0.0.0 -p 9000 # Run on all interfaces, port 9000"
    echo "  $0 -d                 # Run with Docker Compose"
    echo ""
    echo "Environment variables:"
    echo "  BACKEND_HOST          Override default host"
    echo "  BACKEND_PORT          Override default port"
    echo ""
    echo "Note: When using -d/--docker, environment variables are exported"
    echo "      before running docker-compose (docker-compose doesn't support --env flag)"
}

# Parse command line arguments
USE_DOCKER=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--host)
            BACKEND_HOST="$2"
            shift 2
            ;;
        -p|--port)
            BACKEND_PORT="$2"
            shift 2
            ;;
        -d|--docker)
            USE_DOCKER=true
            shift
            ;;
        --help)
            show_usage
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

echo "🚀 Starting No-Code API Connector Backend"
echo "📍 Host: $BACKEND_HOST"
echo "🔌 Port: $BACKEND_PORT"
echo ""

if [ "$USE_DOCKER" = true ]; then
    echo "🐳 Running with Docker Compose..."

    # Export variables for docker-compose
    export BACKEND_HOST=$BACKEND_HOST
    export BACKEND_PORT=$BACKEND_PORT

    # Run docker-compose
    docker-compose up -d backend

    echo ""
    echo "✅ Backend started with Docker!"
    echo "🌐 API available at: http://$BACKEND_HOST:$BACKEND_PORT"
    echo "🔍 Check logs: docker-compose logs -f backend"
    echo "🛑 Stop: docker-compose down"

else
    echo "🐘 Running with PHP built-in server..."

    # Check if PHP is available
    if ! command -v php &> /dev/null; then
        echo "❌ PHP is not installed or not in PATH"
        exit 1
    fi

    # Check if public directory exists
    if [ ! -d "public" ]; then
        echo "❌ public directory not found. Are you in the correct directory?"
        exit 1
    fi

    echo "📂 Serving from: $(pwd)/public"
    echo ""

    # Start PHP server
    php -S $BACKEND_HOST:$BACKEND_PORT -t public

fi