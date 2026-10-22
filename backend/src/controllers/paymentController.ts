import {Request,Response} from 'express';
import mongoose from 'mongoose';
import Booking from '../models/Booking';
export async function updateBookingPayment(req:Request & {user?:any},res:Response){
 try{
  const id=String(req.params.id),status=req.body.paymentStatus;
  if(!mongoose.isValidObjectId(id)||!['paid','pending'].includes(status))return res.status(400).json({message:'Invalid payment update'});
  const current=await Booking.findById(id);
  if(!current)return res.status(404).json({message:'Booking not found'});
  if(status==='paid'&&current.status!=='completed')return res.status(400).json({message:'Complete the service before confirming cash payment'});
  if(current.paymentStatus===status)return res.json(current);
  const update=status==='paid'?{$set:{paymentStatus:status,paymentConfirmedBy:req.user._id,paymentConfirmedAt:new Date()}}:{$set:{paymentStatus:status},$unset:{paymentConfirmedBy:1,paymentConfirmedAt:1}};
  const booking=await Booking.findOneAndUpdate({_id:id,paymentStatus:current.paymentStatus,...(status==='paid'?{status:'completed'}:{})},update,{new:true});
  if(!booking)return res.status(409).json({message:'Booking changed. Refresh and try again.'});
  res.json(booking);
 }catch{res.status(500).json({message:'Payment could not be updated. Please try again.'});}
}
