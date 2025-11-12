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
cp .env.example .env.local

# Start development server
npm run dev

# Access: http://localhost:3000
```

### Production Build
```bash
# Build for production
npm run build

# Start production server
npm start
```

## 🔧 Configuration

### Environment Variables
```bash
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
# Use different port
PORT=3001 npm run dev
```

### API Connection Issues
```bash
# Check backend is running
curl http://localhost:8000/api/admin/health

# Update API URL in .env.local
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
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