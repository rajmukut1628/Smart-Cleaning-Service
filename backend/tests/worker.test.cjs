const {test}=require('node:test');
const assert=require('node:assert/strict');
const Booking=require('../dist/models/Booking').default;
const User=require('../dist/models/User').default;
const worker=require('../dist/controllers/workerController');
const response=()=>({code:200,body:null,status(code){this.code=code;return this;},json(body){this.body=body;return this;}});
test('worker jobs, earnings and customer dashboard query only the authenticated account',async()=>{
 const find=Booking.find;const bookings=require('../dist/controllers/bookingController');const queries=[];
 Booking.find=query=>{queries.push(query);const chain={populate(){return this;},sort:async()=>[],then(resolve){return Promise.resolve([]).then(resolve);}};return chain;};
 try{await worker.getAssignedBookings({user:{_id:'worker-a'}},response());await worker.getWorkerEarnings({user:{_id:'worker-b'}},response());await bookings.getUserBookings({user:{_id:'customer-a'}},response());assert.deepEqual(queries[0],{$or:[{worker:'worker-a'},{workers:'worker-a'}]});assert.deepEqual(queries[1],{$or:[{worker:'worker-b'},{workers:'worker-b'}],status:'completed'});assert.deepEqual(queries[2],{user:'customer-a'});}finally{Booking.find=find;}
});
test('earnings distinguish confirmed customer cash and preserve completion month in Bangladesh',async()=>{
 const find=Booking.find;Booking.find=async()=>[
  {_id:'paid',worker:'a',workers:['a','b','b'],totalAmount:1200,paymentStatus:'paid',completedAt:new Date('2026-09-30T20:00:00Z'),updatedAt:new Date('2026-11-01')},
  {_id:'unpaid',worker:'a',totalAmount:300,paymentStatus:'pending',updatedAt:new Date('2026-09-10')}
 ];
 try{const res=response();await worker.getWorkerEarnings({user:{_id:'a'}},res);assert.equal(res.code,200);assert.equal(res.body.totalEarnings,900);assert.equal(res.body.paidEarnings,600);assert.equal(res.body.pendingEarnings,300);assert.equal(res.body.monthlyEarnings['2026-10'],600);assert.equal(res.body.monthlyEarnings['2026-09'],300);assert.equal(res.body.entries[0].teamSize,2);assert.equal(res.body.entries[0].estimatedDate,false);assert.equal(res.body.entries[1].estimatedDate,true);}finally{Booking.find=find;}
});
test('profile rejects invalid availability, skills and experience before writing',async()=>{
 for(const body of [{availability:{monday:{start:'17:00',end:'09:00'}}},{availability:{monday:{start:'09:00',end:''}}},{availability:{monday:{start:'25:00',end:'26:00'}}},{availability:{unknown:{start:'09:00',end:'17:00'}}},{experience:-1},{experience:'3'},{skills:['valid',{}]},{name:' '}]){const res=response();await worker.updateWorkerProfile({user:{_id:'worker'},body},res);assert.equal(res.code,400,JSON.stringify(body));}
});
test('worker can save hours and clear location without changing protected fields',async()=>{
 const update=User.findByIdAndUpdate;let captured;User.findByIdAndUpdate=(id,body)=>{captured={id,body};return{select:async()=>({_id:id,...body})};};
 try{const res=response();await worker.updateWorkerProfile({user:{_id:'worker-a'},body:{address:'',availability:{monday:{start:'09:00',end:'17:00'},sunday:{start:'',end:''}},role:'superadmin',isVerified:true}},res);assert.equal(res.code,200);assert.equal(captured.id,'worker-a');assert.equal(captured.body.address,'');assert.equal(captured.body.availability.sunday.start,'');assert.equal(captured.body.role,undefined);assert.equal(captured.body.isVerified,undefined);}finally{User.findByIdAndUpdate=update;}
});
test('worker password rejects short credentials before account lookup',async()=>{const res=response();await worker.changeWorkerPassword({body:{currentPassword:'test-current',newPassword:'short'}},res);assert.equal(res.code,400);});
test('booking save lifecycle retains its first completion date',async()=>{
 const job=new Booking({user:'507f1f77bcf86cd799439011',service:'507f1f77bcf86cd799439012',address:'Test service area',squareFootage:100,scheduledDate:new Date(),scheduledTime:'10:00',totalAmount:500,status:'completed'});
 const beforeSave=()=>new Promise((resolve,reject)=>Booking.schema.s.hooks.execPre('save',job,[{}],error=>error?reject(error):resolve()));
 await beforeSave();assert.ok(job.completedAt instanceof Date);const first=job.completedAt.getTime();job.paymentStatus='paid';await beforeSave();assert.equal(job.completedAt.getTime(),first);
});
