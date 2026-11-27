// Bus Tracker API: Cloudflare Worker + D1. No secrets in code: JWT_SECRET and ADMIN_PASSWORD are Worker secrets.
const H8=8*3600e3, ONLINE_MS=120e3, MOVE_KMH=4, ITER=100000;
const STALE_MS=16*3600e3; // an open shift older than this is auto-closed (forgotten handover)
const enc=new TextEncoder();
const b64=u=>btoa(String.fromCharCode(...new Uint8Array(u))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const unb64=s=>Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
const hex=u=>[...new Uint8Array(u)].map(x=>x.toString(16).padStart(2,'0')).join('');
async function hashPw(pw,saltHex){const key=await crypto.subtle.importKey('raw',enc.encode(pw),'PBKDF2',false,['deriveBits']);
  const salt=Uint8Array.from(saltHex.match(/../g).map(h=>parseInt(h,16)));
  return hex(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt,iterations:ITER},key,256))}
const newSalt=()=>hex(crypto.getRandomValues(new Uint8Array(16)));
const hmacKey=s=>crypto.subtle.importKey('raw',enc.encode(s),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);
async function sign(env,p){const body=b64(enc.encode(JSON.stringify(p)));const k=await hmacKey(env.JWT_SECRET);return body+'.'+b64(await crypto.subtle.sign('HMAC',k,enc.encode(body)))}
async function verify(env,t){if(!t||!env.JWT_SECRET)return null;const [body,sig]=t.split('.');if(!sig)return null;const k=await hmacKey(env.JWT_SECRET);
  if(!await crypto.subtle.verify('HMAC',k,unb64(sig),enc.encode(body)))return null;const p=JSON.parse(new TextDecoder().decode(unb64(body)));return p.exp>Date.now()?p:null}
const eq=(a,b)=>{if(a.length!==b.length)return false;let r=0;for(let i=0;i<a.length;i++)r|=a.charCodeAt(i)^b.charCodeAt(i);return r===0};
const toRad=x=>x*Math.PI/180;
const dist=(a,b,c,d)=>{const dl=toRad(c-a),dn=toRad(d-b);const x=Math.sin(dl/2)**2+Math.cos(toRad(a))*Math.cos(toRad(c))*Math.sin(dn/2)**2;return 12742*Math.asin(Math.sqrt(x))};
const cors=(env,req)=>{const o=req.headers.get('Origin');const ok=o&&(o===env.ALLOWED_ORIGIN||/^http:\/\/localhost(:\d+)?$/.test(o));
  return {'Access-Control-Allow-Origin':ok?o:env.ALLOWED_ORIGIN,'Access-Control-Allow-Headers':'authorization,content-type','Access-Control-Allow-Methods':'GET,POST,PUT,PATCH,DELETE,OPTIONS','Vary':'Origin'}};
const J=(d,s,h)=>new Response(JSON.stringify(d),{status:s||200,headers:{'content-type':'application/json',...h}});
const num=(v,min,max)=>{v=Number(v);return Number.isFinite(v)&&v>=min&&v<=max?v:null};
const str=(v,n)=>typeof v==='string'&&v.trim()&&v.length<=n?v.trim():null;

// Login robustness: ONE username per account. Accept trimmed, case-insensitive input,
// Arabic-Indic/Persian digits, and Arabic keyboard-layout slips (typing shakeer with the
// keyboard in Arabic produces ساشنثثق, which maps back to shakeer by key position).
const PW_MIN=4;
const ARD='٠١٢٣٤٥٦٧٨٩',FAD='۰۱۲۳۴۵۶۷۸۹';
const KBD={'ض':'q','ص':'w','ث':'e','ق':'r','ف':'t','غ':'y','ع':'u','ه':'i','خ':'o','ح':'p','ج':'[','د':']','ش':'a','س':'s','ي':'d','ب':'f','ل':'g','ا':'h','ت':'j','ن':'k','م':'l','ك':';','ط':"'",'ئ':'z','ء':'x','ؤ':'c','ر':'v','ى':'n','ة':'m','و':',','ز':'.','ظ':'/','آ':'h','أ':'h','إ':'h'};
const digits=s=>s.replace(/[٠-٩]/g,c=>ARD.indexOf(c)).replace(/[۰-۹]/g,c=>FAD.indexOf(c));
const normU=u=>{if(typeof u!=='string')return null;const n=digits(u.normalize('NFKC').replace(/[ً-ْٰـ]/g,'')).trim().toLowerCase();return n||null};
const normP=p=>typeof p==='string'?digits(p.normalize('NFKC')).trim():'';
const uCands=u=>{const n=normU(u);if(!n)return[];const kb=[...n].map(c=>KBD[c]??c).join('');return[...new Set([n,kb])]};
async function pwMatch(input,row){const np=normP(input);for(const cand of(input===np?[input]:[input,np]))if(eq(await hashPw(cand,row.pw_salt),row.pw_hash))return true;return false}

