// Local test: D1 shim over node:sqlite
import {DatabaseSync} from 'node:sqlite';import fs from 'node:fs';import worker from './src/index.js';
const db=new DatabaseSync(':memory:');db.exec(fs.readFileSync('schema.sql','utf8'));
const mk=sql=>{const s=db.prepare(sql);return{bind:(...a)=>({first:async()=>s.get(...a)??null,all:async()=>({results:s.all(...a)}),run:async()=>s.run(...a)}),first:async()=>s.get()??null,all:async()=>({results:s.all()}),run:async()=>s.run()}};
const env={DB:{prepare:mk},JWT_SECRET:'test-secret',ADMIN_PASSWORD:'adminpass123',ALLOWED_ORIGIN:'https://x.github.io'};
const call=async(m,p,body,tok)=>{const r=await worker.fetch(new Request('https://api.test'+p,{method:m,headers:{'content-type':'application/json',...(tok?{authorization:'Bearer '+tok}:{}),Origin:'https://x.github.io'},body:body?JSON.stringify(body):undefined}),env);return{s:r.status,b:await r.json()}};
let ok=true;const t=(n,c)=>{console.log(c?'PASS':'FAIL',n);if(!c)ok=false};
let r=await call('POST','/api/login',{u:'admin',p:'wrong'});t('bad login 401',r.s===401);
r=await call('POST','/api/login',{u:'admin',p:'adminpass123'});t('admin login',r.s===200&&r.b.user.role==='admin');const A=r.b.token;
r=await call('GET','/api/fleet');t('no token 401',r.s===401);
r=await call('POST','/api/drivers',{u:'d1',name:'Test',password:'short'},A);t('short pw rejected',r.s===400);
r=await call('POST','/api/drivers',{u:'d1',name:'Test Driver',phone:'0500000000',bus:'B-1',password:'longenough1'},A);t('create driver',r.s===201);
await call('POST','/api/buses',{id:'B-1'},A);
r=await call('POST','/api/login',{u:'d1',p:'longenough1'});t('driver login',r.s===200);const D=r.b.token;
r=await call('GET','/api/fleet',null,D);t('driver cannot read fleet',r.s===403);
r=await call('POST','/api/shift/start',{bus:'B-1'},D);t('start shift',r.s===200&&r.b.shift);
r=await call('POST','/api/shift/start',{bus:'B-1'},D);t('double start 409',r.s===409);
let lat=24.7;for(let i=0;i<4;i++){r=await call('POST','/api/position',{lat:lat+=0.001,lon:46.7,speed:30,bat:77,acc:10},D);}
r=await call('GET','/api/fleet',null,A);const d=r.b.drivers[0];t('fleet moving, km, battery',d.state==='moving'&&d.km>0.2&&d.bat===77);
db.prepare('UPDATE shifts SET start_ts=start_ts-?').run(9*3600e3);
r=await call('POST','/api/shift/end',null,D);t('end shift w/ ~1h overtime',r.s===200&&Math.abs(r.b.ended.overtimeMs-3600e3)<5000);
const mo=new Date(Date.now()+3*3600e3).toISOString().slice(0,7);
r=await call('GET','/api/report?month='+mo,null,A);t('report overtime',r.s===200&&r.b.drivers[0].overtimeDays===1);
r=await call('POST','/api/position',{lat:1,lon:1},A);t('admin cannot post position',r.s===403);
for(let i=0;i<6;i++)r=await call('POST','/api/login',{u:'d1',p:'nope'});t('lockout 429',r.s===429);
const o=await worker.fetch(new Request('https://api.test/api/fleet',{method:'OPTIONS',headers:{Origin:'https://x.github.io'}}),env);t('cors preflight',o.status===204&&o.headers.get('Access-Control-Allow-Origin')==='https://x.github.io');
r=await call('POST','/api/position',{lat:24.7,lon:46.7,speed:0},D);t('position refused after checkout',r.b.ok===false);
r=await call('GET','/api/fleet',null,A);t('no location after checkout',r.b.drivers[0].lat===null&&r.b.drivers[0].state==='off');
process.exit(ok?0:1);
