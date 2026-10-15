// Authenticated, private R2 media transport for NADMO SOCIAL.
// Invoked only after accessOwnerVerified(); no public R2 URL, no external redirects.
export const MEDIA_BUCKET_BINDING = 'SOCIAL_MEDIA';
export const MAX_MEDIA_BYTES = 95 * 1024 * 1024;
export const MEDIA_PATH_RE = /^media\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp|mp4)$/;
const types = new Map([
  ['image/jpeg','jpg'],
  ['image/png','png'],
  ['image/webp','webp'],
  ['video/mp4','mp4']
]);
const reply = (payload,status=200)=>Response.json(payload,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export const privateMediaUrl = (origin,key)=>origin+'/api/social/media/'+key;
export const isOwnedMediaUrl = (url,origin)=>{
  try {
    const value=new URL(url);
    const base=new URL(origin);
    return value.origin===base.origin &&
      value.search==='' && value.hash==='' &&
      MEDIA_PATH_RE.test(decodeURIComponent(value.pathname.slice('/api/social/media/'.length))) &&
      value.pathname.startsWith('/api/social/media/');
  }catch{return false;}
};
export async function mediaExists(env,mediaUrl,origin){
  if(!isOwnedMediaUrl(mediaUrl,origin) || !env.SOCIAL_MEDIA)return false;
  const key=decodeURIComponent(new URL(mediaUrl).pathname.slice('/api/social/media/'.length));
  return !!(await env.SOCIAL_MEDIA.head(key));
}
export async function handleMedia(request,env,url){
  if(!env.SOCIAL_MEDIA)return reply({ok:false,error:{code:'MEDIA_NOT_CONFIGURED'}},503);
  if(request.method==='POST' && url.pathname==='/api/social/media'){
    const kind=request.headers.get('content-type')?.split(';')[0].trim().toLowerCase();
    const extension=types.get(kind);
    if(!extension)return reply({ok:false,error:{code:'UNSUPPORTED_MEDIA',message:'JPEG, PNG, WebP or MP4 required'}},415);
    const length=Number(request.headers.get('content-length'));
    if(!Number.isSafeInteger(length) || length<12 || length>MAX_MEDIA_BYTES)return reply({ok:false,error:{code:'SIZE_INVALID',message:'Send known Content-Length; media <= 95 MiB'}},413);
    if(!request.body)return reply({ok:false,error:{code:'EMPTY_BODY'}},400);
    const key='media/'+crypto.randomUUID()+'.'+extension;
    // Stream directly to private R2 to avoid buffering large videos.
    // The MIME is allowlisted and only authenticated users can read these objects.
    await env.SOCIAL_MEDIA.put(key,request.body,{httpMetadata:{contentType:kind,cacheControl:'private, no-store'},customMetadata:{source:'nadmo-social-chat',uploadedAt:new Date().toISOString()}});
    const obj=await env.SOCIAL_MEDIA.head(key);
    if(!obj || obj.size!==length){
      if(obj)await env.SOCIAL_MEDIA.delete(key);
      return reply({ok:false,error:{code:'UPLOAD_INCOMPLETE'}},500);
    }
    return reply({ok:true,media_key:key,media_url:privateMediaUrl(url.origin,key),size:obj.size,mime:kind,private:true},201);
  }
  const prefix='/api/social/media/';
  if(request.method==='GET' && url.pathname.startsWith(prefix)){
    const key=decodeURIComponent(url.pathname.slice(prefix.length));
    if(!MEDIA_PATH_RE.test(key))return reply({ok:false,error:{code:'BAD_MEDIA_KEY'}},404);
    const stored=await env.SOCIAL_MEDIA.get(key);
    if(!stored)return reply({ok:false,error:{code:'NOT_FOUND'}},404);
    const contentType=stored.httpMetadata?.contentType || 'application/octet-stream';
    if(!types.has(contentType))return reply({ok:false,error:{code:'MEDIA_TYPE_INVALID'}},415);
    return new Response(stored.body,{headers:{
      'Content-Type':contentType,
      'Content-Length':String(stored.size),
      'Cache-Control':'private, no-store',
      'X-Content-Type-Options':'nosniff',
      'Content-Disposition':'inline',
      'Vary':'Cookie'
    }});
  }
  return reply({ok:false,error:{code:'NOT_FOUND'}},404);
}
