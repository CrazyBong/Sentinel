# SentinelAI Backend-Frontend Integration Guide

## Overview
This guide provides step-by-step instructions for integrating and running the SentinelAI backend and frontend applications together.

## Prerequisites

### Required Software
- **Node.js** (v18 or higher)
- **MongoDB** (v5 or higher)
- **Redis** (v6 or higher)
- **Git**

### Optional Software
- **MongoDB Compass** (for database management)
- **Redis Desktop Manager** (for Redis management)

## Project Structure
```
Sentinel/
├── project-sentinel/          # Frontend (React + Vite)
│   ├── src/
│   │   ├── services/         # API and Socket services
│   │   ├── pages/           # React components
│   │   ├── components/      # Reusable components
│   │   └── context/         # React context providers
│   ├── .env                 # Frontend environment variables
│   └── package.json
└── Senitel-backend/         # Backend (Node.js + Express)
    ├── routes/              # API routes
    ├── controllers/         # Route controllers
    ├── models/             # Database models
    ├── services/           # Business logic
    ├── middlewares/        # Express middlewares
    ├── .env.development.local  # Backend environment variables
    └── package.json
```

## Installation & Setup

### Step 1: Install Dependencies

```bash
# Install frontend dependencies
cd project-sentinel
npm install

# Install backend dependencies
cd ../Senitel-backend
npm install

# Or install all dependencies at once
cd ../project-sentinel
npm run install:all
```

### Step 2: Environment Configuration

#### Frontend Environment (.env)
```bash
# Navigate to frontend directory
cd project-sentinel

# Create .env file with the following content:
VITE_API_BASE_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
VITE_APP_NAME=SentinelAI
VITE_APP_VERSION=1.0.0
VITE_DEV_MODE=true
VITE_ENABLE_MOCK_DATA=false
```

#### Backend Environment (.env.development.local)
```bash
# Navigate to backend directory
cd Senitel-backend

# Create .env.development.local file with the following content:
NODE_ENV=development
PORT=5000

# Database Configuration
DB_URI=mongodb://localhost:27017/sentinelAI
MONGODB_URI=mongodb://localhost:27017/sentinelAI

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASS=

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRE=7d

# Frontend URL (CORS)
FRONTEND_URL=http://localhost:3000

# Google AI Configuration
GOOGLE_AI_API_KEY=your-google-ai-api-key

# File Upload Configuration
MAX_FILE_SIZE=5242880
UPLOAD_PATH=./uploads

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Security
HELMET_ENABLED=true
CORS_ENABLED=true
```

### Step 3: Database Setup

#### MongoDB Setup
```bash
# Start MongoDB (Windows)
# Make sure MongoDB service is running or start it manually

# Start MongoDB (macOS/Linux)
brew services start mongodb-community
# or
sudo systemctl start mongod

# Create database and collections (optional - will be created automatically)
mongosh
use sentinelAI
```

#### Redis Setup
```bash
# Start Redis (Windows)
# Make sure Redis service is running or start it manually

# Start Redis (macOS/Linux)
brew services start redis
# or
sudo systemctl start redis

# Test Redis connection
redis-cli ping
```

### Step 4: Create Upload Directories
```bash
# Navigate to backend directory
cd Senitel-backend

# Create upload directories
mkdir -p uploads/profiles
mkdir -p uploads/evidence
mkdir -p uploads/campaigns
```

## Running the Application

### Option 1: Run Both Applications Together
```bash
# Navigate to frontend directory
cd project-sentinel

# Start both frontend and backend
npm run dev:full
```

### Option 2: Run Applications Separately

#### Terminal 1 - Backend
```bash
cd Senitel-backend
npm run dev
```

#### Terminal 2 - Frontend
```bash
cd project-sentinel
npm run dev
```

### Option 3: Using Individual Scripts
```bash
# Start backend only
npm run start:backend

# Start frontend only
npm run start:frontend
```

## Accessing the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000/api
- **Backend Health Check**: http://localhost:5000/health
- **Socket.IO Status**: http://localhost:5000/api/socket/status

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password
- `POST /api/auth/change-password` - Change password

### User Management
- `GET /api/user/profile` - Get user profile
- `PUT /api/user/profile` - Update user profile
- `POST /api/user/photo` - Upload profile photo
- `GET /api/user/settings` - Get user settings
- `PUT /api/user/settings` - Update user settings

