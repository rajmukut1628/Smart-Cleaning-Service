const {beforeEach,afterEach}=require('node:test');const CustomRequest=require('../dist/models/CustomCleaningRequest').default;const customFind=CustomRequest.find;
beforeEach(()=>{CustomRequest.find=()=>({sort(){return this},limit(){return this},lean:async()=>[]});});afterEach(()=>{CustomRequest.find=customFind;});
require('./helpers/ownership.cjs');
const {test}=require('node:test');
const assert=require('node:assert/strict');
const express=require('express');
const http=require('node:http');
const jwt=require('jsonwebtoken');
const Booking=require('../dist/models/Booking').default;
const Read=require('../dist/models/NotificationRead').default;
const User=require('../dist/models/User').default;
const controller=require('../dist/controllers/customerNotificationController');
const auth=require('../dist/controllers/authController');
const response=()=>({code:200,body:null,status(code){this.code=code;return this;},json(body){this.body=body;return this;}});
const chain=data=>({select(){return this;},populate(){return this;},sort(){return this;},limit(){return this;},lean:async()=>data});
const booking={_id:'own-booking',service:{name:'Office cleaning'},worker:'assigned-worker',workers:['assigned-worker'],status:'confirmed',scheduledDate:'2026-10-23',scheduledTime:'10:00',address:'Example service area',createdAt:'2026-10-20',updatedAt:'2026-10-21'};
test('existing customer password accounts still receive a token from a separate sign-in',async()=>{
 const find=User.findOne,secret=process.env.JWT_SECRET;process.env.JWT_SECRET='isolated-registration-test';
 try{const password=await require('bcryptjs').hash('test-password',10);User.findOne=async()=>({_id:'test-customer',role:'user',email:'test@example.test',password});const logged=response();await auth.loginUser({body:{email:'test@example.test',password:'test-password'}},logged);assert.equal(logged.code,200);assert.equal(jwt.verify(logged.body.token,process.env.JWT_SECRET).id,'test-customer');}finally{User.findOne=find;if(secret===undefined)delete process.env.JWT_SECRET;else process.env.JWT_SECRET=secret;}
});

test('customer notifications have stable read keys and changes create new updates',()=>{
 const first=controller.buildCustomerNotifications([booking])[0];assert.equal(first.href,'/user-dashboard?booking=own-booking');assert.equal(first.id,controller.buildCustomerNotifications([{...booking,updatedAt:'2026-10-25',beforeImages:['photo']}])[0].id);assert.notEqual(first.id,controller.buildCustomerNotifications([{...booking,status:'cancelled'}])[0].id);assert.notEqual(first.id,controller.buildCustomerNotifications([{...booking,scheduledTime:'12:00'}])[0].id);assert.notEqual(first.id,controller.buildCustomerNotifications([{...booking,workers:['new-worker']}])[0].id);
});
test('completed customer bookings expose payment confirmation and an eligible review link',()=>{
 const items=controller.buildCustomerNotifications([{...booking,status:'completed',paymentStatus:'paid',paymentConfirmedAt:'2026-10-24'}]);assert.equal(items.length,3);assert.equal(items.find(item=>item.type==='review').href,'/user-dashboard?review=own-booking');assert.match(items.find(item=>item.type==='payment').title,/cash payment/);assert.equal(controller.buildCustomerNotifications([{...booking,status:'completed',isReviewed:true}]).length,1);assert.equal(controller.buildCustomerNotifications([{...booking,status:'completed',worker:undefined}]).length,1);
});
test('customer inbox and read receipts are scoped to the authenticated account',async()=>{
 const find=Booking.find,read=Read.find;let ownQuery,readQuery;const id=controller.buildCustomerNotifications([booking])[0].id;Booking.find=query=>{ownQuery=query;return chain([booking]);};Read.find=query=>{readQuery=query;return chain([{notificationId:id}]);};
 try{const res=response();await controller.getCustomerNotifications({user:{_id:'customer-a'},query:{userId:'customer-b'}},res);assert.equal(res.code,200);assert.deepEqual(ownQuery,{user:'customer-a'});assert.equal(readQuery.recipient,'customer-a');assert.equal(res.body.unreadCount,0);assert.equal(res.body.notifications[0].read,true);}finally{Booking.find=find;Read.find=read;}
});
test('customer cannot mark another inbox notification read',async()=>{
 const find=Booking.find,write=Read.bulkWrite;let operations;Booking.find=()=>chain([booking]);Read.bulkWrite=async value=>{operations=value;};
 try{let res=response();await controller.readCustomerNotifications({user:{_id:'customer-a'},body:{ids:['f'.repeat(64)]}},res);assert.equal(res.code,404);assert.equal(operations,undefined);res=response();const id=controller.buildCustomerNotifications([booking])[0].id;await controller.readCustomerNotifications({user:{_id:'customer-a'},body:{ids:[id],recipient:'customer-b'}},res);assert.equal(res.code,200);assert.deepEqual(operations[0].updateOne.filter,{recipient:'customer-a',notificationId:id});}finally{Booking.find=find;Read.bulkWrite=write;}
});
test('customer notification routes enforce login, role and account boundaries',async()=>{
 const app=express();app.use(express.json());app.use('/api/bookings',require('../dist/routes/bookingRoutes').default);const server=http.createServer(app);await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const userFind=User.findById,find=Booking.find,read=Read.find,secret=process.env.JWT_SECRET;let ownQuery;process.env.JWT_SECRET='isolated-customer-notification-test';User.findById=id=>({select:async()=>({_id:id,role:id==='worker'?'worker':'user'})});Booking.find=query=>{ownQuery=query;return chain([]);};Read.find=()=>chain([]);
 const request=token=>new Promise((resolve,reject)=>{const req=http.get({host:'127.0.0.1',port:server.address().port,path:'/api/bookings/notifications?userId=other-customer',headers:token?{authorization:'Bearer '+token}:{}},res=>{res.resume();res.on('end',()=>resolve(res.statusCode));});req.on('error',reject);});
 try{assert.equal(await request(),401);assert.equal(await request(jwt.sign({id:'worker'},process.env.JWT_SECRET)),403);assert.equal(await request(jwt.sign({id:'customer-a'},process.env.JWT_SECRET)),200);assert.deepEqual(ownQuery,{user:'customer-a'});}finally{User.findById=userFind;Booking.find=find;Read.find=read;if(secret===undefined)delete process.env.JWT_SECRET;else process.env.JWT_SECRET=secret;await new Promise(resolve=>server.close(resolve));}
});

test('custom quote notifications link to the request and change identity for revised quotes',()=>{
 const row={_id:'quote-a',title:'Home cleaning',status:'quoted',version:1,quote:{quotedAt:'2026-11-01'}};
 const [first]=controller.buildCustomRequestNotifications([row]);assert.equal(first.href,'/custom-requests?request=quote-a');assert.equal(first.type,'custom-request');
 assert.notEqual(first.id,controller.buildCustomRequestNotifications([{...row,version:2}])[0].id);
 assert.deepEqual(controller.buildCustomRequestNotifications([{...row,status:'booked'}]),[]);
});
