require('./helpers/ownership.cjs');
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../dist/models/User').default;
const Booking = require('../dist/models/Booking').default;
const Service = require('../dist/models/Service').default;
const auth = require('../dist/controllers/authController');
const worker = require('../dist/controllers/workerController');
const bookingController = require('../dist/controllers/bookingController');
const admin = require('../dist/controllers/adminController');
process.env.JWT_SECRET = 'test-only-secret-not-used-outside-this-process';
const response = () => ({ code: 200, body: null, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } });

test('review gallery rejects invalid paging and rating before querying', async () => {
  const { getReviewGallery } = require('../dist/controllers/reviewGalleryController');
  for (const query of [{page:0},{page:1.5},{limit:1000},{rating:6},{rating:'bad'},{sort:'arbitrary'}]) {
    const res=response(); await getReviewGallery({query},res);assert.equal(res.code,400);
  }
});
test('review gallery paginates beyond ten reviews while retaining overall rating totals', async () => {
  const {getReviewGallery}=require('../dist/controllers/reviewGalleryController');
  const Review=require('../dist/models/Review').default;
  const aggregate=Review.aggregate;let pipeline;
  Review.aggregate=async stages=>{pipeline=stages;return [{reviews:[{_id:'review-13'},{_id:'review-14'}],matching:[{total:14}],summary:[{total:20,averageRating:4.7}],distribution:[{_id:5,count:14},{_id:4,count:6}]}];};
  try{const res=response();await getReviewGallery({query:{page:3,limit:6,rating:5,sort:'highest'}},res);assert.equal(res.body.pages,3);assert.equal(res.body.total,20);assert.equal(res.body.filteredTotal,14);assert.equal(res.body.averageRating,4.7);assert.equal(res.body.reviews.length,2);assert.equal(res.body.distribution[5],14);const facet=pipeline.find(stage=>stage.$facet).$facet;assert.ok(facet.reviews.some(stage=>stage.$skip===12));assert.ok(facet.reviews.some(stage=>stage.$match?.rating===5));assert.ok(!facet.summary.some(stage=>stage.$match));}finally{Review.aggregate=aggregate;}
});
test('review gallery handles an empty database without invalid page counts',async()=>{
  const {getReviewGallery}=require('../dist/controllers/reviewGalleryController');const Review=require('../dist/models/Review').default;const aggregate=Review.aggregate;Review.aggregate=async()=>[{reviews:[],matching:[],summary:[],distribution:[]}];
  try{const res=response();await getReviewGallery({query:{}},res);assert.equal(res.body.total,0);assert.equal(res.body.pages,1);assert.equal(res.body.averageRating,0);assert.deepEqual(res.body.reviews,[]);}finally{Review.aggregate=aggregate;}
});

test('local Vite origins include localhost and numeric loopback on fallback ports', () => {
  const { getAllowedOrigins } = require('../dist/config/origins');
  const previous = process.env.FRONTEND_ORIGIN;
  try {
    delete process.env.FRONTEND_ORIGIN;
    for (const port of [5173, 5174, 5175]) {
      assert.ok(getAllowedOrigins().includes(`http://localhost:${port}`));
      assert.ok(getAllowedOrigins().includes(`http://127.0.0.1:${port}`));
    }
    process.env.FRONTEND_ORIGIN = ' https://clean.example , https://admin.example ';
    assert.deepEqual(getAllowedOrigins(), ['https://clean.example', 'https://admin.example']);
  } finally {
    if (previous === undefined) delete process.env.FRONTEND_ORIGIN;
    else process.env.FRONTEND_ORIGIN = previous;
  }
});

