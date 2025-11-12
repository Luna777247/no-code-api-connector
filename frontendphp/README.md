# Frontend Next.js

Next.js 15 UI for the No-Code API Connector platform.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn

### Development Mode
```bash
cd frontendphp

# Install dependencies
npm install

# Copy environment
cp .env.example .env

# Start development server
npm run dev

# Access: http://localhost:3000
```

### Manual Docker Deployment
```bash
cd frontendphp

# Copy environment configuration
cp .env.example .env

# Start with Docker Compose
docker-compose up -d

# Access: http://localhost:3000
```

### Custom Ports and API URL
```bash
# Set custom frontend port
$env:FRONTEND_PORT="3001"; docker-compose up -d

# Set custom frontend host and port
$env:FRONTEND_HOST="127.0.0.1"; $env:FRONTEND_PORT="3001"; docker-compose up -d

# Set custom backend API URL
$env:NEXT_PUBLIC_API_BASE_URL="http://192.168.1.100:8000"; docker-compose up -d

# Combine both
$env:FRONTEND_PORT="3001"; $env:NEXT_PUBLIC_API_BASE_URL="http://backend:80"; docker-compose up -d
```

## 🔧 Configuration

### Environment Variables
```bash
# Frontend host (Docker only)
FRONTEND_HOST=0.0.0.0

# Frontend port (Docker only)
FRONTEND_PORT=3000

# API Backend URL
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000

# Environment
NODE_ENV=development
```

### Custom API URL
```bash
# For different backend location
NEXT_PUBLIC_API_BASE_URL=http://192.168.1.100:9000 npm run dev
```

## 📱 Features

- **API Connections**: Create and manage API connections
- **Schedules**: Set up automated API executions
- **Dashboard**: Analytics and data visualization
- **Runs**: Monitor API execution history

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Use different port with setup script
.\setup.ps1 -FrontendPort 3001

# Or manually set environment variable
$env:FRONTEND_PORT="3001"; docker-compose up -d
```

### API Connection Issues
```bash
# Check backend is running
curl http://localhost:8000/api/admin/health

# Update API URL with setup script
.\setup.ps1 -BackendHost 192.168.1.100 -BackendPort 9000

# Or manually update .env file
NEXT_PUBLIC_API_BASE_URL=http://192.168.1.100:9000
```

### Docker Issues
```bash
# Rebuild containers
docker-compose down
docker-compose up -d --build

# View detailed logs
docker-compose logs -f frontend
```

## 📁 Project Structure

```
├── app/                 # Next.js app directory
│   ├── components/      # React components
│   ├── lib/            # Utilities and helpers
│   └── public/         # Static assets
├── services/           # API client and services
├── styles/             # CSS and styling
├── package.json        # Dependencies
└── next.config.mjs     # Next.js configuration
```