### Campaigns
- `GET /api/campaigns` - Get all campaigns
- `GET /api/campaigns/:id` - Get campaign by ID
- `POST /api/campaigns` - Create new campaign
- `PUT /api/campaigns/:id` - Update campaign
- `DELETE /api/campaigns/:id` - Delete campaign

### Analytics
- `GET /api/analytics/dashboard` - Get dashboard analytics
- `GET /api/analytics/trends` - Get trend data
- `GET /api/analytics/platforms` - Get platform statistics

### Evidence
- `GET /api/evidence` - Get all evidence
- `GET /api/evidence/:id` - Get evidence by ID
- `POST /api/evidence` - Create new evidence
- `PUT /api/evidence/:id` - Update evidence

### AI Assistant
- `POST /api/ai/chat` - Chat with AI
- `POST /api/ai/analyze` - Analyze content
- `POST /api/ai/report/:campaignId` - Generate report

## Socket.IO Events

### Client to Server
- `join_campaign` - Join campaign room
- `leave_campaign` - Leave campaign room
- `subscribe_alerts` - Subscribe to alerts
- `user_activity` - Report user activity
- `typing_start` - Start typing indicator
- `typing_stop` - Stop typing indicator
- `request_status` - Request system status

### Server to Client
- `live_alert` - New alert notification
- `targeted_alert` - Targeted alert based on subscription
- `campaign_update` - Campaign data updates
- `analytics_update` - Analytics data updates
- `evidence_update` - Evidence data updates
- `crawler_status` - Crawler status updates
- `notification` - General notifications
- `user_activity` - Other user activities
- `user_typing` - User typing indicators
- `user_online` - User came online
- `user_offline` - User went offline

## Development Workflow

### 1. Frontend Development
- All React components are in `project-sentinel/src/`
- API calls use the service layer in `src/services/api.js`
- Socket connections use `src/services/socket.js`
- State management uses React Context in `src/context/`

### 2. Backend Development
- Routes are defined in `Senitel-backend/routes/`
- Controllers handle business logic in `Senitel-backend/controllers/`
- Database models are in `Senitel-backend/models/`
- Middleware for authentication and validation

### 3. Database Changes
- Update models in `Senitel-backend/models/`
- Run database migrations if needed
- Update API endpoints accordingly

### 4. API Integration
- Frontend uses axios for HTTP requests
- Authentication tokens are automatically included
- Error handling is centralized in the API service

## Troubleshooting

### Common Issues

#### 1. MongoDB Connection Error
```bash
# Check if MongoDB is running
mongosh --eval "db.runCommand('ping')"

# Check connection string in .env.development.local
DB_URI=mongodb://localhost:27017/sentinelAI
```

#### 2. Redis Connection Error
```bash
# Check if Redis is running
redis-cli ping

# Check Redis configuration in .env.development.local
REDIS_HOST=localhost
REDIS_PORT=6379
```

#### 3. CORS Errors
```bash
# Check FRONTEND_URL in backend .env.development.local
FRONTEND_URL=http://localhost:3000
```

#### 4. Port Already in Use
```bash
# Check what's using the port
netstat -ano | findstr :5000  # Windows
lsof -i :5000                 # macOS/Linux

# Kill the process or change the port
```

#### 5. Socket.IO Connection Issues
```bash
# Check VITE_SOCKET_URL in frontend .env
VITE_SOCKET_URL=http://localhost:5000

# Check backend Socket.IO configuration
# Ensure CORS is properly configured
```

### Debug Mode

#### Frontend Debug
```bash
# Enable debug logging
VITE_DEV_MODE=true
VITE_ENABLE_MOCK_DATA=false
```

#### Backend Debug
```bash
# Enable detailed logging
NODE_ENV=development
```

## Production Deployment

### Environment Variables
- Change `NODE_ENV=production`
- Use strong `JWT_SECRET`
- Configure production database URLs
- Set up proper CORS origins
- Configure file upload storage

### Security Considerations
- Use HTTPS in production
- Implement rate limiting
- Set up proper authentication
- Configure file upload restrictions
- Use environment-specific configurations

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review the API documentation
3. Check the console logs for errors
4. Verify environment configurations
5. Ensure all services are running

## Next Steps

After successful integration:
1. Test all authentication flows
2. Verify real-time features work
3. Test file uploads
4. Validate API responses
5. Check Socket.IO connections
6. Test user profile management
7. Verify analytics data flow