test('new registrations reject malformed email addresses', async () => {
  const res=response();await auth.registerUser({body:{name:'Test',email:'test@@example.com',phone:'01000000000',password:'test-password'}},res);assert.equal(res.code,400);
});
test('registration rejects weak credentials before querying the database', async () => {
  const res = response(); await auth.registerUser({body:{name:'Test',email:'bad-email',phone:'01',password:'123'}},res); assert.equal(res.code,400);
});
test('blocked users cannot log in', async () => {
  const find = User.findOne; User.findOne = async () => ({role:'blocked'});
  try {const res=response();await auth.loginUser({body:{email:'blocked@example.com',password:'test'}},res);assert.equal(res.code,401);}finally{User.findOne=find;}
});
test('earnings split a booking amount across unique team members', async () => {
  const find = Booking.find; Booking.find = async () => [{ worker:'a',workers:['a','b'],totalAmount:1200,updatedAt:new Date('2026-10-21') }];
  try {const res=response(); await worker.getWorkerEarnings({user:{_id:'a'}},res);assert.equal(res.body.totalEarnings,600);assert.equal(res.body.monthlyEarnings['2026-10'],600);} finally{Booking.find=find;}
});
test('secondary assigned workers can upload after photos', async () => {
  const find=Booking.findById;let saved=false;Booking.findById=async()=>({user:'customer',worker:'a',workers:['a','b'],save:async()=>{saved=true;}});
  try{const res=response();await bookingController.uploadAfterImages({params:{id:'booking'},body:{images:['/uploads/example.png']},user:{_id:'b',role:'worker'}},res);assert.equal(res.code,200);assert.ok(saved);}finally{Booking.findById=find;}
});
test('workers cannot complete cancelled jobs',async()=>{
 const find=Booking.findById;Booking.findById=async()=>({worker:'a',workers:['a'],status:'cancelled'});
 try{const res=response();await worker.updateBookingStatusByWorker({params:{id:'job'},body:{status:'completed'},user:{_id:'a'}},res);assert.equal(res.code,400);}finally{Booking.findById=find;}
});
test('invalid preference values are rejected',async()=>{const res=response();await admin.updateAdminSettings({user:{_id:'admin'},body:{itemsPerPage:999}},res);assert.equal(res.code,400);});
test('socket connections require a valid token and reject blocked users',async()=>{
 const {authenticateSocket}=require('../dist/realtime');
 const socket={handshake:{auth:{}},data:{}};let error;
 await authenticateSocket(socket,e=>{error=e;});assert.ok(error);
 const find=User.findById;User.findById=()=>({select:async()=>({id:'test-user',role:'blocked'})});
 try{socket.handshake.auth.token=jwt.sign({id:'test-user'},process.env.JWT_SECRET);await authenticateSocket(socket,e=>{error=e;});assert.ok(error);User.findById=()=>({select:async()=>({id:'test-user',role:'user'})});await authenticateSocket(socket,e=>{error=e;});assert.equal(error,undefined);assert.equal(socket.data.userId,'test-user');}finally{User.findById=find;}
});
test('assignment detects overlapping durations, not only matching start times',async()=>{
 const bf=Booking.findById, uf=User.find, sf=Service.findById, find=Booking.find;
 Booking.findById=async()=>({service:'service',scheduledDate:new Date('2026-10-21'),scheduledTime:'10:00'});
 User.find=async()=>[{_id:'a',name:'Worker'}];Service.findById=async()=>({duration:2});
 Booking.find=()=>({populate:async()=>[{scheduledDate:new Date('2026-10-21'),scheduledTime:'11:00',service:{duration:2}}]});
 try{const res=response();await admin.assignWorkerToBooking({params:{id:'booking'},body:{workerIds:['a']}},res);assert.equal(res.code,409);}finally{Booking.findById=bf;User.find=uf;Service.findById=sf;Booking.find=find;}
});

const app=express();app.use(express.json());
app.use('/api/upload',require('../dist/routes/uploadRoutes').default);
app.use('/api/services',require('../dist/routes/serviceRoutes').default);
app.use('/api/admin',require('../dist/routes/adminRoutes').default);
app.use('/api/chat',require('../dist/routes/chatRoutes').default);
const server=app.listen(0,'127.0.0.1');
const ready=new Promise(resolve=>server.on('listening',resolve));
after(()=>new Promise(resolve=>server.close(resolve)));
async function request(path,method='POST',body={},token) {await ready;return fetch('http://127.0.0.1:'+server.address().port+path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(body)});}
test('uploads and service seeding reject unauthenticated requests',async()=>{assert.equal((await request('/api/upload')).status,401);assert.equal((await request('/api/services/seed')).status,401);});
test('customers cannot confirm payment or create administrators',async()=>{
 const find=User.findById;User.findById=()=>({select:async()=>({_id:'customer',role:'user'})});const token=jwt.sign({id:'customer'},process.env.JWT_SECRET);
 try{assert.equal((await request('/api/admin/bookings/1/payment','PUT',{paymentStatus:'paid'},token)).status,403);assert.equal((await request('/api/admin/admins','POST',{},token)).status,403);}finally{User.findById=find;}
});
test('cash confirmation is allowed only after job completion',async()=>{
 const uf=User.findById,bf=Booking.findById;User.findById=()=>({select:async()=>({_id:'admin',role:'admin'})});const token=jwt.sign({id:'admin'},process.env.JWT_SECRET);let status='confirmed',saved=false;
 Booking.findById=async()=>({status,save:async()=>{saved=true;}});
 try{assert.equal((await request('/api/admin/bookings/1/payment','PUT',{paymentStatus:'paid'},token)).status,400);status='completed';assert.equal((await request('/api/admin/bookings/1/payment','PUT',{paymentStatus:'paid'},token)).status,200);assert.ok(saved);}finally{User.findById=uf;Booking.findById=bf;}
});


