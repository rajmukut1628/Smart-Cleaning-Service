import { Request, Response, NextFunction } from 'express';
import ActivityLog from '../models/ActivityLog';
// Explicit allowlist: no chat, request bodies, credentials, or personal profile values.
export function describeActivity(method:string,path:string) {
 const rules:[string,RegExp,string,string][]=[
 ['POST',/^\/api\/services\/custom$/,'Custom service created','service'],
 ['PUT',/^\/api\/services\/custom\/[^/]+$/,'Custom service updated','service'],
 ['DELETE',/^\/api\/services\/custom\/[^/]+$/,'Custom service removed','service'],
 ['PUT',/^\/api\/admin\/settings$/,'Platform preferences updated','administration'],
 ['PUT',/^\/api\/admin\/admins\/[^/]+$/,'Administrator account updated','account'],
 ['DELETE',/^\/api\/admin\/admins\/[^/]+$/,'Administrator account removed','account'],
 ['PUT',/^\/api\/worker\/bookings\/[^/]+\/status$/,'Job status updated','booking'],
 ['PUT',/^\/api\/admin\/bookings\/[^/]+\/assign$/,'Worker assignment updated','booking'],
 ['PUT',/^\/api\/admin\/bookings\/[^/]+\/payment$/,'Cash payment confirmation updated','payment'],
 ['PUT',/^\/api\/admin\/workers\/[^/]+\/verify$/,'Worker verification updated','account'],
 ['PUT',/^\/api\/admin\/users\/[^/]+\/role$/,'Account role updated','account'],
 ['POST',/^\/api\/bookings\/[^/]+\/(before|after)-images$/,'Job photos uploaded','booking'],
 ['PUT',/^\/api\/reviews\/[^/]+$/,'Review updated','review'],
 ['DELETE',/^\/api\/reviews\/[^/]+$/,'Review removed','review'],
 ['PUT',/^\/api\/(profile|worker\/profile)(\/picture)?$/,'Profile updated','account'],
 ['POST',/^\/api\/services$/,'Service published','service'],
 ['PUT',/^\/api\/services\/[^/]+$/,'Service updated','service'],
 ['DELETE',/^\/api\/services\/[^/]+$/,'Service removed','service'],
 ['DELETE',/^\/api\/admin\/users\/[^/]+$/,'Account removed','account'],
 ['PUT',/^\/api\/admin\/bookings\/bulk-(update|cancel)$/,'Bookings updated in bulk','booking'],
 ['PUT',/^\/api\/admin\/users\/bulk-block$/,'Accounts blocked in bulk','account'],
 ['DELETE',/^\/api\/admin\/users\/bulk-delete$/,'Accounts removed in bulk','account'],
 ];
 const rule=rules.find(([verb,pattern])=>verb===method&&pattern.test(path.replace(/\/$/,'')));
 return rule?{action:rule[2],category:rule[3]}:null;
}
export function platformActivity(req:Request,res:Response,next:NextFunction) {
 const event=describeActivity(req.method,req.path); if(!event)return next();
 const path=req.path; let status:string|undefined;
 const json=res.json.bind(res); res.json=((body:unknown)=>{const value=body as {status?:unknown};if(value&&typeof value.status==='string'&&['pending','confirmed','in-progress','completed','cancelled'].includes(value.status))status=value.status;return json(body);}) as typeof res.json;
 res.on('finish',()=>{const actor=(req as Request & {user?:{_id:unknown;name?:string;role?:string}}).user;if(res.statusCode>=400||!actor)return;
 const entityId=path.split('/').find(part=>/^[a-f0-9]{24}$/i.test(part));
 ActivityLog.create({...event,actorId:actor._id,actorName:actor.name,actorRole:actor.role,entityId,status}).catch(()=>console.error('Activity recording failed'));
 });next();
}