// FCM push: service-account credentials live in Worker secrets (FCM_PROJECT_ID, FCM_CLIENT_EMAIL, FCM_PRIVATE_KEY).
async function gcpToken(env){
  const now=Math.floor(Date.now()/1000);
  const head=b64(enc.encode(JSON.stringify({alg:'RS256',typ:'JWT'})));
  const pay=b64(enc.encode(JSON.stringify({iss:env.FCM_CLIENT_EMAIL,scope:'https://www.googleapis.com/auth/firebase.messaging',aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+3600})));
  const pem=env.FCM_PRIVATE_KEY.replace(/-----[^-]+-----/g,'').replace(/\s/g,'');
  const key=await crypto.subtle.importKey('pkcs8',unb64(pem),{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['sign']);
  const sig=await crypto.subtle.sign('RSASSA-PKCS1-v1_5',key,enc.encode(head+'.'+pay));
  const r=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:'grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion='+head+'.'+pay+'.'+b64(sig)});
  const d=await r.json().catch(()=>({}));
  if(!r.ok||!d.access_token)throw new Error('gcp_auth_failed');
  return d.access_token;
}
async function sendPush(env,u,title,body){
  if(!env.FCM_PRIVATE_KEY||!env.FCM_CLIENT_EMAIL||!env.FCM_PROJECT_ID)return {sent:0,skipped:'no_fcm_config'};
  const rows=u?[await env.DB.prepare('SELECT * FROM push_tokens WHERE u=?').bind(u).first()].filter(Boolean)
    :(await env.DB.prepare('SELECT * FROM push_tokens').all()).results;
  if(!rows.length)return {sent:0,targets:0};
  const at=await gcpToken(env);
  let sent=0;const errs=[];
  for(const r of rows){
    const res=await fetch(`https://fcm.googleapis.com/v1/projects/${env.FCM_PROJECT_ID}/messages:send`,{method:'POST',headers:{'authorization':'Bearer '+at,'content-type':'application/json'},body:JSON.stringify({message:{token:r.token,notification:{title,body},android:{priority:'HIGH'}}})});
    if(res.ok){sent++;continue}
    const d=await res.json().catch(()=>({}));const code=d.error&&d.error.status||('HTTP_'+res.status);
    errs.push({u:r.u,code});
    if(code==='NOT_FOUND'||code==='UNREGISTERED')await env.DB.prepare('DELETE FROM push_tokens WHERE u=?').bind(r.u).run();
  }
  return {sent,targets:rows.length,errors:errs};
}

async function ensureAdmin(env){
  const r=await env.DB.prepare("SELECT 1 FROM users WHERE role='admin' LIMIT 1").first();
  if(r||!env.ADMIN_PASSWORD)return;
  const salt=newSalt();await env.DB.prepare("INSERT OR IGNORE INTO users(u,name,role,pw_hash,pw_salt,created_at) VALUES('admin','مدير التشغيل','admin',?,?,?)").bind(await hashPw(env.ADMIN_PASSWORD,salt),salt,Date.now()).run();
}
async function login(env,req,H){
  const b=await req.json().catch(()=>({}));const p=typeof b.p==='string'?b.p:'';
  const cands=uCands(b.u).filter(c=>c.length<=60);
  if(!cands.length||!p)return J({error:'bad_request'},400,H);
  const ip=req.headers.get('CF-Connecting-IP')||'x',k=cands[0]+'|'+ip,f=await env.DB.prepare('SELECT n,ts FROM login_fail WHERE k=?').bind(k).first();
  if(f&&f.n>=5&&Date.now()-f.ts<15*60e3)return J({error:'too_many_attempts'},429,H);
  await ensureAdmin(env);
  let row=null;for(const c of cands){row=await env.DB.prepare('SELECT * FROM users WHERE u=? AND active=1').bind(c).first();if(row)break}
  const h=await hashPw(normP(p),row?row.pw_salt:newSalt());
  if(!row||!(eq(h,row.pw_hash)||await pwMatch(p,row))){await env.DB.prepare('INSERT INTO login_fail(k,n,ts) VALUES(?,1,?) ON CONFLICT(k) DO UPDATE SET n=CASE WHEN ?-ts>900000 THEN 1 ELSE n+1 END,ts=?').bind(k,Date.now(),Date.now(),Date.now()).run();return J({error:'invalid_credentials'},401,H)}
  await env.DB.prepare('DELETE FROM login_fail WHERE k=?').bind(k).run();
  const token=await sign(env,{u:row.u,role:row.role,exp:Date.now()+14*86400e3});
  return J({token,user:{u:row.u,name:row.name,role:row.role,bus:row.bus,sub:row.sub||null}},200,H);
}
const stateOf=(p,onShift,now)=>(!p||now-p.ts>ONLINE_MS)?(onShift||p?'offline':'off'):p.moving?'moving':'stopped';

