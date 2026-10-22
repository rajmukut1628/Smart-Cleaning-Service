import {AsyncLocalStorage} from 'node:async_hooks';
import {Request,Response,NextFunction} from 'express';
export const requestContext=new AsyncLocalStorage<Request & {user?:any}>();
export const withRequestContext=(req:Request,_res:Response,next:NextFunction)=>requestContext.run(req,()=>next());
export function bookingEvent(kind:string,label:string){const actor=requestContext.getStore()?.user;return {kind,label,at:new Date(),actorId:actor?._id,actorName:actor?.name,actorRole:actor?.role};}
