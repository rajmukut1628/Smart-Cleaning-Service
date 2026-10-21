import {Request,Response} from 'express';
import Booking from '../models/Booking';
import User from '../models/User';
export function analyticsWindow(range:string,now=new Date()){
 if(!['all','30','90','365'].includes(range))return null;
 const start=range==='all'?null:new Date(now.getTime()-Number(range)*86400000);
 const chartStart=start||new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth()-11,1)-21600000);
 return {start,chartStart};
}
export async function getAnalytics(req:Request,res:Response){
 const range=String(req.query.range||'all'),now=new Date(),window=analyticsWindow(range,now);
 if(!window)return res.status(400).json({message:'Choose a supported reporting period'});
 const period=(field:string)=>window.start?{[field]:{$gte:window.start,$lte:now}}:{};
 const paid={status:'completed',paymentStatus:'paid',...period('receiptAt')};const booked=period('bookedAt');
 try{
 const [results,accounts]=await Promise.all([Booking.aggregate([
 {$set:{bookedAt:{$ifNull:['$createdAt','$scheduledDate']},receiptAt:{$ifNull:['$paymentConfirmedAt','$scheduledDate']}}},
 {$facet:{
 summary:[{$match:booked},{$group:{_id:null,total:{$sum:1},completed:{$sum:{$cond:[{$eq:['$status','completed']},1,0]}},cancelled:{$sum:{$cond:[{$eq:['$status','cancelled']},1,0]}},outstanding:{$sum:{$cond:[{$and:[{$eq:['$status','completed']},{$ne:['$paymentStatus','paid']}]},'$totalAmount',0]}}}}],
 revenue:[{$match:paid},{$group:{_id:null,total:{$sum:'$totalAmount'},count:{$sum:1},legacy:{$sum:{$cond:[{$ifNull:['$paymentConfirmedAt',false]},0,1]}}}}],
 statuses:[{$match:booked},{$group:{_id:'$status',count:{$sum:1}}}],
 trend:[{$match:{...paid,receiptAt:{$gte:window.chartStart,$lte:now}}},{$group:{_id:{$dateToString:{format:'%Y-%m',date:'$receiptAt',timezone:'Asia/Dhaka'}},revenue:{$sum:'$totalAmount'},payments:{$sum:1}}},{$sort:{_id:1}}],
 services:[{$match:booked},{$group:{_id:'$service',bookings:{$sum:1},completed:{$sum:{$cond:[{$eq:['$status','completed']},1,0]}}}},{$lookup:{from:'services',localField:'_id',foreignField:'_id',as:'service'}},{$project:{_id:0,id:{$toString:'$_id'},name:{$ifNull:[{$arrayElemAt:['$service.name',0]},'Unavailable service']},bookings:1,completed:1}},{$sort:{bookings:-1,name:1}}],
 receipts:[{$match:paid},{$sort:{receiptAt:-1,_id:-1}},{$limit:8},{$lookup:{from:'services',localField:'service',foreignField:'_id',as:'service'}},{$project:{_id:0,id:{$toString:'$_id'},service:{$ifNull:[{$arrayElemAt:['$service.name',0]},'Unavailable service']},amount:'$totalAmount',date:'$receiptAt',estimatedDate:{$not:[{$ifNull:['$paymentConfirmedAt',false]}]}}}]
 }}]),User.aggregate([{$group:{_id:'$role',count:{$sum:1},verified:{$sum:{$cond:['$isVerified',1,0]}}}}])]);
 const result=results[0]||{},summary=result.summary?.[0]||{},revenue=result.revenue?.[0]||{};
 const monthKey=(date:Date)=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Dhaka',year:'numeric',month:'2-digit'}).format(date).replace('/','-');
 const firstParts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Dhaka',year:'numeric',month:'2-digit'}).formatToParts(window.chartStart);const year=Number(firstParts.find(p=>p.type==='year')?.value),month=Number(firstParts.find(p=>p.type==='month')?.value)-1;
 const endKey=monthKey(now);const trend=[];for(let offset=0;offset<14;offset++){const date=new Date(Date.UTC(year,month+offset,15)),key=date.toISOString().slice(0,7);if(key>endKey)break;const row=result.trend?.find((r:{_id:string})=>r._id===key);trend.push({month:key,label:date.toLocaleDateString('en',{month:'short',year:'2-digit',timeZone:'UTC'}),revenue:row?.revenue||0,payments:row?.payments||0});}
 const count=(role:string)=>accounts.find(row=>row._id===role)?.count||0;
 res.json({range,generatedAt:now.toISOString(),revenue:revenue.total||0,paidBookings:revenue.count||0,legacyPayments:revenue.legacy||0,bookings:summary.total||0,completed:summary.completed||0,cancelled:summary.cancelled||0,outstanding:summary.outstanding||0,customers:count('user'),workers:count('worker'),verifiedWorkers:accounts.find(row=>row._id==='worker')?.verified||0,statuses:(result.statuses||[]).map((row:{_id:string;count:number})=>({status:row._id,count:row.count})),trend,services:result.services||[],receipts:result.receipts||[]});
 }catch{res.status(500).json({message:'Analytics could not be loaded'});}
}
