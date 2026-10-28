// ACC OS X external production package contract v1.
// Pure validation: no credentials, network requests, or automatic publishing.
// Intended for the existing v2578 publisher import boundary.
(function(root){
  "use strict";
  const MAX_CAPTION=12000, MAX_IMAGE_BYTES=12*1024*1024;
  function validate(input){
    if(!input||typeof input!=="object")throw Error("PACKAGE_REQUIRED");
    const channelId=String(input.channelId||"").trim();
    const caption=String(input.caption||"").trim();
    const mimeType=String(input.mimeType||"image/jpeg").trim().toLowerCase();
    const imageBase64=String(input.imageBase64||"").replace(/^data:image\/(?:jpeg|png|webp);base64,/i,"").trim();
    const sourceId=String(input.sourceId||"").trim();
    if(!/^ch-[a-z0-9-]{2,80}$/.test(channelId))throw Error("INVALID_CHANNEL");
    if(!caption||caption.length>MAX_CAPTION)throw Error("INVALID_CAPTION");
    if(!["image/jpeg","image/png","image/webp"].includes(mimeType))throw Error("INVALID_MIME");
    if(!imageBase64||!/^[A-Za-z0-9+/]+={0,2}$/.test(imageBase64)||imageBase64.length%4!==0)throw Error("INVALID_IMAGE");
    if(Math.floor(imageBase64.length*3/4)>MAX_IMAGE_BYTES)throw Error("IMAGE_TOO_LARGE");
    if(!/^[a-zA-Z0-9:_-]{8,160}$/.test(sourceId))throw Error("INVALID_SOURCE_ID");
    return Object.freeze({channelId,caption,mimeType,imageBase64,sourceId});
  }
  root.ACCExternalPackageV1=Object.freeze({validate});
})(typeof window!=="undefined"?window:globalThis);
