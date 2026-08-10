// ACC OS X PRODUCTION AI — QUALITY HARDENING v1.6.7 PHONE COMPACT
// AI quality/orchestration only. Real publishing stays in the external frozen Publish Connector.
const TEXT_MODEL = "@cf/meta/llama-3.1-8b-instruct-fast"; const RESEARCH_MODEL = "@cf/zai-org/glm-4.7-flash";
const IMAGE_MODEL = "@cf/black-forest-labs/flux-1-schnell"; const cors = { "Access-Control-Allow-Origin": "*",
"Access-Control-Allow-Methods": "GET,POST,OPTIONS", "Access-Control-Allow-Headers": "Content-Type,X-ACC-Access-Code",
"Cache-Control": "no-store", }; function json(data,status=200){ return new Response(JSON.stringify(data,null,2),{ status,
headers:{...cors,"Content-Type":"application/json;charset=UTF-8"}, }); } function text(v){ return typeof v === "string" ? v.trim() : ""; }
function publicError(detail,fallbackCode="AI_ERROR"){ const d=detail&&typeof detail==="object"?detail:{message:String(detail||"")};
const code=text(d.code)||fallbackCode; const message=text(d.message)||"Unknown ACC AI error."; return { error:`${code}: ${message}`,
errorDetail:d, }; } function requireAccess(request,env){ const supplied=(request.headers.get("X-ACC-Access-Code")||"").trim();
if(!supplied)return json({ok:false,...publicError({code:"ACCESS_CODE_REQUIRED",message:"ACC AI access code required."})},401);
const expected=String(env.ACC_AI_ACCESS_CODE||env.ACC_ACCESS_CODE||"").trim(); if(expected&&supplied!==expected){
return json({ok:false,...publicError({code:"ACCESS_DENIED",message:"Invalid ACC AI access code."})},403); } return null; }
function trimContext(value,max=18000){ try{ const raw=JSON.stringify(value??{});
return raw.length>max ? raw.slice(0,max)+"…[TRUNCATED]" : raw; }catch{return "{}";} } function isResearchRequest(body){
const joined=(Array.isArray(body?.messages)?body.messages:[]).map(m=>text(m?.content)).join("\n");
return /(?:^|\n)STAGE:\s*RESEARCH\b/i.test(joined) || /Research Specialist/i.test(joined); } function isQcRequest(body){
const joined=(Array.isArray(body?.messages)?body.messages:[]).map(m=>text(m?.content)).join("\n");
return /(?:^|\n)STAGE:\s*QC\b/i.test(joined) || /Editorial QC Auditor/i.test(joined); } function detectStage(body){
const joined=(Array.isArray(body?.messages)?body.messages:[]).map(m=>text(m?.content)).join("\n");
const m=joined.match(/(?:^|\n)STAGE:\s*(RESEARCH|SCRIPT|POSTER|CAPTION|QC|PUBLISHING)\b/i); return m?String(m[1]||"").toUpperCase():""; }
function latestUpstreamByStage(context,stage,predicate){ const rows=Array.isArray(context?.upstreamAssets)?context.upstreamAssets:[];
const test=typeof predicate==="function"?predicate:()=>true;
return rows.find(item=>String(item?.stage||"").toUpperCase()===stage && test(item))||null; } function qcPreflight(context){
const research=latestUpstreamByStage(context,"RESEARCH"); const script=latestUpstreamByStage(context,"SCRIPT");
const posterMedia=latestUpstreamByStage(context,"POSTER",item=>Boolean(item?.hasMedia));
const posterDirection=latestUpstreamByStage(context,"POSTER",item=>!Boolean(item?.hasMedia)&&Boolean(text(item?.output)));
const caption=latestUpstreamByStage(context,"CAPTION"); const researchText=text(research?.output); const scriptText=text(script?.output);
const posterDirectionText=text(posterDirection?.output); const captionText=text(caption?.output); const researchUrls=[...new Set(urlsInText(researchText))];
const researchTopic=extractResearchTopic(researchText); const posterTopic=extractPosterTopic(posterDirectionText); const checks={ researchExists:Boolean(researchText),
researchGrounded:/^\s*RESEARCH_PASS\b/i.test(researchText) && researchUrls.length>=2,
publicTopicFirewall:Boolean(researchTopic) && !containsInternalTopicLeak(researchTopic), materialExists:Boolean(scriptText),
headlineExists:/\bPUBLIC_HEADLINE\s*:/i.test(scriptText), materialNoInternalLeak:!containsInternalTopicLeak(scriptText),
posterExists:Boolean(posterMedia), posterDirectionExists:Boolean(posterDirectionText),
posterTopicAligned:Boolean(posterTopic)&&normTopic(posterTopic)===normTopic(researchTopic),
posterBasisExists:/\bPRIMARY VISUAL BASIS\s*:/i.test(posterDirectionText), captionExists:Boolean(captionText), captionClean:Boolean(captionText) &&
!/^\s*(?:Caption Output|Generated Caption|Result)\s*:/i.test(captionText) && !/```/.test(captionText),
captionNoInternalLeak:!containsInternalTopicLeak(captionText), };
const failed=Object.entries(checks).filter(([,ok])=>!ok).map(([name])=>name); return { ok:failed.length===0, failed, checks,
researchSourceCount:researchUrls.length, researchTopic, posterTopic }; } async function runQcAligned(env,body){ const context=body?.context||{};
const preflight=qcPreflight(context); if(!preflight.ok){ return { reply:[ "FAIL",
`QC deterministic preflight failed: ${preflight.failed.join(", ")}.`, `Research URLs: ${preflight.researchSourceCount}.` ].join("\n"),
model:"ACC_DETERMINISTIC_QC_PREFLIGHT", provider:"ACC OS X QC Gate",
qc:{preflight:preflight.checks,researchSourceCount:preflight.researchSourceCount} }; }
const incoming=Array.isArray(body?.messages)?body.messages:[];
const taskText=incoming.map(m=>text(m?.content)).filter(Boolean).join("\n\n").slice(0,10000); const result=await env.AI.run(TEXT_MODEL,{
messages:[ {role:"system",content:[ "You are ACC OS X Editorial QC Auditor.",
"A deterministic server preflight has already verified that upstream Research begins with RESEARCH_PASS and contains at least two real source URLs.",
"Do NOT fail the package merely because it lacks academic studies, industry reports, or expert interviews.",
"For ordinary technology/news content, official company/organization sources and reputable journalism are acceptable when Research has already passed grounding.",
"Do not re-litigate source existence unless upstream Research contradicts itself or clearly does not support the selected topic.",
"Audit: one-topic consistency, material usefulness, PUBLIC_HEADLINE relevance, poster media/direction, caption naturalness, channel identity, no downstream fabricated claims, and no internal/debug text.",
"Evidence-strength rule: an attributed concern/opinion may appear as an attributed concern/opinion, but material must not convert it into a verified consequence, prediction, causal claim, or industry-wide outcome unless VERIFIED_FACTS supports that claim.",
"The deterministic server preflight has already verified that POSTER PUBLIC TOPIC exactly matches Research TOPIC and that PRIMARY VISUAL BASIS exists.",
"Treat the deterministic POSTER direction as the authority for visual-topic alignment. Never invent, reconstruct, or assume a different VISUAL_FACTS requirement than the poster direction supplied in context.",
"Do not fail a poster merely because you would prefer a map, diagram, partnership graphic, relationship map, chart, or illustrative scene instead. The server has already normalized non-renderable research visuals into a valid topic-aligned poster brief.",
"A faithful illustrative scene is acceptable when it clearly represents the same PUBLIC TOPIC. Fail visual consistency only when the supplied POSTER direction itself explicitly changes topic, introduces an unsupported factual visual claim, or poster media is missing.",
"A graph/chart is acceptable only when upstream VERIFIED_FACTS supplies the data needed for that graph; otherwise fail with a precise poster-consistency reason.",
"Return exactly PASS on the first non-empty line only if publication-ready.",
"Otherwise return exactly FAIL on the first non-empty line, followed by specific actionable reasons.", "Never return PASS WITH REVISION."
].join("\n")}, {role:"user",content:[ `QC TASK:\n${taskText}`, `DETERMINISTIC PREFLIGHT:\n${JSON.stringify({ checks:preflight.checks,
researchSourceCount:preflight.researchSourceCount,researchTopic:preflight.researchTopic,posterTopic:preflight.posterTopic })}`, `ACC CONTEXT JSON:\n${trimContext(context,18000)}` ].join("\n\n")} ],
max_tokens:1200, temperature:0.15, }); const reply=extractModelTextRobust(result); if(!reply){ return {
reply:"FAIL\nQC semantic audit returned no usable response.", model:TEXT_MODEL, provider:"Cloudflare Workers AI",
qc:{preflight:preflight.checks,researchSourceCount:preflight.researchSourceCount} }; } return { reply, model:TEXT_MODEL,
provider:"ACC Deterministic QC Preflight + Cloudflare Workers AI",
qc:{preflight:preflight.checks,researchSourceCount:preflight.researchSourceCount} }; } function safeUrl(raw){ try{ const u=new URL(raw);
if(!/^https?:$/.test(u.protocol)) return null; const h=u.hostname.toLowerCase();
if(h==="localhost" || h.endsWith(".local") || /^127\./.test(h) || /^10\./.test(h) || /^192\.168\./.test(h) || /^169\.254\./.test(h)) return null;
return u.toString(); }catch{return null;} } function decodeSearchRedirect(raw){ try{ const u=new URL(raw); const h=u.hostname.toLowerCase();
if(h.includes("duckduckgo.com")){ const uddg=u.searchParams.get("uddg"); if(uddg) return decodeURIComponent(uddg); }
if(h.includes("google.") && u.pathname==="/url"){ const q=u.searchParams.get("q") || u.searchParams.get("url"); if(q) return q; }
return raw; }catch{return raw;} } function isUsefulExternalUrl(raw){ const decoded=decodeSearchRedirect(raw); const url=safeUrl(decoded);
if(!url)return false; const h=new URL(url).hostname.toLowerCase(); const blocked=[
"google.com","googleusercontent.com","gstatic.com","bing.com","microsoft.com",
"duckduckgo.com","yahoo.com","yandex.com","facebook.com","instagram.com", "tiktok.com","youtube.com","pinterest.com" ];
if(blocked.some(d=>h===d||h.endsWith("."+d))) return false; return true; } function uniqueUrls(urls){ const out=[];const seen=new Set();
for(const raw of urls){ const decoded=decodeSearchRedirect(raw); if(!isUsefulExternalUrl(decoded))continue;
const u=safeUrl(decoded);if(!u)continue; const normalized=u.replace(/#.*$/,"" ); if(seen.has(normalized))continue;
seen.add(normalized);out.push(normalized); } return out; } async function parseQuickAction(response){
if(!response) return {success:false,result:null,status:0}; const status=response.status||0; try{ const data=await response.json();
return {success:Boolean(data?.success),result:data?.result??null,status,data}; }catch{ try{ const raw=await response.text();
return {success:response.ok,result:raw,status}; }catch{return {success:false,result:null,status};} } }
function cleanTopicText(value,max=180){ return text(value)
.replace(/\b(?:VERIFIED_FACTS|SOURCE_NOTES|KEY_POINTS|VISUAL_FACTS|RISK_NOTES|PUBLIC_HEADLINE)\s*:/gi," ") .replace(/\s+/g," ")
.replace(/[<>{}\[\]]/g," ") .trim() .slice(0,max); } function looksLikeGenericPipelineText(value){ const v=text(value).toLowerCase();
if(!v)return true;
return /execute\s+research|locked channel context|upstream production assets|gm5|one-button production|generate research output|research specialist/.test(v);
} function containsInternalTopicLeak(value){ const v=text(value).toLowerCase(); if(!v)return false;
return /\b(?:gm5|acc os x|acc core|mission terminal|context vault|publish core|ai router)\b|one[- ]button production|(?:scriptwriter|poster creator|social captioner|qc)\s+ai|(?:research|caption|poster|script)\s+worker|staging publish disabled|internal workflow/.test(v);
} function extractResearchTopic(value){ const m=String(value||"").match(/^\s*TOPIC\s*:\s*(.+)$/im); return m?cleanTopicText(m[1],220):""; }
function normTopic(value){ return cleanTopicText(value,260).toLowerCase().replace(/[^a-z0-9]+/g," ").trim(); } function extractPosterTopic(value){ const m=String(value||"").match(/^\s*PUBLIC TOPIC\s*:\s*(.+)$/im); return m?cleanTopicText(m[1],220):""; } function latestResearchTopicFromContext(context){ const research=latestUpstreamByStage(context,"RESEARCH");
return extractResearchTopic(text(research?.output)); } function researchSection(raw,name,nextNames){ const stop=(nextNames||[]).join("|");
const re=new RegExp(`^\\s*${name}\\s*:\\s*([\\s\\S]*?)${stop?`(?=^\\s*(?:${stop})\\s*:|$)`:"$"}`,"im"); const m=String(raw||"").match(re);
return m?text(m[1]).slice(0,5000):""; } function researchPacketFromContext(context){
const raw=text(latestUpstreamByStage(context,"RESEARCH")?.output);
const names=["VERIFIED_FACTS","SOURCE_NOTES","ANGLE","KEY_POINTS","VISUAL_FACTS","RISK_NOTES","SOURCES"];
const section=(name)=>researchSection(raw,name,names.filter(x=>x!==name)); return { topic:extractResearchTopic(raw),
verifiedFacts:section("VERIFIED_FACTS"), angle:section("ANGLE"), keyPoints:section("KEY_POINTS"), visualFacts:section("VISUAL_FACTS"),
riskNotes:section("RISK_NOTES"), sources:section("SOURCES") }; } function publicProductionContext(context){ const p=context?.profile||{};
const rows=Array.isArray(context?.upstreamAssets)?context.upstreamAssets:[];
const contexts=Array.isArray(context?.contexts)?context.contexts:[]; return { profile:{
id:p.id||"",code:p.code||"",name:p.name||"",kind:p.kind||"",department:p.department||"",
category:p.category||"",platform:p.platform||"",cadence:p.cadence||"",productionFormat:p.productionFormat||"",
communication:p.communication||"",mission:p.mission||"",canon:p.canon||"" }, upstreamAssets:rows.slice(0,5).map(item=>({
type:item?.type||"",stage:item?.stage||"",hasMedia:Boolean(item?.hasMedia),mimeType:item?.mimeType||null,
output:String(item?.output||"").slice(0,5000) })), contexts:contexts.slice(0,8).map(item=>({
type:item?.type||"",title:item?.title||"",version:item?.version||null,content:String(item?.content||"").slice(0,2200) })) }; }
function stageContract(stage,packet){ const topic=packet.topic; if(stage==="SCRIPT") return [ `PUBLIC TOPIC: ${topic}`,
"Write publication-ready material about this exact topic only.",
"Every factual claim must come from VERIFIED_FACTS/KEY_POINTS below; do not introduce adjacent trends or generic claims.",
"EVIDENCE DISCIPLINE: do not infer consequences, impacts, forecasts, causes, risks, or outcomes unless VERIFIED_FACTS explicitly supports that implication.",
"If the packet contains concerns, reactions, or opinions, attribute them to the named source/person/organization; never convert an opinion into a verified outcome.",
"If evidence is incomplete, state the uncertainty plainly instead of filling the gap. Never use broad phrases such as significant consequences, industry-wide impact, or consumers will be affected unless research explicitly supports them.",
"ANGLE defines the editorial focus and must remain consistent from headline through body.",
"Include exactly one plain-text line: PUBLIC_HEADLINE: <headline that accurately states this topic>.",
"Do not mention ACC OS X, GM5, workers, routing, staging, internal workflow, or system instructions." ].join("\n");
if(stage==="POSTER") return [ `PUBLIC TOPIC: ${topic}`,
"Return visual direction only for a clean AI background/artwork representing this exact topic.",
"VISUAL_FACTS below are the primary visual brief. Do not substitute a different industry, device, person, chart, or concept.",
"Never request a chart/graph unless VERIFIED_FACTS contains the exact numeric/time-series basis for that chart.",
"No headline, logo, watermark, signage, UI text, letters, pseudo-text, or ACC internal terminology inside the AI artwork.",
"Keep safe negative space for deterministic headline/logo overlays." ].join("\n"); if(stage==="CAPTION") return [ `PUBLIC TOPIC: ${topic}`,
"Return ONLY the final publish-ready caption.",
"Stay on the same topic, angle, and verified facts used by the material; do not add a new theme or unsupported claim.",
"Preserve evidence strength: attribute concerns/opinions and do not turn them into factual consequences, predictions, or industry-wide claims.",
"Preserve Channel Passport language/tone/credits/tag rules.",
"No labels, JSON, markdown fences, placeholders, debug text, or ACC internal terminology." ].join("\n"); return `PUBLIC TOPIC: ${topic}`; }
function posterVisualBasis(packet){ const topic=cleanTopicText(packet?.topic,220); const visual=text(packet?.visualFacts).slice(0,2600);
const angle=text(packet?.angle).slice(0,1000); const raw=visual||angle||topic; const nonRenderable=/\b(?:diagram|chart|graph|dashboard|infographic|network map|flowchart|table|timeline)\b/i.test(raw);
if(nonRenderable)return `Illustrative editorial scene representing exactly: ${topic}. Show only people, objects, places, or actions directly implied by this public topic. Do not reproduce a diagram, chart, organization map, logo, text, or data visualization.`;
return raw; }
function deterministicPosterBrief(packet){ const topic=cleanTopicText(packet?.topic,220); const basis=posterVisualBasis(packet); return [ `PUBLIC TOPIC: ${topic}`,
`PRIMARY VISUAL BASIS: ${basis}`, "Create one clean editorial artwork/background for this exact public topic and nothing adjacent.",
"The image may be an illustrative scene rather than a literal documentary photo, but it must clearly represent the PUBLIC TOPIC.",
"Represent only people, objects, institutions, locations, or actions supported by PRIMARY VISUAL BASIS or directly implied by PUBLIC TOPIC.",
"If research suggests a diagram/chart/graph/organization map, convert it into a clear illustrative scene instead of drawing the diagram itself.",
"Do not invent reaction shots, executives, media chiefs, factories, unrelated devices, numbers, dashboards, charts, graphs, or unrelated industries.",
"No headline, logo, watermark, signage, UI text, letters, pseudo-text, or ACC/internal terminology inside the AI artwork.",
"Keep strong subject clarity and safe negative space for deterministic headline/logo overlays." ].join("\n"); }
function normalizePublicStageOutput(stage,value,packet){ const out=text(value); if(stage!=="SCRIPT"||!out||/\bPUBLIC_HEADLINE\s*:\s*\S+/i.test(out))return out;
const h=cleanTopicText(packet?.topic,140).replace(/[.!?]+$/g,"").trim(); return h?`PUBLIC_HEADLINE: ${h}\n\n${out}`:out; }
function validatePublicStageOutput(stage,value){ const out=text(value); const problems=[]; if(!out)problems.push("emptyOutput");
if(containsInternalTopicLeak(out))problems.push("internalLeak");
if(stage==="SCRIPT"&&!/\bPUBLIC_HEADLINE\s*:\s*\S+/i.test(out))problems.push("headlineMissing");
if(stage==="CAPTION"&&( /^\s*(?:Caption Output|Generated Caption|Result)\s*:/i.test(out) || /```/.test(out) ))problems.push("captionWrapper");
return {ok:problems.length===0,problems}; } async function runPublicProductionStage(env,body,stage){ const context=body?.context||{};
const packet=researchPacketFromContext(context); const topic=packet.topic; if(!topic||containsInternalTopicLeak(topic)){
return {error:{code:"PUBLIC_TOPIC_MISSING",message:"Latest grounded research does not contain a clean public TOPIC for downstream production."}};
} if(stage==="POSTER"){ return {reply:deterministicPosterBrief(packet),model:"ACC_DETERMINISTIC_POSTER_BRIEF",provider:"ACC Public Packet Visual Lock",repairAttempts:0}; }
const safeContext=trimContext(publicProductionContext(context),12000); const packetText=trimContext(packet,10000); const baseSystem=[
"You are the isolated ACC OS X production AI for PUBLIC audience content.",
"The server has stripped internal mission/task labels. Never reconstruct or expose them.",
"The PUBLIC RESEARCH PACKET below is the single source of truth. Keep topic, angle, facts and visuals mutually consistent.",
"Do not invent facts, numbers, quotes, sources, products, people, industries or visual claims that are not supported by the packet.",
"Follow the Channel Passport tone, language, audience, canon, platform and production rules in context.", `STAGE: ${stage}`,
stageContract(stage,packet), `PUBLIC RESEARCH PACKET:\n${packetText}`, `PUBLIC-SAFE CONTEXT JSON:\n${safeContext}` ].join("\n\n");
let previous="",lastProblems=[]; for(let attempt=1;attempt<=2;attempt++){ const user=attempt===1
?`Produce the ${stage} deliverable now. Stay on PUBLIC TOPIC: ${topic}.`
:[`Repair the previous ${stage} draft.`, `Problems: ${lastProblems.join(", ")}.`, "Return corrected deliverable only.", `Previous draft:\n${previous.slice(0,10000)}`].join("\n");
const result=await env.AI.run(TEXT_MODEL,{messages:[{role:"system",content:baseSystem},{role:"user",content:user}],max_tokens:1600,temperature:attempt===1?0.25:0.1});
const reply=normalizePublicStageOutput(stage,extractModelTextRobust(result),packet); const check=validatePublicStageOutput(stage,reply);
if(check.ok)return {reply,model:TEXT_MODEL,provider:"Cloudflare Workers AI + ACC Public Packet Lock",repairAttempts:attempt-1};
previous=reply;lastProblems=check.problems; }
return {error:{code:"PUBLIC_OUTPUT_CONTRACT_FAILED",message:`${stage} output failed public contract after automatic repair: ${lastProblems.join(", ")}.`}};
} function sanitizedResearchContext(context){ const p=context?.profile||{}; const explicit=explicitMissionTopic(context); return { profile:{
id:p.id||"", code:p.code||"", name:p.name||"", kind:p.kind||"",
department:p.department||"", category:p.category||"", platform:p.platform||"",
cadence:p.cadence||"", productionFormat:p.productionFormat||"", communication:p.communication||"", mission:p.mission||"", canon:p.canon||""
}, explicitPublicTopic:explicit||null }; } function publicResearchTask(body,context){ const explicit=explicitMissionTopic(context);
if(explicit)return `Research the user-selected PUBLIC topic: ${explicit}`; const p=context?.profile||{};
const name=cleanTopicText(p.name,80)||"this channel"; const category=cleanTopicText(p.category,100)||"its editorial category";
return `Discover one current, publication-worthy PUBLIC topic for ${name} in ${category}. Ignore all ACC/GM5/task/workflow/debug wording; those are orchestration metadata, never the content topic.`;
} function explicitMissionTopic(context){ const queue=context?.queueMission||{}; const title=cleanTopicText(queue.title,160);
const brief=cleanTopicText(queue.brief,220);
if(title && !looksLikeGenericPipelineText(title) && !containsInternalTopicLeak(title)) return title;
if(brief && !looksLikeGenericPipelineText(brief) && !containsInternalTopicLeak(brief)) return brief; return ""; } function monthYearUTC(){
const d=new Date(); const month=d.toLocaleString("en-US",{month:"long",timeZone:"UTC"}); return `${month} ${d.getUTCFullYear()}`; }
function channelDiscoveryQueries(context){ const p=context?.profile||{}; const channel=cleanTopicText(p.name,70)||"ACC";
const category=cleanTopicText(p.category,90)||"news"; const mission=cleanTopicText(p.mission,100);
const explicit=explicitMissionTopic(context); if(explicit){ return [ `${explicit}`, `${explicit} latest`,
`${explicit} official announcement` ]; } return [ `${category} latest news`, `${category} major announcement`,
`${channel} ${category} news${mission?` ${mission}`:""}` ]; } async function planResearchQueries(env,body){ const context=body?.context||{};
return channelDiscoveryQueries(context) .map(q=>q.replace(/\s+/g," ").trim().slice(0,180)) .filter(Boolean) .slice(0,3); }
async function collectSearchLinks(env,queries){ const found=[]; const diagnostics=[]; for(const query of queries){
const encoded=encodeURIComponent(query); const searchPages=[ `https://www.bing.com/search?q=${encoded}`,
`https://html.duckduckgo.com/html/?q=${encoded}`, `https://www.google.com/search?q=${encoded}`, ]; for(const searchUrl of searchPages){
if(found.length>=14)break; try{ const response=await env.BROWSER.quickAction("links",{ url:searchUrl, visibleLinksOnly:true,
gotoOptions:{waitUntil:"domcontentloaded",timeout:8000}, }); const parsed=await parseQuickAction(response); diagnostics.push({ query,
engine:new URL(searchUrl).hostname, status:parsed.status, success:parsed.success,
resultCount:Array.isArray(parsed.result)?parsed.result.length:0 });
if(parsed.success && Array.isArray(parsed.result)) found.push(...parsed.result); }catch(err){ diagnostics.push({ query,
engine:new URL(searchUrl).hostname, success:false, error:String(err?.message||err).slice(0,160) }); } } if(found.length>=14)break; }
return {urls:uniqueUrls(found).slice(0,12),diagnostics}; } async function fetchEvidencePages(env,urls){ const evidence=[];
for(const url of urls.slice(0,6)){ if(evidence.length>=4)break; try{ const response=await env.BROWSER.quickAction("markdown",{ url,
gotoOptions:{waitUntil:"domcontentloaded",timeout:7000}, }); const parsed=await parseQuickAction(response);
const markdown=text(parsed.result); if(!parsed.success || markdown.length<350)continue; evidence.push({ url, domain:new URL(url).hostname,
excerpt:markdown.replace(/\n{3,}/g,"\n\n").slice(0,7000), }); }catch{} } return evidence; } function urlsInText(value){
return Array.from(String(value||"").matchAll(/https?:\/\/[^\s)\]}>]+/g)).map(m=>m[0].replace(/[.,;:]+$/,"")); }
function extractModelText(result){ return extractModelTextRobust(result); } function urlsFromAny(value){
const raw=typeof value==="string"?value:(()=>{try{return JSON.stringify(value);}catch{return "";}})(); return [...new Set(urlsInText(raw))];
} function modelContentToText(value){ if(typeof value==="string")return value.trim(); if(Array.isArray(value)){ return value.map(part=>{
if(typeof part==="string")return part; if(part&&typeof part==="object"){
return text(part.text)||text(part.content)||text(part.output_text)||""; } return ""; }).filter(Boolean).join("\n").trim(); } return ""; }
function extractModelTextRobust(result){ return text(result?.response) || text(result?.result?.response)
|| modelContentToText(result?.choices?.[0]?.message?.content) || modelContentToText(result?.output) || text(result?.output_text)
|| text(result?.choices?.[0]?.text) || ""; } function decodeEntities(value){ return String(value||"")
.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,"$1") .replace(/&amp;/g,"&") .replace(/&lt;/g,"<") .replace(/&gt;/g,">") .replace(/&quot;/g,'"')
.replace(/&#39;/g,"'") .replace(/&#x2F;/gi,"/"); } function xmlField(block,name){
const m=String(block||"").match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`,"i"));
return m?decodeEntities(m[1]).replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim():""; } function xmlSource(block){
const m=String(block||"").match(/<source(?:\s+url="([^"]+)")?[^>]*>([\s\S]*?)<\/source>/i);
return m?{url:decodeEntities(m[1]||""),name:decodeEntities(m[2]||"").replace(/<[^>]+>/g," ").trim()}:{url:"",name:""}; }
function parseRss(xml,engine){ const items=[]; const raw=String(xml||""); for(const m of raw.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)){
const block=m[1]; const title=xmlField(block,"title"); const link=xmlField(block,"link");
const pubDate=xmlField(block,"pubDate")||xmlField(block,"dc:date"); const source=xmlSource(block);
if(title&&link)items.push({title,link,pubDate,sourceName:source.name,sourceUrl:source.url,engine}); if(items.length>=16)break; }
return items; } function decodeNewsRedirect(raw){ try{ const u=new URL(raw); const h=u.hostname.toLowerCase();
if(h.endsWith("bing.com") && /\/news\/api(?:click|redirect)/i.test(u.pathname)){ const direct=u.searchParams.get("url");
if(direct)return decodeURIComponent(direct); } return raw; }catch{return raw;} } async function resolveNewsUrl(raw){
const decoded=decodeNewsRedirect(raw); const direct=safeUrl(decoded); if(!direct)return null; try{ const u=new URL(direct);
if(u.hostname==="news.google.com"){ const r=await fetch(direct,{ method:"GET", redirect:"follow",
headers:{"User-Agent":"Mozilla/5.0 ACC-OS-X-Research/1.4","Accept":"text/html,application/xhtml+xml"} }); const final=safeUrl(r.url);
if(final && !new URL(final).hostname.endsWith("google.com"))return final; } }catch{} return direct; }
function recentEnough(pubDate,maxDays=35){ if(!pubDate)return true; const t=Date.parse(pubDate); if(!Number.isFinite(t))return true;
const age=Date.now()-t; return age>=-86400000 && age<=maxDays*86400000; } async function rssNewsDiscovery(queries){ const diagnostics=[];
const collected=[]; for(const query of queries.slice(0,3)){ const q=encodeURIComponent(query); const feeds=[
{engine:"BING_NEWS_RSS",url:`https://www.bing.com/news/search?q=${q}&format=rss`},
{engine:"GOOGLE_NEWS_RSS",url:`https://news.google.com/rss/search?q=${q}&hl=en-US&gl=US&ceid=US:en`} ]; for(const feed of feeds){ try{
const r=await fetch(feed.url,{ method:"GET", redirect:"follow", headers:{ "User-Agent":"Mozilla/5.0 ACC-OS-X-Research/1.4",
"Accept":"application/rss+xml,application/xml,text/xml;q=0.9,*/*;q=0.8" } }); const raw=await r.text();
const items=r.ok?parseRss(raw,feed.engine):[]; diagnostics.push({query,engine:feed.engine,status:r.status,count:items.length});
for(const item of items){ if(recentEnough(item.pubDate))collected.push({...item,query}); } }catch(err){
diagnostics.push({query,engine:feed.engine,status:0,count:0,error:String(err?.message||err).slice(0,180)}); } }
if(collected.length>=10)break; } const resolved=[]; const seen=new Set(); for(const item of collected.slice(0,18)){
let url=await resolveNewsUrl(item.link); if(!url && item.sourceUrl)url=safeUrl(item.sourceUrl); if(!url)continue;
const normalized=url.replace(/#.*$/,""); if(seen.has(normalized))continue; seen.add(normalized); resolved.push({...item,url:normalized});
if(resolved.length>=10)break; } const reply=resolved.map((item,i)=>[ `RESULT ${i+1}`, `TITLE: ${item.title}`,
`SOURCE: ${item.sourceName||new URL(item.url).hostname}`, `DATE: ${item.pubDate||"unknown"}`, `URL: ${item.url}` ].join("\n")).join("\n\n");
return {reply,urls:resolved.map(x=>x.url),items:resolved,diagnostics}; } async function nativeWebSearchDiscovery(env,queries,context){
const prompt=[ "Use native web search to find a CURRENT, publication-worthy technology/media topic that matches this ACC Channel Passport.",
"Search the web; do not answer from memory alone.",
"Choose ONE specific current event/topic supported by at least 3 independent web sources.",
"Never use ACC OS X, GM5, workflow instructions, or upstream internal text as the public topic unless explicitly requested.",
"Return plain text exactly with these sections:", "TOPIC_CANDIDATE:", "SEARCH_FACTS:", "SOURCE_URLS:", "- https://...", "- https://...",
"- https://...", "Every factual bullet must be grounded in the web search you just performed.", `QUERY PLAN:\n${queries.join("\n")}`,
`PUBLIC CHANNEL CONTEXT:\n${trimContext(sanitizedResearchContext(context),5000)}`, ].join("\n\n");
const result=await env.AI.run(RESEARCH_MODEL,{ messages:[
{role:"system",content:"You are ACC OS X Source Discovery. You must use native web search and return current sources. Never fabricate a URL."},
{role:"user",content:prompt} ], web_search_options:{}, temperature:0.15, max_completion_tokens:1400, });
const reply=extractModelTextRobust(result); const urls=[...new Set([...urlsInText(reply),...urlsFromAny(result)])]
.filter(isUsefulExternalUrl) .slice(0,10); return {reply,urls,result}; } function validateGroundedResearch(reply,evidence){
const allowed=new Set(evidence.map(e=>e.url.replace(/\/$/,"")));
const cited=urlsInText(reply).map(u=>u.replace(/\/$/,"")).filter(u=>allowed.has(u)); const unique=[...new Set(cited)];
const hasFacts=/VERIFIED_FACTS\s*:/i.test(reply); const hasSources=/SOURCES?\s*:/i.test(reply);
const failed=/^\s*RESEARCH_FAILED\b/i.test(reply);
return {ok:!failed && hasFacts && hasSources && unique.length>=2,cited:unique,hasFacts,hasSources,failed}; }
async function runGroundedResearch(env,body){ const queries=await planResearchQueries(env,body);
const query=queries[0]||"current verified news"; const context=body?.context||{};
let discovery={reply:"",urls:[],result:null,transport:"NONE",diagnostics:[]}; try{
const native=await nativeWebSearchDiscovery(env,queries,context); if(native.reply && native.urls.length>=2){
discovery={...native,transport:"NATIVE_WEB_SEARCH",diagnostics:[]}; } }catch(err){
discovery.diagnostics.push({transport:"NATIVE_WEB_SEARCH",error:String(err?.message||err).slice(0,220)}); }
if(!discovery.reply || discovery.urls.length<2){ try{ const rss=await rssNewsDiscovery(queries); if(rss.reply && rss.urls.length>=2){
discovery={...rss,result:null,transport:"RSS_NEWS_FALLBACK"}; }else{
discovery.diagnostics=[...(discovery.diagnostics||[]),...(rss.diagnostics||[])]; } }catch(err){
discovery.diagnostics.push({transport:"RSS_NEWS_FALLBACK",error:String(err?.message||err).slice(0,220)}); } }
if(!discovery.reply || discovery.urls.length<2){ return {error:{ status:422, code:"RESEARCH_FAILED_NO_USABLE_SOURCES",
message:`Hybrid source engine found ${discovery.urls?.length||0} usable source URL(s); minimum 2. Query utama: ${query}`, query, queries,
diagnostics:discovery.diagnostics }}; } let verifiedPages=[]; if(env.BROWSER){
try{verifiedPages=await fetchEvidencePages(env,discovery.urls);}catch{} } const userTask=publicResearchTask(body,context);
const verifiedBundle=verifiedPages.length
? verifiedPages.map((e,i)=>`VERIFIED PAGE ${i+1}\nURL: ${e.url}\nCONTENT:\n${e.excerpt}`).join("\n\n---\n\n")
: "No publisher pages could be additionally rendered; native web search discovery remains the grounding source.";
const allowedUrls=discovery.urls.slice(0,8); const synth=await env.AI.run(TEXT_MODEL,{ messages:[ {role:"system",content:[
"You are ACC OS X Research AI in evidence-first mode.", "Use ONLY NATIVE WEB SEARCH DISCOVERY plus any VERIFIED PAGE bundle below.",
"Choose ONE exact public topic and keep it consistent across EVERY section.",
"TOPIC must describe one real external/public subject from the discovered sources. ACC OS X, GM5, mission/task names, workflow/pipeline language, and internal worker labels are forbidden as TOPIC.",
"Every VERIFIED_FACT, ANGLE, KEY_POINT, VISUAL_FACT and RISK_NOTE must directly support that same TOPIC; do not mix neighboring subjects.",
"VISUAL_FACTS must be drawable representations of supported facts. Never propose a graph/chart unless VERIFIED_FACTS contains the exact numeric/time-series basis.",
"Do not invent facts, quotes, dates, numbers, names, events, or URLs.", "Use at least two URLs from ALLOWED SOURCE URLS.",
"Begin with RESEARCH_PASS only if publication-ready.",
"Then output exactly: TOPIC, VERIFIED_FACTS, SOURCE_NOTES, ANGLE, KEY_POINTS, VISUAL_FACTS, RISK_NOTES, SOURCES.",
"SOURCES must contain exact URLs from ALLOWED SOURCE URLS.", ].join("\n")}, {role:"user",content:[
`PUBLIC CHANNEL CONTEXT:\n${trimContext(sanitizedResearchContext(context),5000)}`, `USER RESEARCH TASK:\n${userTask}`,
`QUERY PLAN:\n${queries.join("\n")}`, `NATIVE WEB SEARCH DISCOVERY:\n${discovery.reply}`, `ALLOWED SOURCE URLS:\n${allowedUrls.join("\n")}`,
`OPTIONAL VERIFIED PAGE CONTENT:\n${verifiedBundle}`, ].join("\n\n")} ], max_tokens:1800, temperature:0.2, });
const reply=extractModelText(synth); if(!reply){
return {error:{status:502,code:"RESEARCH_SYNTHESIS_EMPTY",message:"Research synthesis returned no text."}}; }
const cited=[...new Set(urlsInText(reply))].filter(u=>allowedUrls.includes(u)); const hasFacts=/\bVERIFIED_FACTS\b/i.test(reply);
const hasSources=/\bSOURCES?\b/i.test(reply); const citedEnough=cited.length>=2; const selectedTopic=extractResearchTopic(reply);
const topicPublic=Boolean(selectedTopic) && !containsInternalTopicLeak(selectedTopic); const missing=[];
if(!topicPublic)missing.push("PUBLIC_TOPIC_FIREWALL"); if(!hasFacts)missing.push("VERIFIED_FACTS"); if(!hasSources)missing.push("SOURCES");
if(!citedEnough)missing.push(`SOURCE_URLS(${cited.length}/2)`); if(missing.length){ return {error:{ status:422,
code:"RESEARCH_FAILED_GROUNDING_CONTRACT", message:`Research grounding contract missing: ${missing.join(", ")}.`, query,
citedCount:cited.length, }}; } const normalizedReply=/^\s*RESEARCH_PASS\b/i.test(reply) ? reply : `RESEARCH_PASS\n${reply}`; return {
reply:normalizedReply, model:TEXT_MODEL, provider:"ACC Hybrid Source Engine + Cloudflare Workers AI", research:{ query, queries,
topicMode:explicitMissionTopic(context)?"EXPLICIT":"DISCOVERY", discoveryModel:RESEARCH_MODEL, transport:discovery.transport,
sourceCount:allowedUrls.length, sources:allowedUrls, browserVerifiedCount:verifiedPages.length, } }; } export default {
async fetch(request,env){ const url=new URL(request.url); if(request.method==="OPTIONS"){
return new Response(null,{status:204,headers:{...cors,"Access-Control-Max-Age":"86400"}}); }
if(request.method==="GET" && (url.pathname==="/health" || url.pathname==="/api/acc-ai")){ return json({ ok:true, service:"ACC OS X PRODUCTION AI",
system:"ACC OS X", status:"ONLINE", revision:"QUALITY_HARDENING_V1_6_7_PRODUCTION", mode:"PRODUCTION_AI", aiBinding:Boolean(env.AI),
browserBinding:Boolean(env.BROWSER), accessSecretConfigured:Boolean(env.ACC_AI_ACCESS_CODE||env.ACC_ACCESS_CODE), textModel:TEXT_MODEL,
researchModel:RESEARCH_MODEL, imageModel:IMAGE_MODEL, researchGrounding:"HYBRID_SOURCE_ENGINE_V1_4_3",
qcPolicy:"SERVER_RESEARCH_AUTHORITY_PLUS_SEMANTIC_QC_V1_6_5", queryPlanner:"DETERMINISTIC_CHANNEL_TOPIC_DISCOVERY_V1_4",
researchTransport:"NATIVE_WEB_SEARCH_THEN_RSS_NEWS_THEN_BROWSER_VERIFY", researchFailFast:true, readableErrorContract:true,
regexContractFix:true, editorTypeCheckClean:true, groundingContractNormalizer:true, deterministicQcPreflight:true,
sourceAuthorityAligned:true, topicFirewall:true, publicTopicSanitizer:true, internalTopicLeakHardBlock:true, internalMissionStripping:true,
downstreamPublicContextIsolation:true, downstreamAutoRepair:true, genericPhraseFalsePositiveFix:true, publicPacketConsistencyLock:true,
researchSectionCohesion:true, posterVisualFactsLock:true, unsupportedChartHardBlock:true, deterministicHeadlineNormalizer:true, deterministicPosterBrief:true, posterAdjacentTopicBlock:true, posterRenderabilityNormalizer:true, diagramToSceneFallback:true, illustrativeTopicVisualAccepted:true, posterQcDeterministicAuthority:true, qcVisualHallucinationGuard:true, claimDisciplineLock:true, opinionAttributionLock:true, unsupportedInferenceRepair:true, publishConnectorExternal:true, realPublish:false, }); }
if(request.method==="POST" && url.pathname==="/api/acc-ai"){ const denied=requireAccess(request,env);if(denied)return denied;
if(!env.AI)return json({ok:false,...publicError({code:"AI_BINDING_MISSING",message:"Workers AI binding bernama AI belum dipasang."})},503);
let body; try{body=await request.json();}
catch{return json({ok:false,...publicError({code:"INVALID_JSON",message:"Invalid JSON body."})},400);} if(isResearchRequest(body)){ try{
const grounded=await runGroundedResearch(env,body); if(grounded.error){ const {status,...error}=grounded.error;
return json({ok:false,stage:"RESEARCH",status:"RESEARCH_FAILED",...publicError(error,"RESEARCH_FAILED")},status); }
return json({ok:true,reply:grounded.reply,model:grounded.model,provider:grounded.provider,mode:"PRODUCTION_AI",research:grounded.research});
}catch(err){
return json({ok:false,stage:"RESEARCH",status:"RESEARCH_FAILED",...publicError({code:"RESEARCH_GROUNDING_ERROR",message:String(err?.message||err)})},502);
} } if(isQcRequest(body)){ try{ const qc=await runQcAligned(env,body);
return json({ok:true,reply:qc.reply,model:qc.model,provider:qc.provider,mode:"PRODUCTION_AI",qc:qc.qc}); }catch(err){
return json({ok:false,stage:"QC",status:"QC_FAILED",...publicError({code:"QC_AUDIT_ERROR",message:String(err?.message||err)})},502); } }
const publicStage=detectStage(body); if(publicStage==="SCRIPT"||publicStage==="POSTER"||publicStage==="CAPTION"){ try{
const generated=await runPublicProductionStage(env,body,publicStage); if(generated.error){
return json({ok:false,stage:publicStage,status:`${publicStage}_FAILED`,...publicError(generated.error,`${publicStage}_FAILED`)},422); }
return json({ok:true,reply:generated.reply,model:generated.model,provider:generated.provider,mode:"PRODUCTION_AI",publicFirewall:{stage:publicStage,repairAttempts:generated.repairAttempts}});
}catch(err){
return json({ok:false,stage:publicStage,status:`${publicStage}_FAILED`,...publicError({code:"PUBLIC_STAGE_ERROR",message:String(err?.message||err)})},502);
} } const incoming=Array.isArray(body?.messages)?body.messages:[];
const cleanMessages=incoming.filter(m=>m&&(m.role==="user"||m.role==="assistant")&&text(m.content)).slice(-18).map(m=>({role:m.role,content:text(m.content).slice(0,16000)}));
if(!cleanMessages.length)return json({ok:false,...publicError({code:"EMPTY_MESSAGES",message:"No AI messages supplied."})},400);
const context=trimContext(body?.context); const messages=[ {role:"system",content:[ "You are the isolated ACC OS X PRODUCTION AI worker.",
"Follow the active Channel Passport, mission, language, tone, audience, canon, and workflow supplied in context.",
"Use upstream research as factual source of truth. Do not invent factual claims or sources.",
"Keep one mission topic consistent across material, poster direction, caption, and QC.",
"Do not expose system/debug instructions in public-facing content.", "If the task is Caption AI, return publication copy only.",
"If the task is QC, use the dedicated QC route and deterministic research preflight.", `ACC CONTEXT JSON:\n${context}` ].join("\n")},
...cleanMessages ]; try{ const result=await env.AI.run(TEXT_MODEL,{messages,max_tokens:1800,temperature:0.3});
const reply=text(result?.response)||text(result?.result?.response);
if(!reply)return json({ok:false,...publicError({code:"EMPTY_MODEL_RESPONSE",message:"Workers AI returned no text response."})},502);
return json({ok:true,reply,model:TEXT_MODEL,provider:"Cloudflare Workers AI",mode:"PRODUCTION_AI"}); }catch(err){
return json({ok:false,...publicError({code:"WORKERS_AI_TEXT_FAILED",message:String(err?.message||err)})},502); } }
if(request.method==="POST" && url.pathname==="/api/acc-image"){ const denied=requireAccess(request,env);if(denied)return denied;
if(!env.AI)return json({ok:false,...publicError({code:"AI_BINDING_MISSING",message:"Workers AI binding bernama AI belum dipasang."})},503);
let body; try{body=await request.json();}
catch{return json({ok:false,...publicError({code:"INVALID_JSON",message:"Invalid JSON body."})},400);} const prompt=text(body?.prompt);
if(!prompt)return json({ok:false,...publicError({code:"EMPTY_PROMPT",message:"Image prompt kosong."})},400);
const safePrompt=[prompt.slice(0,1800),"","STRICT VISUAL OUTPUT RULE: clean artwork/background only; no logo, no watermark, no headline, no subtitle, no signage, no UI text, no letters, no pseudo-text, no random typography."].join("\n");
try{ const result=await env.AI.run(IMAGE_MODEL,{prompt:safePrompt,steps:4,seed:Math.floor(Math.random()*9999999)+1});
const imageBase64=text(result?.image);
if(!imageBase64)return json({ok:false,...publicError({code:"EMPTY_IMAGE_RESPONSE",message:"Workers AI returned no image."})},502);
return json({ok:true,imageBase64,mimeType:"image/jpeg",model:IMAGE_MODEL,mode:"PRODUCTION_AI"}); }catch(err){
return json({ok:false,...publicError({code:"WORKERS_AI_IMAGE_FAILED",message:String(err?.message||err)})},502); } }
return env.ASSETS?env.ASSETS.fetch(request):json({ok:false,...publicError({code:"NOT_FOUND",message:"Endpoint not found."})},404); } };