async function position(env,me,req,H){
  const b=await req.json().catch(()=>({}));const lat=num(b.lat,-90,90),lon=num(b.lon,-180,180);
  if(lat==null||lon==null)return J({error:'bad_position'},400,H);
  const acc=num(b.acc,0,1e5),bat=num(b.bat,0,100),now=Date.now();
  let speed=num(b.speed,0,300);const prev=await env.DB.prepare('SELECT * FROM positions WHERE u=?').bind(me.u).first();
  const d=prev?dist(prev.lat,prev.lon,lat,lon):0,dt=prev?(now-prev.ts):0;
  if(speed==null)speed=dt>0&&dt<60e3?d/(dt/3600e3):0;
  const moving=speed>MOVE_KMH?1:0;
  const sh=await env.DB.prepare('SELECT * FROM shifts WHERE u=? AND end_ts IS NULL').bind(me.u).first();
  let still=prev?prev.still_ms:0;if(moving)still=0;else if(dt>0&&dt<120e3)still+=dt;
  if(sh){
    let km=0,trips=0;
    if(prev&&(acc==null||acc<80)&&d>0.005&&d<2&&dt<5*60e3)km=d; // ignore jitter and teleports
    if(moving&&prev&&!prev.moving&&prev.still_ms>60e3)trips=1;
    if(km||trips)await env.DB.prepare('UPDATE shifts SET km=km+?,trips=trips+? WHERE id=?').bind(km,trips,sh.id).run();
    await trackPoint(env,sh.id,me.u,now,lat,lon,speed,acc,bat);
  }
  await env.DB.prepare('INSERT INTO positions(u,lat,lon,speed,acc,bat,ts,moving,still_ms) VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(u) DO UPDATE SET lat=?,lon=?,speed=?,acc=?,bat=COALESCE(?,bat),ts=?,moving=?,still_ms=?')
   .bind(me.u,lat,lon,speed,acc,bat,now,moving,still,lat,lon,speed,acc,bat,now,moving,still).run();
  return J({ok:true,ts:now},200,H);
}

let tablesOk=false;
async function ensureTables(env){if(tablesOk)return;
  await env.DB.prepare('CREATE TABLE IF NOT EXISTS consents(id INTEGER PRIMARY KEY AUTOINCREMENT,u TEXT NOT NULL,version TEXT NOT NULL,ts INTEGER NOT NULL,device TEXT)').run();
  await env.DB.prepare('CREATE TABLE IF NOT EXISTS settings(k TEXT PRIMARY KEY,v TEXT)').run();
  await env.DB.prepare('CREATE TABLE IF NOT EXISTS push_tokens(u TEXT PRIMARY KEY,token TEXT NOT NULL,platform TEXT,ts INTEGER NOT NULL)').run();
  await env.DB.prepare('CREATE TABLE IF NOT EXISTS track(shift_id INTEGER NOT NULL,u TEXT NOT NULL,ts INTEGER NOT NULL,lat REAL NOT NULL,lon REAL NOT NULL,speed REAL,acc REAL,bat INTEGER)').run();
  await env.DB.prepare('CREATE INDEX IF NOT EXISTS track_shift ON track(shift_id,ts)').run();
  await env.DB.prepare('CREATE INDEX IF NOT EXISTS track_u ON track(u,ts)').run();
  await env.DB.prepare("UPDATE users SET name=u WHERE role='driver' AND name<>u").run(); // one identifier: the login username is the display name
  tablesOk=true}
// Route replay: store a breadcrumb per open shift, sampled to ~1 point per 8s or 15m of movement.
async function trackPoint(env,shId,u,ts,lat,lon,speed,acc,bat){
  await ensureTables(env);
  const last=await env.DB.prepare('SELECT ts,lat,lon FROM track WHERE shift_id=? ORDER BY ts DESC LIMIT 1').bind(shId).first();
  if(last&&ts-last.ts<8000&&dist(last.lat,last.lon,lat,lon)<0.015)return;
  await env.DB.prepare('INSERT INTO track(shift_id,u,ts,lat,lon,speed,acc,bat) VALUES(?,?,?,?,?,?,?,?)').bind(shId,u,ts,lat,lon,speed,acc,bat).run();
}
const CONSENT_V='2';
async function getSettings(env){await ensureTables(env);const r=await env.DB.prepare('SELECT k,v FROM settings').all();const m={};r.results.forEach(x=>m[x.k]=x.v);
  return {pingSec:Math.min(300,Math.max(5,parseInt(m.pingSec)||15)),flushSec:Math.min(120,Math.max(10,parseInt(m.flushSec)||30))}}