test('managed worker creation preserves role and never returns credentials', async () => {
 const {createManagedAccount}=require('../dist/controllers/managedAccountController');
 const find=User.findOne,create=User.create;let captured;
 User.findOne=async()=>null;User.create=async data=>{captured=data;return {...data,_id:'managed-worker'};};
 try {const res=response();await createManagedAccount({body:{name:' Worker ',email:' WORKER@EXAMPLE.COM ',phone:'01000000000',password:'test-only-password',role:'worker'}},res);assert.equal(res.code,201);assert.equal(captured.role,'worker');assert.equal(captured.email,'worker@example.com');assert.notEqual(captured.password,'test-only-password');assert.equal(res.body.password,undefined);assert.equal(res.body.token,undefined);}finally{User.findOne=find;User.create=create;}
});
test('managed account creation rejects privileged roles and weak passwords', async()=>{
 const {createManagedAccount}=require('../dist/controllers/managedAccountController');
 for(const change of [{role:'superadmin'},{role:'admin'},{password:'123'}]){const res=response();await createManagedAccount({body:{name:'Test',email:'test@example.com',phone:'01000000000',password:'test-only-password',role:'user',...change}},res);assert.equal(res.code,400);}
});


test('platform activity excludes private routes and recognizes worker operations',()=>{
 const {describeActivity}=require('../dist/middleware/platformActivity');
 for(const path of ['/api/chat','/api/chat/messages','/api/profile/password','/api/worker/change-password','/api/auth/login'])assert.equal(describeActivity('POST',path),null);
 assert.equal(describeActivity('PUT','/api/worker/bookings/abc/status').category,'booking');
 assert.equal(describeActivity('GET','/api/profile'),null);
});
test('platform activity validates filters and projects safe historical records',async()=>{
 const {getPlatformActivity}=require('../dist/controllers/platformActivityController');
 const Log=require('../dist/models/ActivityLog').default; const original=Log.aggregate;let stages;
 Log.aggregate=async pipeline=>{stages=pipeline;return [{items:[],count:[{total:23}]}];};
 try{let res=response();await getPlatformActivity({query:{page:0}},res);assert.equal(res.code,400);
 res=response();await getPlatformActivity({query:{page:2,role:'worker',search:'.*'}},res);assert.equal(res.body.pages,3);assert.equal(res.body.total,23);assert.equal(stages.at(-1).$facet.items[0].$skip,10);assert.equal(stages.filter(s=>s.$unionWith).length,3);const regex=stages.find(s=>s.$match?.$or?.[0]?.actorName).$match.$or[0].actorName.$regex;assert.equal(new RegExp(regex).test('plain name'),false);assert.equal(new RegExp(regex).test('.*'),true);assert.ok(!JSON.stringify(stages).includes('password'));assert.ok(!JSON.stringify(stages).includes('comment'));}finally{Log.aggregate=original;}
});

test('activity recording stores only safe event fields and ignores unsuccessful operations',async()=>{
 const {platformActivity}=require('../dist/middleware/platformActivity');const Log=require('../dist/models/ActivityLog').default;const original=Log.create;let recorded=[];Log.create=async value=>{recorded.push(value);};
 try{for(const code of [200,403]){let finish;const req={method:'PUT',path:'/api/worker/bookings/507f1f77bcf86cd799439011/status',body:{password:'private',message:'secret'},user:{_id:'actor',name:'Worker',role:'worker'}};const res={statusCode:code,json:()=>res,on:(name,handler)=>{finish=handler;}};platformActivity(req,res,()=>{});res.json({status:'completed',privateValue:'hidden'});finish();}assert.equal(recorded.length,1);assert.equal(recorded[0].status,'completed');assert.equal(recorded[0].entityId,'507f1f77bcf86cd799439011');assert.ok(!JSON.stringify(recorded).includes('secret'));assert.ok(!JSON.stringify(recorded).includes('private'));}finally{Log.create=original;}
});


