import mongoose from 'mongoose';
export default mongoose.model('EmailChange',new mongoose.Schema({userId:{type:mongoose.Schema.Types.ObjectId,unique:true,required:true},oldEmail:String,newEmail:String,codeHash:String,passwordFingerprint:String,attempts:{type:Number,default:0},expiresAt:{type:Date,expires:0},sentAt:Date}));
