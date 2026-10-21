import mongoose from 'mongoose';
export default mongoose.model('ActivityLog', new mongoose.Schema({
 adminId: {type:mongoose.Schema.Types.ObjectId,ref:'User'},
 actorId: {type:mongoose.Schema.Types.ObjectId,ref:'User'}, actorName:String, actorRole:String,
 action:{type:String,required:true}, category:String, entityId:String,
 details:String, status:String,
 timestamp:{type:Date,default:Date.now,index:true}
}));
