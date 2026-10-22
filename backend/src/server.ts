import mongoose from 'mongoose';
import {automationBackupAccess} from './middleware/automationAccess';
import {downloadBackup} from './controllers/operationsController';
import supportRoutes from './routes/supportRoutes';
import {monitorRequests,reportClientError} from './middleware/operations';
import {protect} from './middleware/authMiddleware';
import {withRequestContext} from './middleware/requestContext';
import { authenticateSocket } from './realtime';
import { getAllowedOrigins } from './config/origins';
import { platformActivity } from './middleware/platformActivity';
import fs from 'fs';
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import connectDB from './config/db';
import authRoutes from './routes/authRoutes';
import serviceRoutes from './routes/serviceRoutes';
import bookingRoutes from './routes/bookingRoutes';
import adminRoutes from './routes/adminRoutes';
import workerRoutes from './routes/workerRoutes';
import uploadRoutes from './routes/uploadRoutes';
import reviewRoutes from './routes/reviewRoutes';
import unitConfigRoutes from './routes/unitConfigRoutes';
import profileRoutes from './routes/profileRoutes';
import chatRoutes from './routes/chatRoutes';
import customServiceRoutes from './routes/customServiceRoutes';
import path from 'path';
import { ensurePlatformOwner } from './security/ownership';

import { createServer } from 'http'; // Import createServer
import { Server as SocketIOServer } from 'socket.io'; // Import SocketIOServer

dotenv.config();

const databaseReady = connectDB().then(() => ensurePlatformOwner());

const app = express();
if (process.env.RENDER) app.set('trust proxy', 1);
const httpServer = createServer(app); // Create HTTP server from app
const io = new SocketIOServer(httpServer, { // Attach Socket.IO to HTTP server
  cors: {
    origin: getAllowedOrigins(),
    methods: ['GET', 'POST'],
  },
});

app.use(cors({ origin: getAllowedOrigins() }));
app.set('io', io);
fs.mkdirSync(path.join(__dirname, '..', 'uploads'), { recursive: true });
app.use(express.json());

app.get('/', (req, res) => {
  res.send('API is running...');
});

app.use(withRequestContext);
app.use(monitorRequests);
app.post('/api/client-errors',protect,reportClientError);
app.use(platformActivity);
app.get('/health',(_req,res)=>res.status(mongoose.connection.readyState===1?200:503).json({status:mongoose.connection.readyState===1?'ok':'unavailable'}));
app.post('/api/operations/backup',automationBackupAccess,downloadBackup);
app.use('/api/auth', authRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/services/custom', customServiceRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/worker', workerRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/unit-configs', unitConfigRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/support',supportRoutes);

// Serve uploaded files statically
// In development (ts-node): __dirname = 'backend/src', uploads = 'backend/uploads'
// In production (node dist): __dirname = 'backend/dist', uploads = 'backend/uploads'
const uploadsPath = path.join(__dirname, '..', 'uploads');
app.use('/uploads', express.static(uploadsPath));

console.log('📁 Uploads path:', uploadsPath);
console.log('📁 Uploads absolute:', path.resolve(uploadsPath));
console.log('📁 Directory exists:', require('fs').existsSync(uploadsPath));

// Each authenticated device joins the same user room; messages originate in the REST API.
io.use(authenticateSocket);
io.on('connection', socket => { socket.join('user:' + socket.data.userId); });

app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (res.headersSent) return next(error);
  const status = error.code === 'LIMIT_FILE_SIZE' ? 413 : error.name === 'ValidationError' || error.name === 'CastError' || error.message?.includes('image files') ? 400 : 500;
  res.status(status).json({ message: status === 413 ? 'Image must be 5MB or smaller' : status === 400 ? error.message : 'Server error' });
});

const PORT = process.env.PORT || 5003;

databaseReady.then(() => httpServer.listen(PORT, () => console.log(`Server running on port ${PORT}`))).catch(() => { console.error('Platform ownership setup failed. Check the owner account configuration.'); process.exit(1); });
