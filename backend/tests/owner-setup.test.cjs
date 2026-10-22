const {test}=require('node:test');const assert=require('node:assert/strict');const mongoose=require('mongoose');const bcrypt=require('bcryptjs');
const User=require('../dist/models/User').default;const Ownership=require('../dist/models/PlatformOwnership').default;const {provisionRequestedOwner}=require('../dist/security/provisionRequestedOwner');
const input={email:'rajmukut66@gmail.com',password:'test-only-password',phone:'01324013773'};
async function mocked(run){const restores=[];const mock=(object,key,value)=>{const old=object[key];object[key]=value;restores.push(()=>object[key]=old);};try{await run(mock);}finally{restores.reverse().forEach(f=>f());}}
const query=value=>({session:async()=>value});
const tx=()=>({withTransaction:async fn=>fn(),endSession:async()=>{}});
test('owner setup validates the explicitly authorized target and phone before connecting',async()=>{
 await assert.rejects(()=>provisionRequestedOwner({...input,email:'other@example.com'}),/restricted/);await assert.rejects(()=>provisionRequestedOwner({...input,phone:'01324013'}),/full Bangladesh/);
});
test('restarting setup never resets an already transferred owner password',()=>mocked(async mock=>{
 mock(mongoose,'startSession',async()=>tx());mock(Ownership,'findById',()=>query({ownerId:'new-owner'}));mock(User,'findOne',()=>query({_id:'new-owner',email:input.email}));mock(User,'updateOne',async()=>{throw Error('must not reset password');});
 const result=await provisionRequestedOwner(input);assert.equal(result.status,'already-owner');
}));
test('setup refuses to replace a different current owner and makes no account writes',()=>mocked(async mock=>{
 mock(mongoose,'startSession',async()=>tx());mock(Ownership,'findById',()=>query({ownerId:'someone-else'}));mock(User,'findOne',()=>query(null));mock(User,'findById',()=>query({email:'different@example.com'}));mock(User,'create',async()=>{throw Error('must not create account');});
 await assert.rejects(()=>provisionRequestedOwner(input),/differs from the expected/);
}));
test('owner setup atomically creates requested account, transfers canonical ownership and demotes old owner',()=>mocked(async mock=>{
 const session=tx();let created,ownershipWrite,demotion;
 mock(mongoose,'startSession',async()=>session);mock(Ownership,'findById',()=>query({ownerId:'old-owner',revision:4,revokedAdminIds:[]}));mock(User,'findOne',()=>query(null));mock(User,'findById',()=>query({_id:'old-owner',email:'platformauthority@gmail.com'}));
 mock(User,'create',async(data,options)=>{assert.equal(options.session,session);created=data[0];return [{...created,_id:'new-owner'}];});
 mock(Ownership,'updateOne',async(filter,update,options)=>{assert.equal(options.session,session);assert.equal(filter.revision,4);ownershipWrite=update;return {modifiedCount:1};});
 mock(User,'updateMany',async(filter,update,options)=>{assert.equal(options.session,session);assert.equal(filter._id.$ne,'new-owner');demotion=update;});
 const result=await provisionRequestedOwner(input);assert.equal(result.status,'transferred');assert.equal(created.email,input.email);assert.equal(created.role,'superadmin');assert.ok(await bcrypt.compare(input.password,created.password));assert.equal(ownershipWrite.$set.ownerId,'new-owner');assert.equal(ownershipWrite.$inc.sessionEpoch,1);assert.equal(demotion.$set.role,'admin');assert.equal(demotion.$inc.sessionVersion,1);
}));
test('setup refuses Google-only or blocked target accounts instead of silently changing sign-in methods',()=>mocked(async mock=>{
 mock(mongoose,'startSession',async()=>tx());mock(Ownership,'findById',()=>query({ownerId:'old-owner',revision:1,revokedAdminIds:[]}));mock(User,'findById',()=>query({email:'platformauthority@gmail.com'}));
 for(const target of [{_id:'target',authProvider:'google',role:'user'},{_id:'target',authProvider:'local',role:'blocked'}]){mock(User,'findOne',()=>query(target));await assert.rejects(()=>provisionRequestedOwner(input),/manual review/);}
}));
