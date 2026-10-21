import { Request, Response } from 'express';
import ActivityLog from '../models/ActivityLog';
export async function getPlatformActivity(req:Request,res:Response) {
 const page=Number(req.query.page??1),role=String(req.query.role||'all'),search=String(req.query.search||'').trim().slice(0,80);
 if(!Number.isInteger(page)||page<1||page>100000||!['all','user','worker','admin','superadmin'].includes(role))return res.status(400).json({message:'Invalid activity filters'});
 try {
 const project=(action:string,category:string,actorField:string)=>({$project:{_id:{$concat:[category+'-',{$toString:'$_id'}]},actorId:actorField,action:{$literal:action},category:{$literal:category},entityId:{$toString:'$_id'},timestamp:'$createdAt'}});
 const pipeline:any[]=[{$match:{$or:[{actorId:{$exists:true}},{adminId:{$exists:true}}]}},{$project:{actorId:{$ifNull:['$actorId','$adminId']},actorName:1,actorRole:1,action:{$cond:[{$ifNull:['$category',false]},'$action','Administrative operation']},category:{$ifNull:['$category','administration']},entityId:1,timestamp:1,status:1}},
 {$unionWith:{coll:'users',pipeline:[{$match:{createdAt:{$type:'date'}}},project('Account registered','account','$_id')]}},
 {$unionWith:{coll:'bookings',pipeline:[{$lookup:{from:'services',localField:'service',foreignField:'_id',as:'serviceInfo'}},{$project:{...project('Booking placed','booking','$user').$project,serviceName:{$arrayElemAt:['$serviceInfo.name',0]},amount:'$totalAmount',scheduledDate:'$scheduledDate'}}]}},
 {$unionWith:{coll:'reviews',pipeline:[{$project:{...project('Review submitted','review','$user').$project,rating:'$rating'}}]}},
 {$lookup:{from:'users',localField:'actorId',foreignField:'_id',as:'actor'}},
 {$set:{actorName:{$ifNull:[{$arrayElemAt:['$actor.name',0]},{$ifNull:['$actorName','Deleted account']}]},actorRole:{$ifNull:[{$arrayElemAt:['$actor.role',0]},{$ifNull:['$actorRole','unknown']}]}}},
 {$project:{actor:0,actorId:0}}];
 if(role!=='all')pipeline.push({$match:{actorRole:role}});
 if(search){const escaped=search.split('').map(character=>'\\^$.*+?()[]{}|'.includes(character)?'\\'+character:character).join('');pipeline.push({$match:{$or:[{actorName:{$regex:escaped,$options:'i'}},{action:{$regex:escaped,$options:'i'}},{entityId:{$regex:escaped,$options:'i'}}]}});}
 pipeline.push({$sort:{timestamp:-1,_id:-1}},{$facet:{items:[{$skip:(page-1)*10},{$limit:10}],count:[{$count:'total'}]}});
 const [result]=await ActivityLog.aggregate(pipeline);const total=result?.count[0]?.total||0;
 res.json({items:result?.items||[],total,page,pages:Math.max(1,Math.ceil(total/10))});
 }catch{res.status(500).json({message:'Activity could not be loaded'});}
}
