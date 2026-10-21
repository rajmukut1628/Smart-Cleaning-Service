import {Request,Response} from 'express';
import mongoose from 'mongoose';
import User from '../models/User';
import Message from '../models/Message';
import Booking from '../models/Booking';
type ChatRequest=Request & {user?:{id:string;name:string;role:string}};
const valid=(id:unknown)=>typeof id==='string'&&mongoose.isValidObjectId(id);
const pair=(userId:string,contactId:string)=>({$or:[{senderId:userId,receiverId:contactId},{senderId:contactId,receiverId:userId}]});
const emitChange=(req:ChatRequest,message:InstanceType<typeof Message>)=>req.app.get('io')?.to('user:'+message.senderId).to('user:'+message.receiverId).emit('messageUpdated',message.toObject());
export async function getContacts(req:ChatRequest,res:Response){try{
 const user=req.user!;let filter:Record<string,unknown>={_id:{$ne:user.id},role:{$ne:'blocked'}};
 if(!['admin','superadmin'].includes(user.role)){
 const bookings=await Booking.find(user.role==='user'?{user:user.id}:{$or:[{worker:user.id},{workers:user.id}]}).select('user worker workers').lean();
 const ids=bookings.flatMap(b=>user.role==='user'?[b.worker,...(b.workers||[])]:[b.user]).filter(Boolean);
 filter={_id:{$ne:user.id},role:{$ne:'blocked'},$or:[{role:{$in:['admin','superadmin']}},{_id:{$in:ids}}]};
 }
 const people=await User.find(filter).select('name role profilePicture').lean();const actor=new mongoose.Types.ObjectId(user.id);
 const summaries=await Message.aggregate([{$match:{$or:[{senderId:actor},{receiverId:actor}],hiddenFor:{$ne:actor}}},{$sort:{timestamp:-1,_id:-1}},{$group:{_id:{$cond:[{$eq:['$senderId',actor]},'$receiverId','$senderId']},last:{$first:'$$ROOT'},unread:{$sum:{$cond:[{$and:[{$eq:['$receiverId',actor]},{$eq:['$isRead',false]},{$not:[{$ifNull:['$deletedAt',false]}]}]},1,0]}}}}]);
 const byId=new Map(summaries.map(row=>[String(row._id),row]));const rooms=req.app.get('io')?.sockets.adapter.rooms;
 res.json(people.map(person=>{const summary=byId.get(String(person._id));return{_id:person._id,name:person.name,role:person.role,profilePicture:person.profilePicture,isOnline:Boolean(rooms?.get('user:'+person._id)?.size),unreadCount:summary?.unread||0,lastMessage:summary?(summary.last.deletedAt?'Message deleted':summary.last.message):undefined,lastMessageTime:summary?.last.timestamp};}).sort((a,b)=>new Date(b.lastMessageTime||0).getTime()-new Date(a.lastMessageTime||0).getTime()||a.name.localeCompare(b.name)));
 }catch{res.status(500).json({message:'Could not load contacts'});}}
export async function getMessages(req:ChatRequest,res:Response){try{
 const userId=req.user!.id,contactId=String(req.params.contactId),before=req.query.before;
 if(!valid(contactId)||(before!==undefined&&!valid(before)))return res.status(400).json({message:'Invalid conversation'});
 const query={...pair(userId,contactId),hiddenFor:{$ne:userId},...(before?{_id:{$lt:before}}:{})};
 const records=await Message.find(query).sort({_id:-1}).limit(51);const hasMore=records.length>50;const messages=records.slice(0,50).reverse();
 await Message.updateMany({senderId:contactId,receiverId:userId,isRead:false,hiddenFor:{$ne:userId}},{$set:{isRead:true}});
 req.app.get('io')?.to('user:'+contactId).emit('messagesRead',{readerId:userId});
 res.json({messages,hasMore,nextCursor:hasMore?messages[0]._id:null});
 }catch{res.status(500).json({message:'Could not load conversation'});}}
export async function sendMessage(req:ChatRequest,res:Response){try{
 const {receiverId,message}=req.body;const user=req.user!;
 if(!valid(receiverId)||receiverId===user.id||typeof message!=='string'||!message.trim()||message.trim().length>4000)return res.status(400).json({message:'Choose a recipient and enter 1–4000 characters'});
 const receiver=await User.findById(receiverId).select('role');if(!receiver||receiver.role==='blocked')return res.status(404).json({message:'Recipient unavailable'});
 const record=await Message.create({senderId:user.id,senderName:user.name,receiverId,message:message.trim(),isRead:false});
 req.app.get('io')?.to('user:'+receiverId).to('user:'+user.id).emit('chatMessage',record.toObject());res.status(201).json(record);
 }catch{res.status(500).json({message:'Message could not be sent'});}}
export async function editMessage(req:ChatRequest,res:Response){try{
 if(!valid(req.params.messageId)||typeof req.body.message!=='string'||!req.body.message.trim()||req.body.message.trim().length>4000)return res.status(400).json({message:'Enter 1–4000 characters'});
 const record=await Message.findOneAndUpdate({_id:req.params.messageId,senderId:req.user!.id,deletedAt:null,hiddenFor:{$ne:req.user!.id}},{$set:{message:req.body.message.trim(),editedAt:new Date()}},{new:true});
 if(!record)return res.status(404).json({message:'Editable message not found'});emitChange(req,record);res.json(record);
 }catch{res.status(500).json({message:'Message could not be edited'});}}
export async function deleteMessage(req:ChatRequest,res:Response){try{
 if(!valid(req.params.messageId))return res.status(400).json({message:'Invalid message'});
 const record=await Message.findOneAndUpdate({_id:req.params.messageId,senderId:req.user!.id,deletedAt:null,hiddenFor:{$ne:req.user!.id}},{$set:{deletedAt:new Date()}},{new:true});
 if(!record)return res.status(404).json({message:'Your message was not found'});emitChange(req,record);res.json(record);
 }catch{res.status(500).json({message:'Message could not be deleted'});}}
export async function hideMessage(req:ChatRequest,res:Response){try{
 const userId=req.user!.id,messageId=String(req.params.messageId);if(!valid(messageId))return res.status(400).json({message:'Invalid message'});
 const record=await Message.findOneAndUpdate({_id:messageId,$or:[{senderId:userId},{receiverId:userId}],hiddenFor:{$ne:userId}},{$addToSet:{hiddenFor:userId}},{new:true});
 if(!record)return res.status(404).json({message:'Message not found'});
 req.app.get('io')?.to('user:'+userId).emit('messageHidden',{messageId});res.json({messageId,message:'Message deleted for you'});
 }catch{res.status(500).json({message:'Message could not be deleted for you'});}}
export async function getUnreadCount(req:ChatRequest,res:Response){try{const unreadCount=await Message.countDocuments({receiverId:req.user!.id,isRead:false,hiddenFor:{$ne:req.user!.id},deletedAt:null});res.json({unreadCount});}catch{res.status(500).json({message:'Could not load unread count'});}}

export async function markConversationRead(req:ChatRequest,res:Response){try{const contactId=String(req.params.contactId),userId=req.user!.id;if(!valid(contactId))return res.status(400).json({message:'Invalid conversation'});await Message.updateMany({senderId:contactId,receiverId:userId,hiddenFor:{$ne:userId},isRead:false},{$set:{isRead:true}});req.app.get('io')?.to('user:'+contactId).emit('messagesRead',{readerId:userId});res.json({success:true});}catch{res.status(500).json({message:'Could not mark messages read'});}}