test('chat edit and delete always require sender ownership and reject hidden or removed messages',async()=>{
 const chat=require('../dist/controllers/chatController');const Message=require('../dist/models/Message').default;const original=Message.findOneAndUpdate;const queries=[];Message.findOneAndUpdate=async query=>{queries.push(query);return null;};
 try{for(const handler of [chat.editMessage,chat.deleteMessage]){const res=response();await handler({user:{id:'507f1f77bcf86cd799439011'},params:{messageId:'507f1f77bcf86cd799439012'},body:{message:'Edited text'}},res);assert.equal(res.code,404);}for(const query of queries){assert.equal(query.senderId,'507f1f77bcf86cd799439011');assert.equal(query.deletedAt,null);assert.equal(query.hiddenFor.$ne,'507f1f77bcf86cd799439011');}}finally{Message.findOneAndUpdate=original;}
});
test('delete for me hides exactly one message for an authenticated participant',async()=>{
 const {hideMessage}=require('../dist/controllers/chatController');const Message=require('../dist/models/Message').default;const original=Message.findOneAndUpdate;let query,update,room;Message.findOneAndUpdate=async(q,u)=>{query=q;update=u;return {_id:'507f1f77bcf86cd799439012'};};
 try{const res=response();await hideMessage({user:{id:'actor'},params:{messageId:'507f1f77bcf86cd799439012'},app:{get:()=>({to:value=>{room=value;return{emit:()=>{}};}})}},res);assert.equal(res.code,200);assert.equal(query._id,'507f1f77bcf86cd799439012');assert.deepEqual(query.$or,[{senderId:'actor'},{receiverId:'actor'}]);assert.deepEqual(update,{$addToSet:{hiddenFor:'actor'}});assert.equal(room,'user:actor');Message.findOneAndUpdate=async()=>null;const denied=response();await hideMessage({user:{id:'outsider'},params:{messageId:'507f1f77bcf86cd799439012'}},denied);assert.equal(denied.code,404);}finally{Message.findOneAndUpdate=original;}
});
test('deleted message serialization hides original content and personal visibility fields',()=>{
 const Message=require('../dist/models/Message').default;const document=new Message({senderId:'507f1f77bcf86cd799439011',receiverId:'507f1f77bcf86cd799439012',senderName:'Sender',message:'private original',deletedAt:new Date(),hiddenFor:['507f1f77bcf86cd799439011']});for(const value of [document.toJSON(),document.toObject()]){assert.equal(value.message,'');assert.equal(value.hiddenFor,undefined);}
});
test('chat pagination is participant-scoped and excludes personally cleared messages',async()=>{
 const {getMessages}=require('../dist/controllers/chatController');const Message=require('../dist/models/Message').default;const find=Message.find,update=Message.updateMany;let query,limit;Message.find=q=>{query=q;return{sort:()=>({limit:async count=>{limit=count;return Array.from({length:51},(_,index)=>({_id:'message-'+index}));}})};};Message.updateMany=async()=>{};
 try{const res=response();await getMessages({user:{id:'507f1f77bcf86cd799439011'},params:{contactId:'507f1f77bcf86cd799439012'},query:{},app:{get:()=>undefined}},res);assert.equal(limit,51);assert.equal(res.body.messages.length,50);assert.equal(res.body.hasMore,true);assert.equal(query.hiddenFor.$ne,'507f1f77bcf86cd799439011');assert.equal(query.$or[0].senderId,'507f1f77bcf86cd799439011');}finally{Message.find=find;Message.updateMany=update;}
});


