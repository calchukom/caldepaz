import express, { Application, Request, Response, NextFunction } from "express";
import dotenv from "dotenv";
import { createServer } from "http";
import { logger } from "./middleware/logger";
import { closeDbPool, sql } from "./drizzle/db";
// Import Swagger configuration
import { setupSwagger } from "./config/swagger.config";
import { configureSecurityMiddleware, errorHandler, notFoundHandler } from "./middleware/security";
import compression from "compression";
import path from "path";
import { performanceMiddleware } from './middleware/performance';
import { initializeWebSocket } from './services/websocket.service';

// Load environment variables before any other code
dotenv.config();

// Initialize express app
const app: Application = express();

// Create HTTP server
const server = createServer(app);

// Initialize WebSocket service
const webSocketService = initializeWebSocket(server);

process.on('SIGTERM', async () => {
    logger.info('SIGTERM received. Shutting down gracefully...');
    try {
        // Close the database connection pool
        await closeDbPool();

        // Close the server
        server.close(() => {
            logger.info('HTTP server closed');
            logger.info('Process terminated gracefully');
            process.exit(0);
        });

        // Force close after timeout
        setTimeout(() => {
            logger.error('Forcing shutdown after timeout');
            process.exit(1);
        }, 30000); // 30 seconds timeout
    } catch (err) {
        logger.error('Error during graceful shutdown', err);
        process.exit(1);
    }
});

process.on('SIGINT', async () => {
    logger.info('SIGINT received. Shutting down gracefully...');
    try {
        // Close the database connection pool
        await closeDbPool();

        // Close the server
        server.close(() => {
            logger.info('HTTP server closed');
            logger.info('Process terminated gracefully');
            process.exit(0);
        });

        // Force close after timeout
        setTimeout(() => {
            logger.error('Forcing shutdown after timeout');
            process.exit(1);
        }, 30000); // 30 seconds timeout
    } catch (err) {
        logger.error('Error during graceful shutdown', err);
        process.exit(1);
    }
});

// Import all route modules
import authRoutes from "./auth/auth.route";
import userRoutes from "./users/user.route";
import locationRoutes from "./locations/location.route";
import vehicleSpecRoutes from "./vehicle_specifications/vehicleSpec.route";
import vehicleRoutes from "./vehicles/vehicle.route";
import vehicleImageRoutes from "./vehicleImages/vehicleImage.route";
import bookingRoutes from "./bookings/booking.route";
import paymentRoutes from "./payments/payment.route";
import supportTicketRoutes from "./support_tickets/supportTicket.route";
import maintenanceRoutes from "./maintenance/maintenance.route";
import chatRoutes from "./chat/chat.routes";
import agentRoutes from "./agents/agent.route";
import testEmailRoutes from "./routes/testEmail.route";
import emailRoutes from "./routes/email.route";

// Apply security middleware (helmet, cors, rate limiting, etc.)
configureSecurityMiddleware(app);

// Enable compression for all responses
app.use(compression());

// Configure request body parsing
app.use(express.json({ limit: "2mb" })); // Reduced limit for security
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

// Logging middleware
app.use(logger.middleware);

const PORT = process.env.PORT || 7000;