async function positionsBatch(env,me,req,H){
  const b=await req.json().catch(()=>({}));const now=Date.now();
  const n2=(v,a,c)=>v==null?null:num(v,a,c);
  const pts=(Array.isArray(b.points)?b.points.slice(-300):[]).map(p=>({lat:n2(p?.lat,-90,90),lon:n2(p?.lon,-180,180),speed:n2(p?.speed,0,300),acc:n2(p?.acc,0,1e5),bat:n2(p?.bat,0,100),ts:Math.min(now,Math.max(now-864e5,Number(p?.ts)||now))}))
    .filter(p=>p.lat!=null&&p.lon!=null).sort((x,y)=>x.ts-y.ts);
  if(!pts.length)return J({error:'bad_position'},400,H);
  const prev=await env.DB.prepare('SELECT * FROM positions WHERE u=?').bind(me.u).first();
  const sh=await env.DB.prepare('SELECT * FROM shifts WHERE u=? AND end_ts IS NULL').bind(me.u).first();
  let pl=prev?{lat:prev.lat,lon:prev.lon,ts:prev.ts,moving:prev.moving,still:prev.still_ms}:null,still=prev?prev.still_ms:0,km=0,trips=0,used=0,bat=null,speed=0,acc=null;
  for(const p of pts){
    if(pl&&p.ts<=pl.ts)continue;
    const dt=pl?p.ts-pl.ts:0,d=pl?dist(pl.lat,pl.lon,p.lat,p.lon):0;
    let sp=p.speed;if(sp==null)sp=dt>0&&dt<60e3?d/(dt/3600e3):0;
    const moving=sp>MOVE_KMH?1:0;
    if(moving)still=0;else if(dt>0&&dt<120e3)still+=dt;
    if(sh&&pl&&(p.acc==null||p.acc<80)&&d>0.005&&d<2&&dt<5*60e3)km+=d;
    if(sh&&moving&&pl&&!pl.moving&&pl.still>60e3)trips++;
    pl={lat:p.lat,lon:p.lon,ts:p.ts,moving,still};speed=sp;acc=p.acc;if(p.bat!=null)bat=p.bat;used++;
    if(sh)await trackPoint(env,sh.id,me.u,p.ts,p.lat,p.lon,sp,p.acc,p.bat);
  }
  if(!used)return J({ok:true,used:0,ts:prev?prev.ts:now},200,H);
  if(sh&&(km||trips))await env.DB.prepare('UPDATE shifts SET km=km+?,trips=trips+? WHERE id=?').bind(km,trips,sh.id).run();
  await env.DB.prepare('INSERT INTO positions(u,lat,lon,speed,acc,bat,ts,moving,still_ms) VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(u) DO UPDATE SET lat=?,lon=?,speed=?,acc=?,bat=COALESCE(?,bat),ts=?,moving=?,still_ms=?')
   .bind(me.u,pl.lat,pl.lon,speed,acc,bat,pl.ts,pl.moving,still,pl.lat,pl.lon,speed,acc,bat,pl.ts,pl.moving,still).run();
  return J({ok:true,used,ts:pl.ts},200,H);
}
// Auto-close forgotten open shifts (driver closed the app without handing over).
// end_ts is capped at start+STALE_MS so reports never count days of fake overtime.
let shiftColsOk=false;
async function ensureShiftCols(env){
  if(shiftColsOk)return;
  try{await env.DB.prepare('ALTER TABLE shifts ADD COLUMN auto_closed INTEGER NOT NULL DEFAULT 0').run()}catch(_){}
  try{await env.DB.prepare('ALTER TABLE shifts ADD COLUMN reviewed INTEGER NOT NULL DEFAULT 0').run()}catch(_){}
  shiftColsOk=true;
}
async function closeStaleShifts(env,u){
  await ensureShiftCols(env);
  const now=Date.now();
  if(u)await env.DB.prepare('UPDATE shifts SET end_ts=start_ts+?,auto_closed=1 WHERE u=? AND end_ts IS NULL AND start_ts<?').bind(STALE_MS,u,now-STALE_MS).run();
  else await env.DB.prepare('UPDATE shifts SET end_ts=start_ts+?,auto_closed=1 WHERE end_ts IS NULL AND start_ts<?').bind(STALE_MS,now-STALE_MS).run();
}
// One-time guards: close duplicate open shifts (keep newest per user and per bus), then
// unique partial indexes make a second open shift per user or per bus impossible at the DB level,
// so two commands racing at the same moment can never create conflicting states.
let shiftGuardsOk=false;
async function shiftGuards(env){
  if(shiftGuardsOk)return;
  const now=Date.now();
  await closeStaleShifts(env);
  await env.DB.prepare('UPDATE shifts SET end_ts=? WHERE end_ts IS NULL AND id<(SELECT MAX(id) FROM shifts s2 WHERE s2.u=shifts.u AND s2.end_ts IS NULL)').bind(now).run();
  await env.DB.prepare('UPDATE shifts SET end_ts=? WHERE end_ts IS NULL AND id<(SELECT MAX(id) FROM shifts s2 WHERE s2.bus=shifts.bus AND s2.end_ts IS NULL)').bind(now).run();
  try{await env.DB.prepare('CREATE UNIQUE INDEX IF NOT EXISTS shifts_open_u ON shifts(u) WHERE end_ts IS NULL').run()}catch(_){ }
  try{await env.DB.prepare('CREATE UNIQUE INDEX IF NOT EXISTS shifts_open_bus ON shifts(bus) WHERE end_ts IS NULL').run()}catch(_){ }
  shiftGuardsOk=true;
}
async function meInfo(env,me){
  await closeStaleShifts(env,me.u);
  const u=await env.DB.prepare('SELECT u,name,phone,role,bus,sub FROM users WHERE u=?').bind(me.u).first();
  const shift=await env.DB.prepare('SELECT id,bus,start_ts,km,trips FROM shifts WHERE u=? AND end_ts IS NULL').bind(me.u).first();
  const last=await env.DB.prepare('SELECT bus,start_ts,end_ts,km,trips,auto_closed,reviewed FROM shifts WHERE u=? AND end_ts IS NOT NULL ORDER BY start_ts DESC LIMIT 5').bind(me.u).all();
  const buses=await env.DB.prepare('SELECT id,label FROM buses WHERE active=1 ORDER BY id').all();
  return {user:u,shift,last:last.results,buses:buses.results,now:Date.now()};
}
async function fleet(env){
  await closeStaleShifts(env);
  const now=Date.now();
  const rows=await env.DB.prepare(`SELECT u.u,u.name,u.phone,u.bus,p.lat,p.lon,p.speed,p.bat,p.ts,p.moving,s.id sid,s.bus sbus,s.start_ts,s.km,s.trips
   FROM users u LEFT JOIN positions p ON p.u=u.u LEFT JOIN shifts s ON s.u=u.u AND s.end_ts IS NULL WHERE u.role='driver' AND u.active=1 ORDER BY u.name`).all();
  return {now,drivers:rows.results.map(r=>({u:r.u,name:r.name,phone:r.phone,bus:r.sbus||r.bus,state:stateOf(r.lat!=null?r:null,!!r.sid,now),lat:r.lat,lon:r.lon,onShift:!!r.sid,speed:r.speed||0,bat:r.bat,lastSeen:r.ts,shiftStart:r.start_ts,km:r.km||0,trips:r.trips||0,elapsedMs:r.start_ts?now-r.start_ts:0}))};
}
async function report(env,month){
  if(!/^\d{4}-\d{2}$/.test(month))return null;
  await ensureShiftCols(env);
  const [y,m]=month.split('-').map(Number);
  const tz=3*3600e3; // Asia/Riyadh, UTC+3 all year
  const from=Date.UTC(y,m-1,1)-tz,to=Date.UTC(y,m,1)-tz;
  const rows=await env.DB.prepare('SELECT id,u,bus,start_ts,end_ts,km,trips,auto_closed,reviewed FROM shifts WHERE end_ts IS NOT NULL AND start_ts>=? AND start_ts<? ORDER BY start_ts').bind(from,to).all();
  const users=await env.DB.prepare("SELECT u,name FROM users WHERE role='driver'").all();
  // Auto-closed shifts (forgotten handover, end time is a guess) stay out of the final
  // totals until a manager confirms them; they are returned flagged as pending instead.
  return {month,drivers:users.results.map(d=>{
    const all=rows.results.filter(s=>s.u===d.u).map(s=>({id:s.id,bus:s.bus,start:s.start_ts,end:s.end_ts,km:s.km,trips:s.trips,autoClosed:!!s.auto_closed,reviewed:!!s.reviewed,pending:!!(s.auto_closed&&!s.reviewed),overtimeMs:Math.max(0,s.end_ts-s.start_ts-H8)}));
    const fin=all.filter(s=>!s.pending),pend=all.filter(s=>s.pending);
    return {u:d.u,name:d.name,days:fin.length,totalMs:fin.reduce((a,s)=>a+s.end-s.start,0),overtimeMs:fin.reduce((a,s)=>a+s.overtimeMs,0),overtimeDays:fin.filter(s=>s.overtimeMs>0).length,km:fin.reduce((a,s)=>a+s.km,0),pending:pend.length,pendingMs:pend.reduce((a,s)=>a+s.end-s.start,0),pendingOvertimeMs:pend.reduce((a,s)=>a+s.overtimeMs,0),shifts:all}})};
}
export default {
  async fetch(req,env){
    const H=cors(env,req),url=new URL(req.url),path=url.pathname.replace(/\/+$/,'')||'/';
    if(req.method==='OPTIONS')return new Response(null,{status:204,headers:H});
    try{
      if(!env.JWT_SECRET)return J({error:'server_not_configured'},500,H);
      if(path==='/api/health')return J({ok:true},200,H);
      if(path==='/api/login'&&req.method==='POST')return await login(env,req,H);
      const me=await verify(env,(req.headers.get('authorization')||'').replace(/^Bearer /,''));
      if(!me)return J({error:'unauthorized'},401,H);
      const live=await env.DB.prepare('SELECT active,role,sub FROM users WHERE u=?').bind(me.u).first();
      if(!live||!live.active)return J({error:'unauthorized'},401,H);
      me.role=live.role;me.sub=live.sub;
      if(me.sub==='viewer'&&req.method!=='GET'&&path!=='/api/me/password')return J({error:'forbidden'},403,H); // view-only tier
      const adminOnly=()=>me.role==='admin'?null:J({error:'forbidden'},403,H);
      if(path==='/api/me'&&req.method==='GET')return J(await meInfo(env,me),200,H);
      if(path==='/api/positions'&&req.method==='POST')return me.role==='driver'?await positionsBatch(env,me,req,H):J({error:'forbidden'},403,H);
      if(path==='/api/config'&&req.method==='GET'){const st=await getSettings(env);const c=await env.DB.prepare('SELECT ts FROM consents WHERE u=? AND version=? ORDER BY ts DESC LIMIT 1').bind(me.u,CONSENT_V).first();return J({...st,consentVersion:CONSENT_V,consented:!!c,consentTs:c?c.ts:null},200,H)}
      if(path==='/api/consent'&&req.method==='POST'){await ensureTables(env);const b=await req.json().catch(()=>({}));if(b.version!==CONSENT_V)return J({error:'bad_request'},400,H);
        await env.DB.prepare('INSERT INTO consents(u,version,ts,device) VALUES(?,?,?,?)').bind(me.u,CONSENT_V,Date.now(),String(b.device||'').slice(0,120)).run();return J({ok:true},200,H)}
      if(path==='/api/consents'&&req.method==='GET'){const e=adminOnly();if(e)return e;await ensureTables(env);const r=await env.DB.prepare('SELECT u,version,MAX(ts) ts,device FROM consents GROUP BY u').all();return J({consents:r.results},200,H)}
      if(path==='/api/settings'&&req.method==='PUT'){const e=adminOnly();if(e)return e;await ensureTables(env);const b=await req.json().catch(()=>({}));
        const ps=parseInt(b.pingSec);if(!(ps>=5&&ps<=300))return J({error:'bad_request'},400,H);
        await env.DB.prepare('INSERT INTO settings(k,v) VALUES(?,?) ON CONFLICT(k) DO UPDATE SET v=?').bind('pingSec',String(ps),String(ps)).run();return J({ok:true,...await getSettings(env)},200,H)}
      if(path==='/api/position'&&req.method==='POST')return me.role==='driver'?await position(env,me,req,H):J({error:'forbidden'},403,H);
      if(path==='/api/shift/start'&&req.method==='POST'){
        if(me.role!=='driver')return J({error:'forbidden'},403,H);
        const b=await req.json().catch(()=>({}));const bus=str(b.bus,40);if(!bus)return J({error:'bus_required'},400,H);
        await shiftGuards(env);await closeStaleShifts(env);await ensureTables(env);
        await env.DB.prepare('DELETE FROM track WHERE ts<?').bind(Date.now()-90*864e5).run(); // route history retention: 90 days
        const open=await env.DB.prepare('SELECT id FROM shifts WHERE u=? AND end_ts IS NULL').bind(me.u).first();if(open)return J({error:'shift_already_open'},409,H);
        const busy=await env.DB.prepare('SELECT u FROM shifts WHERE bus=? AND end_ts IS NULL').bind(bus).first();if(busy)return J({error:'bus_in_use'},409,H);
        try{await env.DB.prepare('INSERT INTO shifts(u,bus,start_ts) VALUES(?,?,?)').bind(me.u,bus,Date.now()).run()}
        catch(_){// lost a race: the unique index rejected a simultaneous double command
          const o2=await env.DB.prepare('SELECT id FROM shifts WHERE u=? AND end_ts IS NULL').bind(me.u).first();
          return J({error:o2?'shift_already_open':'bus_in_use'},409,H)}
        return J(await meInfo(env,me),200,H);
      }
      if(path==='/api/shift/end'&&req.method==='POST'){
        if(me.role!=='driver')return J({error:'forbidden'},403,H);
        const sh=await env.DB.prepare('SELECT * FROM shifts WHERE u=? AND end_ts IS NULL').bind(me.u).first();
        if(!sh){// idempotent: a repeated handover (double tap, retry) returns the same success instead of an error
          const recent=await env.DB.prepare('SELECT * FROM shifts WHERE u=? AND end_ts IS NOT NULL ORDER BY end_ts DESC LIMIT 1').bind(me.u).first();
          if(recent&&Date.now()-recent.end_ts<120e3)return J({...(await meInfo(env,me)),ended:{start_ts:recent.start_ts,end_ts:recent.end_ts,overtimeMs:Math.max(0,recent.end_ts-recent.start_ts-H8)},alreadyEnded:true},200,H);
          return J({error:'no_open_shift'},409,H)}
        const end=Date.now();await env.DB.prepare('UPDATE shifts SET end_ts=? WHERE id=?').bind(end,sh.id).run();
        return J({...(await meInfo(env,me)),ended:{start_ts:sh.start_ts,end_ts:end,overtimeMs:Math.max(0,end-sh.start_ts-H8)}},200,H);
      }
      if(path==='/api/me/password'&&req.method==='POST'){
        if(me.role!=='admin')return J({error:'forbidden'},403,H);
        const b=await req.json().catch(()=>({}));const cur=typeof b.current==='string'?b.current:'',np=normP(b.password);
        if(np.length<PW_MIN)return J({error:'password_too_short'},400,H);
        const row=await env.DB.prepare('SELECT * FROM users WHERE u=?').bind(me.u).first();
        if(!row||!await pwMatch(cur,row))return J({error:'wrong_password'},403,H);
        const salt=newSalt();await env.DB.prepare('UPDATE users SET pw_hash=?,pw_salt=? WHERE u=?').bind(await hashPw(np,salt),salt,me.u).run();
        return J({ok:true},200,H);
      }
      let f;if(f=adminOnly())return f;
      if(path==='/api/manager'&&req.method==='GET'){
        if(me.sub)return J({error:'forbidden'},403,H);
        return J({manager:await env.DB.prepare("SELECT u,name,active FROM users WHERE sub='manager'").first()},200,H);
      }
      if(path==='/api/manager'&&req.method==='PUT'){
        if(me.sub)return J({error:'forbidden'},403,H);
        const b=await req.json().catch(()=>({}));const cur=await env.DB.prepare("SELECT u FROM users WHERE sub='manager'").first();
        const u=normU(b.u)||cur?.u,name=str(b.name,80)||'مدير التشغيل',pw=normP(b.password);
        if(!u||u.length>40||!/^[a-z0-9._-]+$/.test(u)||u==='admin')return J({error:'bad_request'},400,H);
        if(cur&&u!==cur.u&&await env.DB.prepare('SELECT 1 FROM users WHERE u=?').bind(u).first())return J({error:'exists'},409,H);
        if(!cur){if(pw.length<PW_MIN)return J({error:'password_too_short'},400,H);
          if(await env.DB.prepare('SELECT 1 FROM users WHERE u=?').bind(u).first())return J({error:'exists'},409,H);
          const salt=newSalt();await env.DB.prepare("INSERT INTO users(u,name,role,sub,pw_hash,pw_salt,created_at) VALUES(?,?,'admin','manager',?,?,?)").bind(u,name,await hashPw(pw,salt),salt,Date.now()).run();return J({ok:true,created:true},201,H)}
        if(pw&&pw.length<PW_MIN)return J({error:'password_too_short'},400,H);
        await env.DB.prepare("UPDATE users SET u=?,name=?,active=1 WHERE sub='manager'").bind(u,name).run();
        if(pw){const salt=newSalt();await env.DB.prepare("UPDATE users SET pw_hash=?,pw_salt=? WHERE sub='manager'").bind(await hashPw(pw,salt),salt).run()}
        return J({ok:true},200,H);
      }
      if(path==='/api/manager'&&req.method==='DELETE'){
        if(me.sub)return J({error:'forbidden'},403,H);
        await env.DB.prepare("DELETE FROM users WHERE sub='manager'").run();return J({ok:true},200,H);
      }
      if(path==='/api/admins'&&req.method==='GET'){
        if(me.sub)return J({error:'forbidden'},403,H);
        return J({admins:(await env.DB.prepare("SELECT u,name,sub,active,created_at FROM users WHERE role='admin' ORDER BY created_at").all()).results},200,H);
      }
      if(path==='/api/admins'&&req.method==='POST'){
        if(me.sub)return J({error:'forbidden'},403,H);
        const b=await req.json().catch(()=>({}));const u=normU(b.u),name=str(b.name,80),pw=normP(b.password);
        const level=b.level==='viewer'?'viewer':'manager';
        if(!u||u.length>40||!/^[a-z0-9._-]+$/.test(u)||u==='admin'||!name||pw.length<PW_MIN)return J({error:'bad_request'},400,H);
        if(await env.DB.prepare('SELECT 1 FROM users WHERE u=?').bind(u).first())return J({error:'exists'},409,H);
        const salt=newSalt();await env.DB.prepare("INSERT INTO users(u,name,role,sub,pw_hash,pw_salt,created_at) VALUES(?,?,'admin',?,?,?,?)").bind(u,name,level,await hashPw(pw,salt),salt,Date.now()).run();
        return J({ok:true,created:true},201,H);
      }
      const ma=path.match(/^\/api\/admins\/([a-z0-9._-]+)$/);
      if(ma&&(req.method==='PATCH'||req.method==='DELETE')){
        if(me.sub)return J({error:'forbidden'},403,H);
        const u=ma[1];
        const row=await env.DB.prepare("SELECT u FROM users WHERE u=? AND role='admin'").bind(u).first();
        if(!row)return J({error:'not_found'},404,H);
        if(u==='admin'||u===me.u)return J({error:'protected'},400,H);
        if(req.method==='DELETE'){await env.DB.prepare("DELETE FROM users WHERE u=? AND role='admin'").bind(u).run();return J({ok:true},200,H)}
        const b=await req.json().catch(()=>({}));
        if(typeof b.password==='string'&&b.password){const np=normP(b.password);if(np.length<PW_MIN)return J({error:'password_too_short'},400,H);const salt=newSalt();await env.DB.prepare('UPDATE users SET pw_hash=?,pw_salt=? WHERE u=?').bind(await hashPw(np,salt),salt,u).run()}
        if(b.name!==undefined&&str(b.name,80))await env.DB.prepare('UPDATE users SET name=? WHERE u=?').bind(str(b.name,80),u).run();
        if(b.active!==undefined)await env.DB.prepare('UPDATE users SET active=? WHERE u=?').bind(b.active?1:0,u).run();
        if(b.level==='manager'||b.level==='viewer')await env.DB.prepare('UPDATE users SET sub=? WHERE u=?').bind(b.level,u).run();
        return J({ok:true},200,H);
      }
      if(path==='/api/fleet'&&req.method==='GET')return J(await fleet(env),200,H);
      if(path==='/api/report'&&req.method==='GET'){const r=await report(env,url.searchParams.get('month')||'');return r?J(r,200,H):J({error:'bad_month'},400,H)}
      if(path==='/api/shifts'&&req.method==='GET'){const du=url.searchParams.get('u')||'';if(!/^[a-z0-9._-]+$/.test(du))return J({error:'bad_request'},400,H);await ensureShiftCols(env);
        return J({shifts:(await env.DB.prepare('SELECT id,u,bus,start_ts,end_ts,km,trips,auto_closed,reviewed FROM shifts WHERE u=? AND end_ts IS NOT NULL ORDER BY start_ts DESC LIMIT 30').bind(du).all()).results},200,H)}
      if(path==='/api/track'&&req.method==='GET'){await ensureTables(env);const id=+url.searchParams.get('shift')||0;
        const sh=await env.DB.prepare('SELECT id,u,bus,start_ts,end_ts FROM shifts WHERE id=?').bind(id).first();if(!sh)return J({error:'not_found'},404,H);
        const usr=await env.DB.prepare('SELECT name FROM users WHERE u=?').bind(sh.u).first();
        const pts=(await env.DB.prepare('SELECT ts,lat,lon,speed FROM track WHERE shift_id=? ORDER BY ts').bind(id).all()).results;
        return J({shift:{id:sh.id,u:sh.u,name:usr?usr.name:sh.u,bus:sh.bus,start_ts:sh.start_ts,end_ts:sh.end_ts},points:pts.map(p=>[p.ts,p.lat,p.lon,Math.round((p.speed||0)*10)/10])},200,H)}
      if(path==='/api/drivers'&&req.method==='GET')return J((await env.DB.prepare("SELECT u,name,phone,bus,active FROM users WHERE role='driver' ORDER BY name").all()).results,200,H);
      if(path==='/api/drivers'&&req.method==='POST'){
        const b=await req.json().catch(()=>({}));const u=normU(b.u),pw=normP(b.password);
        if(!u||u.length>40||!/^[a-z0-9._-]+$/.test(u)||pw.length<PW_MIN)return J({error:'bad_request',hint:'username a-z0-9._-, password >= 4 chars'},400,H);
        const salt=newSalt();
        try{await env.DB.prepare("INSERT INTO users(u,name,phone,role,pw_hash,pw_salt,bus,created_at) VALUES(?,?,?, 'driver',?,?,?,?)").bind(u,u,str(b.phone,20),await hashPw(pw,salt),salt,str(b.bus,40),Date.now()).run()}catch(_){return J({error:'username_taken'},409,H)}
        return J({ok:true},201,H);
      }
      const m=path.match(/^\/api\/drivers\/([a-z0-9._-]+)$/);
      if(m&&req.method==='PATCH'){
        const b=await req.json().catch(()=>({}));const u=m[1];
        if(typeof b.password==='string'){const np=normP(b.password);if(np.length<PW_MIN)return J({error:'password_too_short'},400,H);const salt=newSalt();await env.DB.prepare("UPDATE users SET pw_hash=?,pw_salt=? WHERE u=? AND role='driver'").bind(await hashPw(np,salt),salt,u).run()}
        if(b.phone!==undefined)await env.DB.prepare("UPDATE users SET phone=? WHERE u=? AND role='driver'").bind(str(b.phone,20),u).run();
        if(b.bus!==undefined)await env.DB.prepare("UPDATE users SET bus=? WHERE u=? AND role='driver'").bind(str(b.bus,40),u).run();
        if(b.active!==undefined)await env.DB.prepare("UPDATE users SET active=? WHERE u=? AND role='driver'").bind(b.active?1:0,u).run();
        return J({ok:true},200,H);
      }
      if(m&&req.method==='DELETE'){
        const u=m[1];const row=await env.DB.prepare("SELECT u FROM users WHERE u=? AND role='driver'").bind(u).first();if(!row)return J({error:'not_found'},404,H);
        if(await env.DB.prepare('SELECT 1 FROM shifts WHERE u=? AND end_ts IS NULL').bind(u).first())return J({error:'shift_open'},409,H);
        await env.DB.prepare('DELETE FROM shifts WHERE u=?').bind(u).run();await env.DB.prepare('DELETE FROM positions WHERE u=?').bind(u).run();await env.DB.prepare('DELETE FROM track WHERE u=?').bind(u).run();
        await env.DB.prepare("DELETE FROM users WHERE u=? AND role='driver'").bind(u).run();return J({ok:true},200,H);
      }
      if(path==='/api/buses'&&req.method==='POST'){const b=await req.json().catch(()=>({}));const id=str(b.id,40);if(!id)return J({error:'bad_request'},400,H);await env.DB.prepare('INSERT OR REPLACE INTO buses(id,label,active) VALUES(?,?,1)').bind(id,str(b.label,80)).run();return J({ok:true},201,H)}
      if(path==='/api/push/register'&&req.method==='POST'){const b=await req.json().catch(()=>({}));const token=str(b.token,400);if(!token)return J({error:'bad_request'},400,H);await ensureTables(env);await env.DB.prepare('INSERT INTO push_tokens(u,token,platform,ts) VALUES(?,?,?,?) ON CONFLICT(u) DO UPDATE SET token=excluded.token,platform=excluded.platform,ts=excluded.ts').bind(me.u,token,str(b.platform,20)||null,Date.now()).run();return J({ok:true},201,H)}
      if(path==='/api/push/register'&&req.method==='DELETE'){await ensureTables(env);await env.DB.prepare('DELETE FROM push_tokens WHERE u=?').bind(me.u).run();return J({ok:true},200,H)}
      if(path==='/api/push/send'&&req.method==='POST'){const e=adminOnly();if(e)return e;await ensureTables(env);const b=await req.json().catch(()=>({}));const title=str(b.title,120),body=str(b.body,400);if(!title||!body)return J({error:'bad_request'},400,H);try{return J(await sendPush(env,b.u?str(b.u,60):null,title,body),200,H)}catch(err){return J({error:String(err.message||'push_failed')},502,H)}}
      if(path==='/api/shifts/review'&&req.method==='POST'){const e=adminOnly();if(e)return e;await ensureShiftCols(env);const b=await req.json().catch(()=>({}));const id=Number(b.id);if(!Number.isInteger(id))return J({error:'bad_request'},400,H);const sh=await env.DB.prepare('SELECT id FROM shifts WHERE id=? AND auto_closed=1').bind(id).first();if(!sh)return J({error:'not_found'},404,H);await env.DB.prepare('UPDATE shifts SET reviewed=1 WHERE id=?').bind(id).run();return J({ok:true},200,H)}
      return J({error:'not_found'},404,H);
    }catch(e){return J({error:'server_error'},500,H)}
  }
};
