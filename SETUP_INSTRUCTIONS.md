# MERN Blue-Green Deployment - Setup and Run Instructions

## Overview
This project implements a complete MERN (MongoDB, Express, React, Node.js) stack application with blue-green deployment capabilities. The system supports zero-downtime deployments, health monitoring, and automated rollback functionality.

## Prerequisites

Before starting, ensure you have the following installed:
- **Node.js** (v16 or higher)
- **MongoDB** (v4.4 or higher) - Running locally or accessible
- **npm** (comes with Node.js)
- **Nginx** (optional, for production routing)
- **PM2** (optional, for process management) - Install with: `npm install -g pm2`

## Project Structure

```
Capstone/
├── backend/
│   ├── blue/          # Blue environment backend
│   ├── green/         # Green environment backend
│   └── shared/        # Shared backend code
│       ├── app.js     # Express app configuration
│       ├── server.js  # Server startup
│       ├── models/    # Mongoose models
│       └── routes/    # API routes
├── frontend/          # React frontend application
│   ├── src/
│   │   ├── components/
│   │   ├── config/
│   │   └── services/
│   └── public/
├── deployment/        # Deployment scripts and configs
│   ├── nginx/         # Nginx configuration
│   └── scripts/       # Deployment automation scripts
└── database/          # Database migration scripts
```

## Step-by-Step Setup

### 1. Install Dependencies

#### Root Dependencies
```bash
npm install
```

#### Frontend Dependencies
```bash
cd frontend
npm install
cd ..
```

### 2. MongoDB Setup

Start MongoDB service:

**Windows:**
```bash
# If MongoDB is installed as a service, it should start automatically
# Or start manually:
mongod --dbpath C:\data\db
```

**Linux/Mac:**
```bash
# Start MongoDB service
sudo systemctl start mongod
# Or:
mongod --dbpath /data/db
```

Create the databases (MongoDB will create them automatically on first connection):
- `mernapp_blue`
- `mernapp_green`

### 3. Environment Configuration

The environment files are already created:
- `backend/blue/env` - Blue environment config
- `backend/green/env` - Green environment config
- `frontend/env.blue` - Frontend blue config
- `frontend/env.green` - Frontend green config

**Important:** For production, update the JWT_SECRET in backend routes/auth.js or add it to environment files.

### 4. Start the Application

#### Option A: Manual Start (Development)

**Terminal 1 - Start Blue Backend:**
```bash
cd backend/blue
node server.js
```

**Terminal 2 - Start Green Backend:**
```bash
cd backend/green
node server.js
```

**Terminal 3 - Start Frontend (Development Mode):**
```bash
cd frontend
npm start
```

The frontend will run on `http://localhost:3000` (default React port).

#### Option B: Using PM2 (Recommended for Production-like Testing)

**Start Blue Backend:**
```bash
cd backend/blue
pm2 start server.js --name backend-blue
```

**Start Green Backend:**
```bash
cd backend/green
pm2 start server.js --name backend-green
```

**View PM2 Status:**
```bash
pm2 list
pm2 logs
```

**Stop Services:**
```bash
pm2 stop all
pm2 delete all
```

### 5. Build Frontend for Production

**Build Blue Environment:**
```bash
npm run build:blue
```

**Build Green Environment:**
```bash
npm run build:green
```

**Note:** The build scripts will:
1. Copy the appropriate environment file
2. Build the React app
3. Move the build to `build-blue` or `build-green` directory

### 6. Access the Application

- **Frontend (Development):** http://localhost:3000
- **Blue Backend API:** http://localhost:5000
- **Green Backend API:** http://localhost:5001
- **Health Check (Blue):** http://localhost:5000/health
- **Health Check (Green):** http://localhost:5001/health

### 7. Using Nginx (Optional - For Production Routing)

If you want to use Nginx for traffic routing:

1. **Install Nginx** (if not already installed)

2. **Update nginx.conf** path in `deployment/scripts/deploy-controller.js` if needed

3. **Test Nginx Configuration:**
```bash
nginx -t -c deployment/nginx/nginx.conf
```

4. **Start Nginx:**
```bash
nginx -c deployment/nginx/nginx.conf
```

5. **Reload Nginx (after config changes):**
```bash
nginx -s reload
```

## Deployment Scripts

### Available NPM Scripts

