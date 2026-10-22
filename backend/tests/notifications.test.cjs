require('./helpers/ownership.cjs');
const {test}=require('node:test');
const assert=require('node:assert/strict');
const http=require('node:http');
const express=require('express');
const jwt=require('jsonwebtoken');
const Booking=require('../dist/models/Booking').default;
const Review=require('../dist/models/Review').default;
const Read=require('../dist/models/NotificationRead').default;
const User=require('../dist/models/User').default;
const controller=require('../dist/controllers/workerNotificationController');
const response=()=>({code:200,body:null,status(code){this.code=code;return this;},json(body){this.body=body;return this;}});
const job={_id:'job-one',service:{name:'Office cleaning'},status:'confirmed',scheduledDate:'2026-10-23',scheduledTime:'10:00',address:'Example work area',workers:['worker-a'],createdAt:'2026-10-20',updatedAt:'2026-10-21'};
const chain=data=>({select(){return this;},populate(){return this;},sort(){return this;},limit(){return this;},lean:async()=>data});
test('notification IDs stay read across photo updates but change on status or schedule updates',()=>{
 const first=controller.buildWorkerNotifications([job],[])[0];
 assert.equal(first.id,controller.buildWorkerNotifications([{...job,updatedAt:'2026-10-22',beforeImages:['photo']}],[])[0].id);
 assert.notEqual(first.id,controller.buildWorkerNotifications([{...job,status:'cancelled'}],[])[0].id);
 assert.notEqual(first.id,controller.buildWorkerNotifications([{...job,scheduledTime:'15:00'}],[])[0].id);
 assert.equal(first.href,'/jobs?booking=job-one');
});
test('paid job notifications distinguish customer cash from worker payouts and reviews exclude personal details',()=>{
 const list=controller.buildWorkerNotifications([{...job,status:'completed',paymentStatus:'paid',paymentConfirmedAt:'2026-10-24'}],[{_id:'review-one',rating:5,comment:'private-to-test-text',user:{email:'secret@example.test'},createdAt:'2026-10-25',service:{name:'Office cleaning'}}]);
 assert.equal(list.length,3);assert.match(list.find(item=>item.type==='payment').message,/not a worker payout/);assert.equal(list[0].type,'review');assert.ok(!JSON.stringify(list).includes('secret@'));assert.ok(!JSON.stringify(list).includes('private-to-test-text'));
});
test('inbox ignores supplied account IDs and uses only authenticated jobs and read receipts',async()=>{
 const find=Booking.find,review=Review.find,read=Read.find;let jobQuery,reviewQuery,readQuery;
 Booking.find=query=>{jobQuery=query;return chain([job]);};Review.find=query=>{reviewQuery=query;return chain([]);};Read.find=query=>{readQuery=query;return chain([{notificationId:controller.buildWorkerNotifications([job],[])[0].id}]);};
 try{const res=response();await controller.getWorkerNotifications({user:{_id:'worker-a'},query:{workerId:'worker-b'}},res);assert.equal(res.code,200);assert.equal(res.body.unreadCount,0);assert.equal(res.body.notifications[0].read,true);assert.deepEqual(jobQuery,{$or:[{worker:'worker-a'},{workers:'worker-a'}]});assert.deepEqual(reviewQuery,{$or:[{worker:'worker-a'},{booking:{$in:['job-one']}}]});assert.equal(readQuery.recipient,'worker-a');}finally{Booking.find=find;Review.find=review;Read.find=read;}
});
test('mark-read rejects foreign IDs and writes only the authenticated recipient',async()=>{
 const find=Booking.find,review=Review.find,write=Read.bulkWrite;let writes;
 Booking.find=()=>chain([job]);Review.find=()=>chain([]);Read.bulkWrite=async operations=>{writes=operations;};
 try{let res=response();await controller.readWorkerNotifications({user:{_id:'worker-a'},body:{ids:['a'.repeat(64)]}},res);assert.equal(res.code,404);assert.equal(writes,undefined);res=response();const id=controller.buildWorkerNotifications([job],[])[0].id;await controller.readWorkerNotifications({user:{_id:'worker-a'},body:{ids:[id,id],recipient:'worker-b'}},res);assert.equal(res.code,200);assert.equal(writes.length,1);assert.deepEqual(writes[0].updateOne.filter,{recipient:'worker-a',notificationId:id});}finally{Booking.find=find;Review.find=review;Read.bulkWrite=write;}
});
test('notification read validation rejects invalid or excessive IDs',async()=>{
 for(const ids of ['all',['invalid'],Array(121).fill('a'.repeat(64))]){const res=response();await controller.readWorkerNotifications({body:{ids}},res);assert.equal(res.code,400);}
});
test('feedback links use own team bookings and omit customer contact details',async()=>{
 const find=Booking.find,review=Review.find;let ownQuery,reviewQuery;const populations=[];Booking.find=query=>{ownQuery=query;return chain([{_id:'own-team-job'}]);};Review.find=query=>{reviewQuery=query;const result=chain([{_id:'review',rating:5,comment:'Good cleaning'}]);result.populate=(...args)=>{populations.push(args);return result;};return result;};
 try{const res=response();await controller.getWorkerFeedback({user:{_id:'worker-a'},query:{workerId:'worker-b'}},res);assert.equal(res.body.averageRating,5);assert.deepEqual(ownQuery,{$or:[{worker:'worker-a'},{workers:'worker-a'}]});assert.deepEqual(reviewQuery,{$or:[{worker:'worker-a'},{booking:{$in:['own-team-job']}}]});assert.deepEqual(populations,[['user','name'],['service','name']]);}finally{Booking.find=find;Review.find=review;}
});
test('worker inbox routes reject unauthenticated and non-worker accounts',async()=>{
 const app=express();app.use(express.json());app.use('/api/worker',require('../dist/routes/workerRoutes').default);const server=http.createServer(app);await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const find=User.findById;const old=process.env.JWT_SECRET;process.env.JWT_SECRET='notification-test-secret';User.findById=()=>({select:async()=>({_id:'customer',role:'user'})});
 const request=(path,token)=>new Promise((resolve,reject)=>{const req=http.get({host:'127.0.0.1',port:server.address().port,path,headers:token?{authorization:'Bearer '+token}:{}},res=>{res.resume();res.on('end',()=>resolve(res.statusCode));});req.on('error',reject);});
 try{assert.equal(await request('/api/worker/notifications'),401);assert.equal(await request('/api/worker/notifications',jwt.sign({id:'customer'},process.env.JWT_SECRET)),403);}finally{User.findById=find;if(old===undefined)delete process.env.JWT_SECRET;else process.env.JWT_SECRET=old;await new Promise(resolve=>server.close(resolve));}
});
