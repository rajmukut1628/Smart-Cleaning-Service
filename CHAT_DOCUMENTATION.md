# Real-time Chat System Documentation

## Overview
The cleaning service platform now includes a real-time chat system that allows users, workers, and admins to communicate instantly using Socket.IO.

## Features

### 1. **Role-based Chat Contacts**

#### For Users:
- Can chat with assigned workers from their bookings
- Can contact admin support for assistance
- Contacts automatically populated based on booking history

#### For Workers:
- Can chat with customers from assigned bookings
- View all customers they've served

#### For Admins:
- Can chat with all users (customers, workers, and other admins)
- Provide support to all platform users

### 2. **Real-time Messaging**
- Instant message delivery using Socket.IO
- Messages are persisted in MongoDB
- Auto-scroll to latest messages
- Message timestamps with formatted display
- Online/offline status indicators (placeholder - can be enhanced)

### 3. **Message Features**
- Send text messages
- Message read status tracking
- Unread message count (available via API endpoint)
- Message history retrieval

## Technical Implementation

### Backend Components

#### 1. **Message Model** (`backend/src/models/Message.ts`)
```typescript
interface IMessage {
  senderId: ObjectId;
  senderName: string;
  receiverId: ObjectId;
  message: string;
  timestamp: Date;
  isRead: boolean;
}
```

#### 2. **Chat Controller** (`backend/src/controllers/chatController.ts`)
- `getContacts()` - Fetch contacts based on user role
- `getMessages()` - Get message history with a specific contact
- `sendMessage()` - Send and persist a new message
- `getUnreadCount()` - Get count of unread messages

#### 3. **Chat Routes** (`backend/src/routes/chatRoutes.ts`)
- `GET /api/chat/contacts` - Get user's chat contacts
- `GET /api/chat/messages/:contactId` - Get messages with a contact
- `POST /api/chat/send` - Send a message
- `GET /api/chat/unread-count` - Get unread message count

#### 4. **Socket.IO Integration** (`backend/src/server.ts`)
- Real-time bidirectional communication
- User socket mapping for targeted message delivery
- Events:
  - `join` - User connects with their ID
  - `chatMessage` - Send/receive messages
  - `disconnect` - User disconnects

### Frontend Components

#### 1. **ChatInterface Component** (`frontend/src/components/Chat/ChatInterface.tsx`)
- Contact list sidebar
- Message display area
- Message input form
- Socket.IO client connection
- Real-time message updates

#### 2. **State Management**
- `contacts` - List of available chat contacts
- `messages` - Current conversation messages
- `selectedContact` - Active chat contact
- `newMessage` - Message input state

## API Endpoints

### Authentication Required
All chat endpoints require JWT authentication via `Authorization: Bearer <token>` header.

### Endpoints

#### Get Contacts
```
GET /api/chat/contacts
```
Returns array of contacts based on user role.

#### Get Messages
```
GET /api/chat/messages/:contactId
```
Returns message history with specified contact. Marks messages as read.

#### Send Message
```
POST /api/chat/send
Body: {
  receiverId: string,
  message: string
}
```
Saves message to database and returns the created message.

#### Get Unread Count
```
GET /api/chat/unread-count
```
Returns `{ unreadCount: number }`

## Usage Guide

### For Users
1. Navigate to User Dashboard
2. Click "Chat" tab or navigate to `/user/chat`
3. Select a worker from your bookings or admin support
4. Type message and press Enter or click send button

### For Workers
1. Navigate to Worker Dashboard
2. Access chat interface
3. Select a customer to chat with
4. Send messages in real-time

### For Admins
1. Navigate to Admin Dashboard
2. Access chat interface
3. Chat with any user on the platform
4. Provide support and assistance

## Socket.IO Events

### Client → Server
- `join` - Emitted when user connects with their userId
- `chatMessage` - Emitted when sending a message

### Server → Client
- `chatMessage` - Received when a new message arrives

## Database Schema

### Messages Collection
```javascript
{
  _id: ObjectId,
  senderId: ObjectId (ref: User),
  senderName: String,
  receiverId: ObjectId (ref: User),
  message: String,
  timestamp: Date,
  isRead: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### Indexes
- Compound index on `(senderId, receiverId, timestamp)` for efficient message queries

## Future Enhancements

1. **Typing Indicators** - Show when the other person is typing
2. **Online Status** - Real-time online/offline status updates
3. **Message Notifications** - Browser push notifications for new messages
4. **File Sharing** - Upload and share images/documents
5. **Message Search** - Search through message history
6. **Emoji Support** - Add emoji picker
7. **Group Chat** - Support for multiple participants
8. **Voice Messages** - Record and send voice messages
9. **Message Reactions** - React to messages with emojis
10. **Seen Status** - Show when messages are seen

## Troubleshooting

### Common Issues

**Chat not loading:**
- Verify backend server is running on port 5000
- Check Socket.IO connection in browser console
- Ensure JWT token is valid

**Messages not sending:**
- Check network tab for API errors
- Verify user authentication
- Check backend logs for errors

**Real-time not working:**
- Ensure Socket.IO client is connected (check console)
- Verify CORS settings allow frontend origin
- Check firewall/network restrictions

### Debug Commands
```bash
# Backend logs
cd backend
npm run dev

# Check Socket.IO connection in browser console
socket.connected  // Should be true
```

## Security Considerations

1. **Authentication** - All endpoints require JWT authentication
2. **Authorization** - Users can only access their own conversations
3. **Message Validation** - Messages are sanitized and validated
4. **Rate Limiting** - Consider adding rate limiting for message sending
5. **XSS Prevention** - Messages should be sanitized before display

## Performance Considerations

1. **Message Pagination** - Consider implementing pagination for large message histories
2. **Socket Connection Pooling** - Efficient socket connection management
3. **Database Indexing** - Indexes on sender, receiver, and timestamp for fast queries
4. **Message Caching** - Consider caching recent messages in Redis

## Testing

### Manual Testing Steps
1. Create test user, worker, and admin accounts
2. Create booking with worker assignment
3. Login as user and verify worker appears in chat contacts
4. Send message from user to worker
5. Login as worker and verify message received
6. Reply from worker
7. Verify real-time message delivery
8. Test admin support chat

### Automated Testing (TODO)
- Unit tests for chat controller
- Integration tests for Socket.IO events
- E2E tests for chat interface