```bash
# Development
npm run dev:blue          # Start blue backend in dev mode
npm run dev:green         # Start green backend in dev mode

# Build
npm run build:blue        # Build frontend for blue environment
npm run build:green       # Build frontend for green environment

# Deployment
npm run deploy:blue       # Deploy to blue environment
npm run deploy:green      # Deploy to green environment
npm run deploy:switch     # Switch traffic between environments
npm run deploy:rollback   # Rollback to previous environment
npm run deploy:status     # Check deployment status

# Database
npm run db:sync           # Sync data from blue to green database

# Monitoring
npm run health:check      # Check health of both environments
npm run start:monitoring  # Start automated rollback monitoring
```

## Testing the Application

### 1. Register a New User
- Navigate to http://localhost:3000/register
- Create an account with name, email, and password

### 2. Login
- Use your credentials to login at http://localhost:3000/login

### 3. Access Dashboard
- After login, you'll see the dashboard with environment information

### 4. Manage Products
- Navigate to Products section
- Create, edit, and delete products

### 5. Manage Users
- Navigate to Users section
- View all registered users

### 6. Health Monitoring
- The dashboard shows real-time health status of both blue and green environments
- Health checks run every 30 seconds automatically

## Blue-Green Deployment Workflow

### 1. Initial Deployment (Blue)
```bash
# Start blue environment
npm run dev:blue

# Build blue frontend
npm run build:blue
```

### 2. Deploy New Version to Green
```bash
# Deploy to green (this will build and start green)
npm run deploy:green
```

### 3. Verify Green Environment
```bash
# Check health
npm run health:check

# Or manually check
curl http://localhost:5001/health
```

### 4. Switch Traffic
```bash
# Switch traffic from blue to green
npm run deploy:switch
```

### 5. Monitor and Rollback (if needed)
```bash
# Start automated monitoring
npm run start:monitoring

# Manual rollback if needed
npm run deploy:rollback
```

## Database Synchronization

Before switching environments, sync data:

```bash
npm run db:sync
```

This will copy data from the active (blue) database to the target (green) database.

## Troubleshooting

### MongoDB Connection Issues
- Ensure MongoDB is running: `mongod --version`
- Check connection string in environment files
- Verify MongoDB is accessible on port 27017

### Port Already in Use
- Blue backend uses port 5000
- Green backend uses port 5001
- Frontend uses port 3000
- Check if ports are available: `netstat -ano | findstr :5000` (Windows) or `lsof -i :5000` (Linux/Mac)

### Frontend Build Issues
- Ensure all dependencies are installed: `cd frontend && npm install`
- Check Node.js version: `node --version` (should be v16+)
- Clear cache: `npm cache clean --force`

### Backend Not Starting
- Check MongoDB connection
- Verify environment files exist
- Check logs for errors
- Ensure all dependencies are installed: `npm install`

### Health Checks Failing
- Verify both backend services are running
- Check if ports 5000 and 5001 are accessible
- Review backend logs for errors

## Production Considerations

1. **Security:**
   - Change JWT_SECRET in production
   - Use environment variables for sensitive data
   - Enable HTTPS
   - Implement rate limiting

2. **Database:**
   - Use MongoDB Atlas or managed MongoDB
   - Set up database backups
   - Configure proper indexes

3. **Monitoring:**
   - Set up proper logging (Winston, Morgan)
   - Use APM tools (New Relic, Datadog)
   - Monitor error rates and performance

4. **Deployment:**
   - Use CI/CD pipelines
   - Automate testing before deployment
   - Implement canary deployments

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user (protected)

### Users
- `GET /api/users` - Get all users (protected)
- `GET /api/users/:id` - Get user by ID (protected)
- `PUT /api/users/:id` - Update user (protected)
- `DELETE /api/users/:id` - Delete user (protected)

### Products
- `GET /api/products` - Get all products
- `GET /api/products/:id` - Get product by ID
- `POST /api/products` - Create product (protected)
- `PUT /api/products/:id` - Update product (protected)
- `DELETE /api/products/:id` - Delete product (protected)

### Health & Metrics
- `GET /health` - Health check endpoint
- `GET /metrics` - Application metrics

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review backend/frontend logs
3. Verify all prerequisites are met
4. Ensure MongoDB is running and accessible

## License

This project is part of a Capstone project for educational purposes.

