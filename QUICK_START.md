# Quick Start Guide

## Fastest Way to Run the Application

### 1. Install Dependencies
```bash
npm install
cd frontend && npm install && cd ..
```

### 2. Start MongoDB
Make sure MongoDB is running on your system.

### 3. Start Both Backends
Open two terminal windows:

**Terminal 1:**
```bash
npm run dev:blue
```

**Terminal 2:**
```bash
npm run dev:green
```

### 4. Start Frontend
Open a third terminal:
```bash
cd frontend
npm start
```

### 5. Access Application
- Open browser: http://localhost:3000
- Register a new account
- Login and explore!

## Quick Commands Reference

```bash
# Start services
npm run dev:blue          # Blue backend
npm run dev:green         # Green backend
cd frontend && npm start  # Frontend

# Health checks
npm run health:check      # Check both environments

# Deployment
npm run deploy:green      # Deploy to green
npm run deploy:switch      # Switch traffic

# Status
npm run deploy:status     # Check deployment status
```

## Default Ports
- Frontend: 3000
- Blue Backend: 5000
- Green Backend: 5001

## First Time Setup
1. Register at http://localhost:3000/register
2. Login with your credentials
3. Create products in the Products section
4. View users in the Users section

That's it! You're ready to go! 🚀

