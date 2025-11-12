#!/bin/bash

# No-Code API Connector Setup Script
# This script sets up the development environment with proper defaults

# Default configuration (can be overridden with environment variables)
BACKEND_HOST=${BACKEND_HOST:-localhost}
FRONTEND_HOST=${FRONTEND_HOST:-localhost}
BACKEND_PORT=${BACKEND_PORT:-8000}
AIRFLOW_PORT=${AIRFLOW_PORT:-8080}

echo "🚀 Setting up No-Code API Connector..."
echo "📍 Configuration: Backend=$BACKEND_HOST:$BACKEND_PORT, Airflow=$FRONTEND_HOST:$AIRFLOW_PORT"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Navigate to backend directory and copy environment files
echo "📁 Setting up backend environment..."
if [ ! -f "backendphp/.env" ]; then
    cp backendphp/.env.example backendphp/.env
    echo "✅ Created backendphp/.env from template"
else
    echo "ℹ️  backendphp/.env already exists, skipping..."
fi

# Navigate to frontend directory and copy environment files
echo "📁 Setting up frontend environment..."
if [ ! -f "frontendphp/.env.local" ]; then
    # Create .env.local with configurable API URL
    API_URL="http://$BACKEND_HOST:$BACKEND_PORT"
    echo "NEXT_PUBLIC_API_BASE_URL=$API_URL" > frontendphp/.env.local
    echo "✅ Created frontendphp/.env.local with API URL: $API_URL"
else
    echo "ℹ️  frontendphp/.env.local already exists, skipping..."
fi

# Start the services
echo "🐳 Starting Docker services..."
cd backendphp
docker-compose up -d

echo "⏳ Waiting for services to be ready..."
sleep 30

# Check service health
echo "🔍 Checking service health..."
BACKEND_URL="http://$BACKEND_HOST:$BACKEND_PORT/api/admin/health"
if curl -s --max-time 10 "$BACKEND_URL" | grep -q '"status":"healthy"'; then
    echo "✅ Backend is healthy!"
else
    echo "⚠️  Backend health check failed. Services may still be starting..."
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "🌐 Access URLs:"
echo "   Backend API:  http://$BACKEND_HOST:$BACKEND_PORT"
echo "   Airflow UI:   http://$FRONTEND_HOST:$AIRFLOW_PORT"
echo ""
echo "🌐 Access URLs:"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:8000"
echo "   Airflow:  http://localhost:8080"
echo ""
echo "📝 Next steps:"
echo "   1. Start frontend: cd frontendphp && npm run dev"
echo "   2. Check backend health: curl http://localhost:8000/api/admin/health"
echo "   3. View Airflow UI at http://localhost:8080 (admin/admin)"