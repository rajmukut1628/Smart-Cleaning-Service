import mongoose from 'mongoose';
export default mongoose.model('OperationalError',new mongoose.Schema({requestId:{type:String,index:true},source:{type:String,enum:['server','client']},route:String,method:String,status:Number,category:String,actorRole:String,at:{type:Date,default:Date.now,index:true,expires:30*86400}}));
