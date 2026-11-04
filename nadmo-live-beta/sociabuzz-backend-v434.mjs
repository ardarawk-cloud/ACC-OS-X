/* NADMO LIVE v434 — official SociaBuzz TRIBE links only.
 * This is a reusable, fail-closed validator used by the production Worker patch.
 * Link inclusion does NOT imply that a payment was received or verified.
 */
function nadmoSociaBuzzUrl434(input){
 try{
  if(typeof input!=='string')return '';
  const raw=input.trim();
  if(!raw||raw.length>500)return '';
  const u=new URL(raw);
  if(u.protocol!=='https:')return '';
  if(!['sociabuzz.com','www.sociabuzz.com'].includes(u.hostname.toLowerCase()))return '';
  if(u.username||u.password||!u.pathname.split('/').filter(Boolean).length)return '';
  return u.href;
 }catch{return ''}
}
