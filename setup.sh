#!/bin/bash

# No-Code API Connector Setup Script
# This script sets up both backend and frontend development environments

# Default configuration (can be overridden with environment variables)
BACKEND_HOST=${BACKEND_HOST:-localhost}
FRONTEND_HOST=${FRONTEND_HOST:-localhost}
BACKEND_PORT=${BACKEND_PORT:-8000}
FRONTEND_PORT=${FRONTEND_PORT:-3000}
AIRFLOW_PORT=${AIRFLOW_PORT:-8080}
MONGO_PORT=${MONGO_PORT:-27017}
USE_MONGO_ATLAS=${USE_MONGO_ATLAS:-false}

echo "🚀 Setting up No-Code API Connector (Backend + Frontend)..."
echo "📍 Configuration:"
echo "   Backend:  $BACKEND_HOST:$BACKEND_PORT"
echo "   Frontend: $FRONTEND_HOST:$FRONTEND_PORT"
echo "   Airflow:  $FRONTEND_HOST:$AIRFLOW_PORT"
if [ "$USE_MONGO_ATLAS" = "true" ]; then
    echo "   MongoDB:  Atlas (cloud)"
else
    echo "   MongoDB:  $BACKEND_HOST:$MONGO_PORT"
fi

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
if [ ! -f "frontendphp/.env" ]; then
    cp frontendphp/.env.example frontendphp/.env
    echo "✅ Created frontendphp/.env from template"
else
    echo "ℹ️  frontendphp/.env already exists, skipping..."
fi

# Update frontend environment with API URL
API_URL="http://$BACKEND_HOST:$BACKEND_PORT"
sed -i.bak "s|^NEXT_PUBLIC_API_BASE_URL=.*|NEXT_PUBLIC_API_BASE_URL=$API_URL|" frontendphp/.env
echo "✅ Updated frontend API URL: $API_URL"

# Update backend MongoDB URI if not using Atlas
if [ "$USE_MONGO_ATLAS" != "true" ]; then
    MONGO_URI="mongodb://$BACKEND_HOST:$MONGO_PORT"
    sed -i.bak "s|^MONGODB_URI=.*|MONGODB_URI=$MONGO_URI|" backendphp/.env
    echo "✅ Updated backend MongoDB URI: $MONGO_URI"
fi

# Start backend services
echo "🐳 Starting backend services..."
cd backendphp
docker-compose up -d

# Start frontend services
echo "🌐 Starting frontend services..."
cd ../frontendphp
docker-compose up -d

echo "⏳ Waiting for services to be ready..."
sleep 30

# Check service health
echo "🔍 Checking service health..."

# Check backend health
BACKEND_URL="http://$BACKEND_HOST:$BACKEND_PORT/api/admin/health"
if curl -s --max-time 10 "$BACKEND_URL" | grep -q '"status":"healthy"'; then
    echo "✅ Backend is healthy!"
else
    echo "⚠️  Backend health check failed. Services may still be starting..."
fi

# Check frontend health (basic connectivity check)
FRONTEND_URL="http://$FRONTEND_HOST:$FRONTEND_PORT"
if curl -s --max-time 10 "$FRONTEND_URL" | grep -q "html"; then
    echo "✅ Frontend is accessible!"
else
    echo "⚠️  Frontend health check failed. Services may still be starting..."
fi

echo ""
echo "🎉 Setup complete! Both backend and frontend are running."
echo ""
echo "🌐 Access URLs:"
echo "   Frontend:    http://$FRONTEND_HOST:$FRONTEND_PORT"
echo "   Backend API: http://$BACKEND_HOST:$BACKEND_PORT"
echo "   Airflow UI:  http://$FRONTEND_HOST:$AIRFLOW_PORT"
if [ "$USE_MONGO_ATLAS" = "true" ]; then
    echo "   MongoDB:     Atlas (configured in .env)"
else
    echo "   MongoDB:     $BACKEND_HOST:$MONGO_PORT"
fi
echo ""
echo "📝 Useful commands:"
echo "   View logs: docker-compose logs -f (in respective directories)"
echo "   Stop all: cd backendphp && docker-compose down && cd ../frontendphp && docker-compose down"
echo "   Restart: cd backendphp && docker-compose restart && cd ../frontendphp && docker-compose restart"