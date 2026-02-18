const mongoose = require('mongoose');
const app = require('./app');

const PORT = process.env.PORT || 5000;
// FIX: Use environment-specific database
const MONGODB_URI = process.env.MONGODB_URI || `mongodb://localhost:27017/mernapp_${process.env.APP_ENVIRONMENT || 'blue'}`;

const connectDB = async (retries = 5, delay = 5000) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`Database connection attempt ${attempt}/${retries} to ${MONGODB_URI}`);
      await mongoose.connect(MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 5000,
      });
      console.log('✅ MongoDB connected successfully');
      return;
    } catch (error) {
      console.error(`❌ MongoDB connection failed (attempt ${attempt}/${retries}):`, error.message);
      
      if (attempt === retries) {
        console.error('Max retries reached. Exiting...');
        process.exit(1);
      }
      
      console.log(`Retrying in ${delay/1000} seconds...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

const startServer = async () => {
  try {
    await connectDB();

    const server = app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT} | Environment: ${process.env.APP_ENVIRONMENT || 'blue'}`);
    });

    // Enhanced graceful shutdown
    const gracefulShutdown = (signal) => {
      console.log(`\n${signal} received, shutting down gracefully`);
      server.close(() => {
        console.log('HTTP server closed');
        mongoose.connection.close(false, () => {
          console.log('MongoDB connection closed');
          process.exit(0);
        });
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle unhandled exceptions
    process.on('uncaughtException', (error) => {
      console.error('Uncaught Exception:', error);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
      process.exit(1);
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();