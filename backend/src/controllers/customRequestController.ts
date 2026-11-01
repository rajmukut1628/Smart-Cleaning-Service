import { Request, Response } from 'express';
import mongoose from 'mongoose';
import CustomRequest from '../models/CustomCleaningRequest';
import Service from '../models/Service';
import Booking from '../models/Booking';
import { validFutureSchedule, bookingSnapshots } from '../services/bookingRules';
import { isUploadedImage } from '../utils/imageStorage';
interface ActorRequest extends Request { user?: any }
const staff = (req: ActorRequest) => ['admin','superadmin'].includes(req.user?.role);
const validId = (req: Request) => mongoose.isValidObjectId(req.params.id);
const text = (value: unknown, min: number, max: number): value is string => typeof value === 'string' && value.trim().length >= min && value.length <= max;
const fail = (res: Response, error: any) => res.status(error.status || (error.name === 'VersionError' ? 409 : 500)).json({ message: error.status ? error.message : error.name === 'VersionError' ? 'This request changed. Refresh and try again.' : 'Custom request could not be processed.' });

export async function listCustomRequests(req: ActorRequest, res: Response) {
  if (!staff(req) && req.user?.role !== 'user') return res.status(403).json({message:'Not authorized for custom requests'});
  const page = Math.min(100000, Math.max(1, Math.floor(Number(req.query.page)) || 1)), status = req.query.status;
  const filter: any = staff(req) ? {} : { customer: req.user._id };
  if (typeof status === 'string' && ['pending','quoted','booked','declined','rejected','withdrawn'].includes(status)) filter.status = status;
  if(req.query.request!==undefined){if(typeof req.query.request!=='string'||!mongoose.isValidObjectId(req.query.request))return res.status(400).json({message:'Invalid request reference'});filter._id=req.query.request;}
  try { const [items,total] = await Promise.all([CustomRequest.find(filter).populate('customer','name email phone').sort({updatedAt:-1}).skip((page-1)*10).limit(10), CustomRequest.countDocuments(filter)]); res.json({items,total,pages:Math.max(1,Math.ceil(total/10))}); } catch(error) { fail(res,error); }
}
export async function createCustomRequest(req: ActorRequest, res: Response) {
  if (req.user?.role !== 'user') return res.status(403).json({message:'Only customers can submit cleaning requests'});
  const {title,description,address,preferredDate,preferredTime,images=[]} = req.body;
  if (!text(title,3,100)||!text(description,10,3000)||!text(address,5,500)||!validFutureSchedule(preferredDate,preferredTime)||!Array.isArray(images)||images.length>5||images.some(image=>!isUploadedImage(image))) return res.status(400).json({message:'Provide your cleaning requirements, address, future schedule and up to five uploaded images.'});
  try {
    if (await CustomRequest.countDocuments({customer:req.user._id,status:{$in:['pending','quoted']}})>=10) return res.status(429).json({message:'You can have up to ten open custom requests.'});
    const row=await CustomRequest.create({customer:req.user._id,title:title.trim(),description:description.trim(),address:address.trim(),preferredDate,preferredTime,images}); res.status(201).json(row);
  }catch(error){fail(res,error);}
}
export async function quoteCustomRequest(req: ActorRequest,res:Response){
  if(!staff(req))return res.status(403).json({message:'Only administrators can issue quotes'});
  if(!validId(req))return res.status(400).json({message:'Invalid request reference'});
  const {amount,duration,notes='',version}=req.body;
  if(typeof amount!=='number'||!Number.isFinite(amount)||amount<=0||amount>10000000||typeof duration!=='number'||!Number.isFinite(duration)||duration<.25||duration>24||!text(notes,0,2000)||!Number.isInteger(version)||version<0)return res.status(400).json({message:'Provide a valid total price, duration (0.25–24 hours) and current request version.'});
  try{const row=await CustomRequest.findOneAndUpdate({_id:req.params.id,status:{$in:['pending','quoted']},version},{$set:{status:'quoted',quote:{amount,duration,notes:notes.trim(),quotedBy:req.user._id,quotedAt:new Date()}},$inc:{version:1}},{new:true,runValidators:true});if(!row)return res.status(409).json({message:'This request is unavailable or changed. Refresh before quoting.'});res.json(row);}catch(error){fail(res,error);}
}
export async function decideCustomRequest(req:ActorRequest,res:Response){
  if(!validId(req))return res.status(400).json({message:'Invalid request reference'});
  const {action,version,note=''}=req.body;
  if(!Number.isInteger(version)||version<0||!text(note,0,1000))return res.status(400).json({message:'Invalid decision or request version'});
  const status=staff(req)&&action==='reject'?'rejected':req.user?.role==='user'&&action==='decline'?'declined':req.user?.role==='user'&&action==='withdraw'?'withdrawn':null;
  if(!status)return res.status(403).json({message:'This decision is not available to your role'});
  try{const row=await CustomRequest.findOneAndUpdate({_id:req.params.id,...(!staff(req)?{customer:req.user._id}:{}),status:{$in:status==='declined'?['quoted']:['pending','quoted']},version},{$set:{status,decisionNote:note.trim()},$inc:{version:1}},{new:true});if(!row)return res.status(409).json({message:'This request is unavailable or changed. Refresh and try again.'});res.json(row);}catch(error){fail(res,error);}
}
export async function acceptCustomQuote(req:ActorRequest,res:Response){
  if(req.user?.role!=='user')return res.status(403).json({message:'Only the customer can accept a quote'});
  if(!validId(req))return res.status(400).json({message:'Invalid request reference'});
  const {version,scheduledDate,scheduledTime}=req.body;
  if(!Number.isInteger(version)||!validFutureSchedule(scheduledDate,scheduledTime))return res.status(400).json({message:'Choose a future schedule and accept the current quote.'});
  const session=await mongoose.startSession();let bookingId:unknown;
  try{await session.withTransaction(async()=>{
    const row=await CustomRequest.findOne({_id:req.params.id,customer:req.user._id}).session(session);
    if(!row)throw Object.assign(Error('Request not found'),{status:404});
    if(row.status==='booked'&&row.booking){bookingId=row.booking;return;}
    if(row.status!=='quoted'||row.version!==version||!row.quote?.amount||!row.quote.duration)throw Object.assign(Error('The quote changed or is no longer available. Refresh and review it again.'),{status:409});
    const [service]=await Service.create([{name:row.title,category:'Custom cleaning',description:row.description,basePrice:row.quote.amount,pricePerSqFt:0,pricePerUnit:0,duration:row.quote.duration,image:row.images[0]||'',isCustom:true,createdBy:req.user._id}],{session});
    const [booking]=await Booking.create([{...bookingSnapshots(service,req.user,1,'unit'),user:req.user._id,service:service._id,customRequest:row._id,address:row.address,squareFootage:1,units:1,unitType:'unit',scheduledDate,scheduledTime,specialInstructions:row.description,totalAmount:row.quote.amount}],{session});
    row.status='booked';row.booking=booking._id;row.version+=1;await row.save({session});bookingId=booking._id;
  });res.status(201).json({bookingId,message:'Quote accepted. Your booking is awaiting team assignment.'});}catch(error){fail(res,error);}finally{await session.endSession();}
}
