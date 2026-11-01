const fs=require('node:fs');const path=require('node:path');const {before,after}=require('node:test');
before(()=>{fs.mkdirSync('uploads',{recursive:true});for(const name of ['scs-unit-before.png','scs-unit-after.png'])fs.writeFileSync(path.join('uploads',name),'test image evidence');});
after(()=>{for(const name of ['scs-unit-before.png','scs-unit-after.png'])fs.rmSync(path.join('uploads',name),{force:true});});
const {test}=require('node:test');const assert=require('node:assert/strict');
const {workPhotoRequirement}=require('../dist/services/workPhotos');
const {transitionAllowed}=require('../dist/services/bookingTransitions');
const Booking=require('../dist/models/Booking').default;const {updateBookingStatusByWorker}=require('../dist/controllers/workerController');
const response=()=>({code:200,status(code){this.code=code;return this},json(body){this.body=body;return this}});
test('work needs uploaded before evidence to start and both photo types to finish',()=>{
 assert.ok(workPhotoRequirement({},'in-progress'));assert.ok(workPhotoRequirement({beforeImages:['not-an-image']},'in-progress'));assert.equal(workPhotoRequirement({beforeImages:['/uploads/scs-unit-before.png']},'in-progress'),null);
 assert.ok(workPhotoRequirement({beforeImages:['/uploads/scs-unit-before.png']},'completed'));assert.ok(workPhotoRequirement({afterImages:['/uploads/scs-unit-after.png']},'completed'));assert.equal(workPhotoRequirement({beforeImages:['/uploads/scs-unit-before.png'],afterImages:['/uploads/scs-unit-after.png']},'completed'),null);
 assert.equal(transitionAllowed({status:'in-progress',workers:['worker'],beforeImages:[],afterImages:[]},'completed'),false);
});
test('direct worker API rejects missing photos without saving; valid completion leaves cash pending',async()=>{
 const original=Booking.findById;let saved=0;let booking={worker:'worker',workers:['worker'],status:'confirmed',beforeImages:[],afterImages:[],paymentStatus:'pending',save:async function(){saved++;return this}};Booking.findById=async()=>booking;
 try{let res=response();await updateBookingStatusByWorker({user:{_id:'worker'},params:{id:'job'},body:{status:'in-progress'}},res);assert.equal(res.code,409);assert.equal(saved,0);booking.beforeImages=['/uploads/scs-unit-before.png'];res=response();await updateBookingStatusByWorker({user:{_id:'worker'},params:{id:'job'},body:{status:'in-progress'}},res);assert.equal(res.code,200);res=response();await updateBookingStatusByWorker({user:{_id:'worker'},params:{id:'job'},body:{status:'completed'}},res);assert.equal(res.code,409);booking.afterImages=['/uploads/scs-unit-after.png'];res=response();await updateBookingStatusByWorker({user:{_id:'worker'},params:{id:'job'},body:{status:'completed'}},res);assert.equal(res.code,200);assert.equal(booking.paymentStatus,'pending');}finally{Booking.findById=original;}
});

test('valid-looking nonexistent photos cannot satisfy storage evidence',async()=>{
 const {verifiedWorkPhotoRequirement}=require('../dist/services/workPhotos');
 assert.ok(await verifiedWorkPhotoRequirement({beforeImages:['/uploads/nonexistent-scs-unit-before.png'],afterImages:['/uploads/nonexistent-scs-unit-after.png']},'completed'));
 assert.equal(await verifiedWorkPhotoRequirement({beforeImages:['/uploads/scs-unit-before.png'],afterImages:['/uploads/scs-unit-after.png']},'completed'),null);
});