//performance middleware
app.use(performanceMiddleware);

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/locations", locationRoutes);
app.use("/api/vehicle-specifications", vehicleSpecRoutes);
app.use("/api/vehicles", vehicleRoutes);
app.use("/api", vehicleImageRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/support-tickets", supportTicketRoutes);
app.use("/api/maintenance", maintenanceRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/agents", agentRoutes);
app.use("/api/email", emailRoutes);
app.use("/api/test", testEmailRoutes);

// Default route
app.get("/", (req: Request, res: Response) => {
    res.json({
        success: true,
        message: "Welcome to the Vehicle Rental Management System API! 🚗",
        version: "1.0.0",
        documentation: "/api/docs",
        status: "All modules integrated and ready",
        modules: {
            authentication: "/api/auth",
            users: "/api/users",
            locations: "/api/locations",
            vehicle_specifications: "/api/vehicle-specifications",
            vehicles: "/api/vehicles",
            bookings: "/api/bookings",
            payments: "/api/payments",
            support_tickets: "/api/support-tickets",
            maintenance: "/api/maintenance",
            agents: "/api/agents",
            chat: "/api/chat",
            email: "/api/email"
        },
        features: [
            "🔐 JWT Authentication & Authorization",
            "👥 User Management (Admin & User roles)",
            "📍 Location Management",
            "🚗 Vehicle Inventory & Specifications",
            "📅 Booking System with Conflict Detection",
            "💳 Payment Integration (Stripe/M-Pesa)",
            "🎫 Support Ticket System",
            "📊 Analytics & Reporting",
            "🔍 Advanced Search & Filtering",
            "⚡ Rate Limiting & Security"
        ],
        adminFeatures: [
            "Dashboard with Analytics",
            "User Management",
            "Vehicle Fleet Management",
            "Booking Management",
            "Payment Oversight",
            "Support Ticket Administration",
            "Revenue & Performance Reports"
        ],
        userFeatures: [
            "Browse & Filter Vehicles",
            "Check Availability",
            "Create Bookings",
            "Process Payments",
            "View Booking History",
            "Submit Support Tickets",
            "Profile Management"
        ]
    });
});

// Import the health check middleware
import { healthCheck } from "./middleware/healthCheck";

// Health check endpoint with detailed system information
app.get("/health", healthCheck);

// Add readiness and liveness probes for Kubernetes/container orchestration
app.get("/ready", async (req: Request, res: Response) => {
    try {
        // Check database connection using Neon
        if (sql) {
            await sql`SELECT 1`;
            res.status(200).json({ status: 'ready' });
        } else {
            res.status(503).json({ status: 'not ready', error: 'Database not initialized' });
        }
    } catch (error) {
        logger.error('Readiness check failed', error);
        res.status(503).json({ status: 'not ready', error: 'Database connection failed' });
    }
});

app.get("/live", (_req: Request, res: Response) => {
    res.status(200).json({ status: 'alive' });
});

// Static files for API documentation (if enabled)
if (process.env.NODE_ENV === 'production') {
    const docsPath = path.join(__dirname, '../public/docs');
    app.use('/api/docs', express.static(docsPath));
}

// Setup API Documentation with Swagger
if (process.env.ENABLE_API_DOCS === 'true') {
    setupSwagger(app);
}

// 404 handler - use the centralized handler
app.use("*", notFoundHandler);

// Global error handler - use the centralized handler
app.use(errorHandler);

// Start the HTTP server
const httpServer = server.listen(PORT, () => {
    logger.info(`🚗 Vehicle Rental Management System API`);
    logger.info(`🚀 Server running in ${process.env.NODE_ENV || 'development'} mode on http://localhost:${PORT}`);
    logger.info(`📚 API Documentation: http://localhost:${PORT}/api/docs`);
    logger.info(`💚 Health Check: http://localhost:${PORT}/health`);
    logger.info(`⚡ WebSocket Server: Ready for real-time connections`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
    logger.info('SIGTERM received. Shutting down gracefully...');
    httpServer.close(() => {
        logger.info('Process terminated');
    });
});

process.on('SIGINT', () => {
    logger.info('SIGINT received. Shutting down gracefully...');
    httpServer.close(() => {
        logger.info('Process terminated');
    });
});

// Handle uncaught exceptions and promise rejections
process.on('uncaughtException', (err) => {
    logger.error('UNCAUGHT EXCEPTION! 💥 Shutting down...', err);
    process.exit(1);
});

process.on('unhandledRejection', (err: Error) => {
    logger.error('UNHANDLED REJECTION! 💥 Shutting down...', err);
    httpServer.close(() => {
        process.exit(1);
    });
});
