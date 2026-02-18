# How to Run the MERN Blue-Green Deployment Project

## Prerequisites Checklist

Before running, ensure you have:
- ✅ Node.js installed (v16 or higher) - Check with: `node --version`
- ✅ MongoDB installed and running - Check with: `mongod --version`
- ✅ npm installed (comes with Node.js) - Check with: `npm --version`

## Step 1: Install Dependencies

Open a terminal in the project root directory (`D:\Capstone`) and run:

```bash
# Install root dependencies
npm install

# Install frontend dependencies
cd frontend
npm install
cd ..
```

## Step 2: Start MongoDB

**Windows:**
- If MongoDB is installed as a service, it should start automatically
- Or start manually: `mongod --dbpath C:\data\db`
- Or use MongoDB Compass to start the service

**Linux/Mac:**
```bash
sudo systemctl start mongod
# Or
mongod --dbpath /data/db
```

Verify MongoDB is running by checking if you can connect (it should start without errors).

## Step 3: Start the Application

You need **3 separate terminal windows** for development:

### Terminal 1 - Blue Backend
```bash
npm run dev:blue
```
You should see: `🚀 Server running on port 5000 | Environment: blue`

### Terminal 2 - Green Backend
```bash
npm run dev:green
```
You should see: `🚀 Server running on port 5001 | Environment: green`

### Terminal 3 - Frontend
```bash
cd frontend
npm start
```
This will:
- Start the React development server
- Open your browser automatically to http://localhost:3000
- If it doesn't open automatically, navigate to http://localhost:3000

## Step 4: Use the Application

1. **Register a New Account**
   - Click "Register here" or navigate to http://localhost:3000/register
   - Fill in: Name, Email, Password (min 6 characters)
   - Click "Register"

2. **Login**
   - Use your registered email and password
   - Click "Login"

3. **Explore Features**
   - **Dashboard**: See your user info and environment status
   - **Products**: Create, edit, and delete products
   - **Users**: View all registered users
   - **Health Status**: See real-time health of blue and green environments

## Verification Steps

### Check Backend Health
Open a browser and visit:
- Blue: http://localhost:5000/health
- Green: http://localhost:5001/health

You should see JSON responses with status "healthy" when MongoDB is connected.

### Check API Endpoints
Test the API directly:
```bash
# Health check
curl http://localhost:5000/health
curl http://localhost:5001/health

# Metrics
curl http://localhost:5000/metrics
```

## Common Issues and Solutions

### Issue: "Port already in use"
**Solution:**
- Check if ports 5000, 5001, or 3000 are already in use
- Windows: `netstat -ano | findstr :5000`
- Linux/Mac: `lsof -i :5000`
- Kill the process or use different ports

### Issue: "MongoDB connection failed"
**Solution:**
1. Ensure MongoDB is running
2. Check MongoDB connection string in `backend/blue/env` and `backend/green/env`
3. Default: `mongodb://localhost:27017/mernapp_blue` and `mongodb://localhost:27017/mernapp_green`
4. Databases will be created automatically on first connection

### Issue: "Cannot find module"
**Solution:**
- Run `npm install` in the root directory
- Run `npm install` in the frontend directory
- Delete `node_modules` and `package-lock.json`, then reinstall

### Issue: "Frontend won't start"
**Solution:**
- Ensure you're in the `frontend` directory
- Check Node.js version: `node --version` (should be v16+)
- Clear npm cache: `npm cache clean --force`
- Delete `node_modules` in frontend and reinstall

## Production Build (Optional)

To build for production:

```bash
# Build blue environment
npm run build:blue

# Build green environment
npm run build:green
```

Built files will be in:
- `frontend/build-blue/`
- `frontend/build-green/`

## Using PM2 (Process Manager)

Instead of running in separate terminals, you can use PM2:

```bash
# Install PM2 globally
npm install -g pm2

# Start blue backend
cd backend/blue
pm2 start server.js --name backend-blue
cd ../..

# Start green backend
cd backend/green
pm2 start server.js --name backend-green
cd ../..

# View status
pm2 list

# View logs
pm2 logs

# Stop all
pm2 stop all
pm2 delete all
```

## Deployment Scripts

### Health Check
```bash
npm run health:check
```

### Deploy to Green
```bash
npm run deploy:green
```

### Switch Traffic
```bash
npm run deploy:switch
```

### Check Status
```bash
npm run deploy:status
```

### Start Monitoring
```bash
npm run start:monitoring
```

## Stopping the Application

1. **In each terminal window**, press `Ctrl+C` to stop the process
2. **If using PM2**: `pm2 stop all && pm2 delete all`
3. **Stop MongoDB** (if needed):
   - Windows: Stop the MongoDB service
   - Linux/Mac: `sudo systemctl stop mongod`

## Next Steps

- Read [SETUP_INSTRUCTIONS.md](./SETUP_INSTRUCTIONS.md) for detailed configuration
- Read [PROJECT_COMPLETION_SUMMARY.md](./PROJECT_COMPLETION_SUMMARY.md) for project overview
- Explore the API endpoints in the backend routes
- Customize the frontend components
- Set up Nginx for production routing (see SETUP_INSTRUCTIONS.md)

## Support

If you encounter issues:
1. Check the terminal output for error messages
2. Verify MongoDB is running
3. Check that all dependencies are installed
4. Review the troubleshooting section in SETUP_INSTRUCTIONS.md

---

**Happy Coding! 🚀**

