import mongoose, { Document, Schema } from 'mongoose';

export interface IMessage extends Document {
  senderId: mongoose.Types.ObjectId;
  senderName: string;
  receiverId: mongoose.Types.ObjectId;
  message: string;
  timestamp: Date;
  isRead: boolean;
  editedAt?: Date;
  deletedAt?: Date;
  hiddenFor: mongoose.Types.ObjectId[];
}

const messageSchema = new Schema<IMessage>({
  senderId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  senderName: {
    type: String,
    required: true
  },
  receiverId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  editedAt: Date,
  deletedAt: Date,
  hiddenFor: [{type:Schema.Types.ObjectId,ref:"User"}],
  isRead: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

for (const format of ['toJSON','toObject'] as const) messageSchema.set(format, {transform: (_document, result) => {if(result.deletedAt)result.message='';delete (result as {hiddenFor?:unknown}).hiddenFor;return result;}});
// Index for faster queries
messageSchema.index({ senderId: 1, receiverId: 1, timestamp: -1 });

export default mongoose.model<IMessage>('Message', messageSchema);