test('analytics validates reporting periods and uses rolling date boundaries',()=>{
 const {analyticsWindow}=require('../dist/controllers/analyticsController');const now=new Date('2026-10-21T12:00:00Z');assert.equal(analyticsWindow('invalid',now),null);assert.equal(analyticsWindow('all',now).start,null);assert.equal(now-analyticsWindow('30',now).start,30*86400000);
});
test('analytics uses completed paid payments and retains empty months without invented revenue',async()=>{
 const {getAnalytics}=require('../dist/controllers/analyticsController');const aggregate=Booking.aggregate,users=User.aggregate;let stages;
 Booking.aggregate=async pipeline=>{stages=pipeline;return[{summary:[{total:2,completed:0,outstanding:0}],revenue:[],trend:[],statuses:[{_id:'pending',count:2}],services:[{id:'deleted',name:'Unavailable service',bookings:2,completed:0}],receipts:[]}];};User.aggregate=async()=>[{_id:'user',count:1},{_id:'worker',count:1,verified:1}];
 try{const res=response();await getAnalytics({query:{range:'all'}},res);assert.equal(res.code,200);assert.equal(res.body.revenue,0);assert.equal(res.body.bookings,2);assert.equal(res.body.customers,1);assert.equal(res.body.workers,1);assert.equal(res.body.trend.length,12);assert.ok(res.body.trend.every(row=>row.revenue===0));const facets=stages.find(s=>s.$facet).$facet;assert.equal(facets.revenue[0].$match.status,'completed');assert.equal(facets.revenue[0].$match.paymentStatus,'paid');assert.equal(res.body.services[0].bookings,2);assert.ok(JSON.stringify(stages).includes('$paymentConfirmedAt'));}finally{Booking.aggregate=aggregate;User.aggregate=users;}
});
test('dashboard monthly revenue follows confirmation date and excludes unpaid jobs',async()=>{
 const find=Booking.find,aggregate=Booking.aggregate,users=User.find;Booking.find=async()=>[{status:'completed',paymentStatus:'paid',totalAmount:700,scheduledDate:new Date('2025-12-01'),paymentConfirmedAt:new Date('2026-02-01')},{status:'completed',paymentStatus:'pending',totalAmount:900,scheduledDate:new Date('2026-01-01')}];Booking.aggregate=async()=>[];User.find=async()=>[];
 try{const res=response();await admin.getAdminStats({},res);assert.equal(res.body.totalRevenue,700);assert.deepEqual(res.body.monthlyRevenue,[{month:'2026 Feb',revenue:700}]);}finally{Booking.find=find;Booking.aggregate=aggregate;User.find=users;}
});


test('protected worker creation route accepts admin requests and returns the saved worker',async()=>{
 const findId=User.findById,findOne=User.findOne,create=User.create;let saved;
 User.findById=()=>({select:async()=>({_id:'admin',role:'admin'})});User.findOne=async()=>null;User.create=async data=>{saved=data;return {...data,_id:'created-worker',createdAt:new Date()};};const token=jwt.sign({id:'admin'},process.env.JWT_SECRET);
 try{const response=await request('/api/admin/users','POST',{name:'Worker Preview',email:'WORKER@EXAMPLE.TEST',phone:'01000000000',password:'test-only-password',role:'worker'},token);assert.equal(response.status,201);const body=await response.json();assert.equal(body.role,'worker');assert.equal(body.email,'worker@example.test');assert.equal(body.password,undefined);assert.ok(await require('bcryptjs').compare('test-only-password',saved.password));const invalid=await request('/api/admin/users','POST',{},token);assert.equal(invalid.status,400);}finally{User.findById=findId;User.findOne=findOne;User.create=create;}
});
test('worker creation rejects unauthenticated callers and customer accounts',async()=>{
 assert.equal((await request('/api/admin/users','POST',{})).status,401);const find=User.findById;User.findById=()=>({select:async()=>({_id:'customer',role:'user'})});try{assert.equal((await request('/api/admin/users','POST',{},jwt.sign({id:'customer'},process.env.JWT_SECRET))).status,403);}finally{User.findById=find;}
});

test('chat no longer exposes whole-history or whole-conversation deletion routes',async()=>{
 const find=User.findById;User.findById=()=>({select:async()=>({_id:'customer',role:'user'})});const token=jwt.sign({id:'customer'},process.env.JWT_SECRET);
 try{assert.equal((await request('/api/chat/history','DELETE',{},token)).status,404);assert.equal((await request('/api/chat/conversations/507f1f77bcf86cd799439012','DELETE',{},token)).status,404);}finally{User.findById=find;}
});

