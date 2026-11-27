(()=>{
const D=window.BT_DEMO,$=(s,r=document)=>r.querySelector(s),LS=localStorage;
const H8=8*3600e3;
const jget=(k,d)=>{try{return JSON.parse(LS.getItem(k))??d}catch(_){return d}};
const jset=(k,v)=>LS.setItem(k,JSON.stringify(v));
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pad=n=>String(n).padStart(2,'0');
const hms=ms=>{ms=Math.max(0,Math.floor(ms/1000));return pad(Math.floor(ms/3600))+':'+pad(Math.floor(ms%3600/60))+':'+pad(ms%60)};
const hm=ms=>{const m=Math.round(ms/60000),h=Math.floor(m/60),r=m%60;if(LANGX==='en')return h?h+'h'+(r?' '+r+'m':''):m+'m';return h?h+' س'+(r?' '+r+' د':''):m+' د'};
const fdate=t=>new Date(t).toLocaleDateString(LANGX==='en'?'en-GB':'ar-SA-u-ca-gregory',{weekday:'short',day:'numeric',month:'short'});
const ftime=t=>new Date(t).toLocaleTimeString(LANGX==='en'?'en-GB':'ar-SA',{hour:'2-digit',minute:'2-digit'});
const toast=t=>{const e=$('#toast');e.textContent=t;e.classList.add('on');clearTimeout(toast.h);toast.h=setTimeout(()=>e.classList.remove('on'),2600)};
const toRad=x=>x*Math.PI/180;
const dist=(a,b)=>{const R=6371,dl=toRad(b[0]-a[0]),dn=toRad(b[1]-a[1]);const x=Math.sin(dl/2)**2+Math.cos(toRad(a[0]))*Math.cos(toRad(b[0]))*Math.sin(dn/2)**2;return 2*R*Math.asin(Math.sqrt(x))}; // km
const drv=u=>D.drivers.find(d=>d.u===u);
const NATIVE=!!(window.Capacitor&&window.Capacitor.isNativePlatform&&window.Capacitor.isNativePlatform());
let pushReg=false;
async function regPush(){
  if(pushReg||!NATIVE||!LIVE)return;pushReg=true;
  const P=window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.PushNotifications;if(!P)return;
  try{
    P.addListener('registration',t=>{api('/api/push/register',{method:'POST',body:{token:t.value,platform:'android'}}).catch(()=>{})});
    P.addListener('registrationError',()=>{});
    let p=await P.checkPermissions();if(p.receive!=='granted')p=await P.requestPermissions();
    if(p.receive==='granted')await P.register();
  }catch(_){}
}

const APK_URL='https://github.com/wazer14/bus-tracker/releases/latest/download/bus-tracker.apk';
const API=(window.BT_CONFIG&&window.BT_CONFIG.API_BASE||'').replace(/\/+$/,''),LIVE=!!API;
async function api(path,opt={}){
  const r=await fetch(API+path,{method:opt.method||'GET',headers:{'content-type':'application/json',...(session?.token?{authorization:'Bearer '+session.token}:{})},body:opt.body?JSON.stringify(opt.body):undefined});
  const j=await r.json().catch(()=>({}));
  if(r.status===401&&session&&path!=='/api/login'){LS.removeItem('bt.session');session=null;loginView('انتهت الجلسة. سجّل دخولك من جديد');throw new Error('unauth')}
  if(!r.ok)throw Object.assign(new Error(j.error||'error'),{code:j.error,status:r.status});return j;
}
const ERR={invalid_credentials:'اسم المستخدم أو كلمة المرور غير صحيحة',too_many_attempts:'محاولات كثيرة. حاول بعد 15 دقيقة',bus_in_use:'هذا الباص مستخدم عند سائق آخر',shift_already_open:'عندك دوام مفتوح',no_open_shift:'الدوام مقفل مسبقًا',username_taken:'اسم المستخدم مستخدم',bad_request:'بيانات غير صحيحة'};
const errMsg=e=>ERR[e.code]||(e.status?'تعذر تنفيذ الطلب':'لا يوجد اتصال بالخادم');
const BIO=NATIVE&&window.Capacitor.Plugins&&window.Capacitor.Plugins.BioAuth||null;
const unorm=v=>String(v||'').normalize('NFKC').replace(/[٠-٩]/g,c=>'٠١٢٣٤٥٦٧٨٩'.indexOf(c)).replace(/[۰-۹]/g,c=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(c)).trim().toLowerCase();
async function bioOffer(u,p){
  if(!BIO||LS.getItem('bt.bio.no')==='1')return;
  try{const h=await BIO.has();if(h&&h.ok)return;const av=await BIO.available();if(!av||!av.ok)return;
    if(!confirm(LANGX==='en'?'Enable fingerprint sign-in on this device?\nYou will open the app with your fingerprint instead of typing your username and password.':'تفعيل الدخول بالبصمة على هذا الجهاز؟\nبتفتح التطبيق بعدها ببصمتك بدون كتابة اسم المستخدم وكلمة المرور.')){LS.setItem('bt.bio.no','1');return}
    await BIO.save({u,p});toast(LANGX==='en'?'Fingerprint sign-in enabled':'تم تفعيل الدخول بالبصمة')}catch(_){}}
async function bioGate(){
  if(!BIO)return;
  let h=null;try{h=await BIO.has()}catch(_){}
  if(!h||!h.ok)return;
  $('#lf').insertAdjacentHTML('beforeend','<button type="button" class="btn gold" id="bio" style="width:100%;margin-top:10px">'+(LANGX==='en'?'🔓 Sign in with fingerprint':'🔓 دخول بالبصمة')+'</button><button type="button" class="btn sm ghost" id="biooff" style="width:100%;margin-top:8px">'+(LANGX==='en'?'Turn off fingerprint sign-in on this device':'إيقاف الدخول بالبصمة على هذا الجهاز')+'</button>');
  $('#biooff').onclick=async()=>{try{await BIO.clear()}catch(_){}LS.setItem('bt.bio.no','1');toast(LANGX==='en'?'Fingerprint sign-in turned off':'تم إيقاف الدخول بالبصمة');const b=$('#bio');b&&b.remove();const o=$('#biooff');o&&o.remove()};
  const go=async()=>{let c;try{c=await BIO.unlock({lang:LANGX})}catch(e){if(!e||e.message!=='cancelled')$('#er').textContent=LANGX==='en'?'Fingerprint unavailable. Sign in with your password.':'تعذر استخدام البصمة. سجّل بكلمة المرور.';return}
    try{const r=await api('/api/login',{method:'POST',body:{u:c.u,p:c.p}});session={u:r.user.u,role:r.user.role,token:r.token,name:r.user.name,bus:r.user.bus,sub:r.user.sub};jset('bt.session',session);route()}
    catch(e){if(e.code==='invalid_credentials'){try{await BIO.clear()}catch(_){}$('#er').textContent=LANGX==='en'?'Password changed. Sign in manually, then re-enable fingerprint.':'كلمة المرور اتغيّرت. سجّل يدويًا ثم أعد تفعيل البصمة.';const b=$('#bio');b&&b.remove();const o=$('#biooff');o&&o.remove()}else $('#er').textContent=errMsg(e)}};
  $('#bio').onclick=go;go();
}
let session=jget('bt.session',null),timers=[],watchId=null,map=null;
const clearTimers=()=>{timers.forEach(clearInterval);timers=[];if(watchId!=null){navigator.geolocation.clearWatch(watchId);watchId=null}if(map){map.remove();map=null}};
const ICON='<svg class="logo" viewBox="0 0 192 192"><rect width="192" height="192" rx="40" fill="#0f172a"/><rect x="38" y="48" width="116" height="86" rx="16" fill="#6366f1"/><rect x="52" y="63" width="88" height="32" rx="6" fill="#a5f3fc"/><circle cx="66" cy="126" r="13" fill="#0f172a" stroke="#22d3ee" stroke-width="5"/><circle cx="126" cy="126" r="13" fill="#0f172a" stroke="#22d3ee" stroke-width="5"/></svg>';

/* ---------- shifts / history ---------- */
const rnd=(seed=>()=>(seed=(seed*1664525+1013904223)%4294967296)/4294967296);
function demoShifts(){
  const out=[],r=rnd(42),now=new Date();
  D.drivers.filter(d=>d.sim!=='off').forEach((d,i)=>{
    for(let k=1;k<=75;k++){
      const day=new Date(now.getFullYear(),now.getMonth(),now.getDate()-k);
      if(day.getDay()===5)continue; // Friday off
      if(r()<.08)continue;
      const start=day.getTime()+(6+r()*2)*3600e3;
      const bias=[.4,.6,.9,1.3,.7][i]||.6;
      const dur=(7.4+r()*1.6+(r()<.35*bias?r()*2.2*bias:0))*3600e3;
      out.push({u:d.u,bus:d.bus,start,end:start+dur,demo:true});
    }
  });
  return out;
}
const DEMO_SHIFTS=demoShifts();
const allShifts=()=>[...DEMO_SHIFTS,...jget('bt.shifts',[])];
const ot=s=>Math.max(0,(s.end-s.start)-H8);

/* ---------- login ---------- */
function loginView(msg=''){
  clearTimers();
  $('#app').innerHTML=`<div class="login">${ICON}<h1>BusPulse</h1>
  <form class="card" id="lf"><label class="f">اسم المستخدم</label><input class="t" id="u" dir="ltr" style="text-align:left" autocomplete="username" autocapitalize="off" autocorrect="off" spellcheck="false" required>
  <label class="f">كلمة المرور</label><input class="t" id="p" type="password" autocomplete="current-password" required>
  <div class="err" id="er">${esc(msg)}</div><button class="btn gold" type="submit">دخول</button>
  <div class="demo-box"><b>نسخة تجريبية.</b> حسابات تجريبية فقط:<br>
  <button type="button" data-fill="driver1|1234">سائق: driver1 / 1234</button><br>
  <button type="button" data-fill="admin|admin123">مدير: admin / admin123</button><br>
  لا تستخدم كلمات مرور حقيقية. التحقق هنا للعرض فقط وسيُنقل للخادم لاحقًا.</div></form></div>`;
  document.querySelectorAll('[data-fill]').forEach(b=>b.onclick=()=>{const[a,c]=b.dataset.fill.split('|');$('#u').value=a;$('#p').value=c});
  if(LIVE){$('.demo-box').innerHTML='النظام متصل بالخادم. استخدم اسم المستخدم وكلمة المرور اللي أعطاك إياها المدير.';if(!NATIVE)$('.login').insertAdjacentHTML('beforeend',`<a class="dl" href="${APK_URL}">📲 تحميل التطبيق (أندرويد)</a>`)}
  $('#lf').onsubmit=async e=>{e.preventDefault();const u=$('#u').value.trim().toLowerCase(),p=$('#p').value;
    if(LIVE){try{const r=await api('/api/login',{method:'POST',body:{u,p}});session={u:r.user.u,role:r.user.role,token:r.token,name:r.user.name,bus:r.user.bus,sub:r.user.sub};jset('bt.session',session);await bioOffer(r.user.u,p);route()}catch(e){$('#er').textContent=errMsg(e)}return}
    if(u===D.admin.u&&p===D.admin.p)session={u,role:'admin'};
    else{const d=drv(u);if(d&&d.p===p)session={u,role:'driver'};else{$('#er').textContent='اسم المستخدم أو كلمة المرور غير صحيحة';return}}
    jset('bt.session',session);route();};
  if(LIVE&&NATIVE)bioGate();
}
const logout=()=>{if(session?.role==='driver'&&(jget('bt.shift.'+session.u,null)||session.open)){alert('عندك دوام شغال. سلّم الباص أولًا ثم اخرج.');return}try{window.__natStop&&window.__natStop()}catch(_){}LS.removeItem('bt.session');session=null;route()};

/* ---------- driver ---------- */
function driverView(){
  clearTimers();
  const d=drv(session.u);
  const st={pos:null,acc:null,speed:0,bat:null,perm:'ask',km:0,trips:0,still:0,moving:false,last:null};
  const shift0=jget('bt.shift.'+d.u,null);if(shift0){st.km=shift0.km||0;st.trips=shift0.trips||0}
  $('#app').innerHTML=`<div class="top"><div><b>BusPulse</b><small>${esc(d.name)} · ${esc(d.u)}</small></div><span class="sp"></span><button class="out" id="lo">خروج</button></div>
  <div class="pad"><div id="perm"></div>
   <div class="card"><div id="shift"></div></div>
   <div class="stats"><div class="stat"><b id="s-sp">0</b><span>كم/س</span></div><div class="stat"><b id="s-bat">—</b><span>البطارية</span></div></div>
   <div class="card" id="last"></div>
   <div class="note">عند فتح التطبيق يطلب إذن الموقع. التطبيق يرسل موقعك للإدارة طوال الدوام. في هذه النسخة التجريبية البيانات تبقى على هذا الجهاز فقط.</div></div>`;
  $('#lo').onclick=logout;
  const liveKey='bt.live.'+d.u;
  const pushLive=()=>{if(!st.pos)return;const sh=jget('bt.shift.'+d.u,null);jset(liveKey,{lat:st.pos[0],lon:st.pos[1],speed:st.speed,bat:st.bat,ts:Date.now(),onShift:!!sh,km:st.km,trips:st.trips,bus:sh?.bus||d.bus})};
  const permUi=()=>{$('#perm').innerHTML=st.perm==='ok'?`<div class="banner ok">الموقع شغال${st.acc?` (دقة ${Math.round(st.acc)} م)`:''}</div>`:st.perm==='denied'?`<div class="banner bad">إذن الموقع مرفوض. فعّله من إعدادات المتصفح للموقع، ثم <button class="btn sm gold" id="rt">إعادة المحاولة</button></div>`:st.perm==='nosupport'?`<div class="banner bad">هذا الجهاز أو المتصفح لا يدعم تحديد الموقع.</div>`:`<div class="banner warn">بانتظار إذن الموقع. اضغط "سماح" في النافذة اللي ظهرت. <button class="btn sm gold" id="rt">طلب الإذن</button></div>`;$('#rt')&&($('#rt').onclick=startGeo)};
  function startGeo(){
    if(NATIVE){regPush();return startNative()}
    if(!navigator.geolocation){st.perm='nosupport';permUi();return}
    if(watchId!=null)navigator.geolocation.clearWatch(watchId);
    watchId=navigator.geolocation.watchPosition(p=>{
      const np=[p.coords.latitude,p.coords.longitude];st.perm='ok';st.acc=p.coords.accuracy;
      let sp=p.coords.speed!=null&&!isNaN(p.coords.speed)?p.coords.speed*3.6:null;
      const now=Date.now();
      if(st.last&&sp==null){const dt=(now-st.last.t)/3600e3;sp=dt>0?dist(st.last.p,np)/dt:0}
      sp=sp||0;
      const onShift=!!jget('bt.shift.'+d.u,null);
      if(st.last&&onShift&&p.coords.accuracy<80){const k=dist(st.last.p,np);if(k<2&&k>0.005)st.km+=k}
      const mv=sp>4;if(mv&&!st.moving&&st.still>60e3&&onShift)st.trips++;
      if(mv){st.still=0}else{st.still=(st.still||0)+(st.last?now-st.last.t:0)}
      st.moving=mv;st.speed=sp;st.pos=np;st.last={p:np,t:now};
      $('#s-sp').textContent=Math.round(sp);
      if(onShift){const sh=jget('bt.shift.'+d.u,{});sh.km=st.km;sh.trips=st.trips;jset('bt.shift.'+d.u,sh)}
      permUi();pushLive();
    },e=>{st.perm=e.code===1?'denied':'ask';permUi()},{enableHighAccuracy:true,maximumAge:5000,timeout:20000});
  }
  if(navigator.getBattery)navigator.getBattery().then(b=>{const u=()=>{st.bat=Math.round(b.level*100);$('#s-bat').textContent=st.bat+'%';pushLive()};u();b.addEventListener('levelchange',u)});
  permUi();startGeo();
  let wl=null;const keepAwake=async()=>{if(NATIVE){trkUi();return}try{if(navigator.wakeLock&&jget('bt.shift.'+d.u,null))wl=await navigator.wakeLock.request('screen')}catch(_){}};
  const renderShift=()=>{
    const sh=jget('bt.shift.'+d.u,null);
    if(!sh){
      $('#shift').innerHTML=`<div class="ring-wrap"><svg class="ring" viewBox="0 0 240 240"><circle class="bg" cx="120" cy="120" r="104"/></svg><div class="ring-in"><div class="tm">00:00:00</div><small>الدوام 8 ساعات</small></div></div>
      <label class="f">الباص</label><select class="t" id="bus">${D.buses.map(b=>`<option ${b===d.bus?'selected':''}>${b}</option>`).join('')}</select>
      <button class="btn gold" id="in">استلام الباص</button>`;
      $('#in').onclick=()=>{jset('bt.shift.'+d.u,{bus:$('#bus').value,start:Date.now(),km:0,trips:0});st.km=0;st.trips=0;toast('بدأ الدوام. الله يعطيك العافية');keepAwake();renderShift();pushLive()};
    }else{
      const e=Date.now()-sh.start,over=Math.max(0,e-H8),C=2*Math.PI*104,frac=Math.min(1,e/H8);
      $('#shift').innerHTML=`<div class="ring-wrap"><svg class="ring" viewBox="0 0 240 240"><circle class="bg" cx="120" cy="120" r="104"/><circle class="fg ${over?'ot':''}" cx="120" cy="120" r="104" stroke-dasharray="${C}" stroke-dashoffset="${C*(1-frac)}"/></svg>
      <div class="ring-in"><div class="tm" id="tm">${hms(e)}</div><small>${over?'وقت إضافي':'من 8 ساعات'}</small></div></div>
      <div class="ot-box" id="otb">${over?'وقت إضافي: '+hms(over):''}</div>
      <p style="text-align:center;color:#64748b;margin:6px 0 0;font-size:14px">الباص ${esc(sh.bus)} · بدأ ${ftime(sh.start)}</p>
      <button class="btn red" id="out">تسليم الباص</button>
      <button class="btn sm ghost" id="sim" style="margin:12px auto 0;display:block">تجربة: تقديم الوقت 7 ساعات (عرض فقط)</button>`;
      $('#out').onclick=()=>{if(!confirm('تأكيد تسليم الباص وإنهاء الدوام؟'))return;const end=Date.now(),s={u:d.u,bus:sh.bus,start:sh.start,end,km:+(sh.km||0).toFixed(1),trips:sh.trips||0};const a=jget('bt.shifts',[]);a.push(s);jset('bt.shifts',a);LS.removeItem('bt.shift.'+d.u);wl?.release?.();st.km=0;st.trips=0;pushLive();
        const o=ot(s);$('#last').innerHTML=lastHtml();renderShift();toast(o?'تم التسليم. وقت إضافي '+hm(o):'تم التسليم. شكرًا لك');};
      $('#sim').onclick=()=>{sh.start-=7*3600e3;jset('bt.shift.'+d.u,sh);renderShift()};
    }
  };
  const lastHtml=()=>{const l=jget('bt.shifts',[]).filter(s=>s.u===d.u).slice(-3).reverse();return `<b>آخر دوام مسجل</b>`+(l.length?l.map(s=>`<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #e2e8f0;font-size:14px"><span>${fdate(s.start)} · ${esc(s.bus)}</span><span>${hm(s.end-s.start)} ${ot(s)?`<b style="color:#dc2626">(+${hm(ot(s))})</b>`:''}</span></div>`).join(''):'<p style="color:#64748b;margin:8px 0 0;font-size:14px">لا يوجد بعد.</p>')};
  $('#last').innerHTML=lastHtml();
  renderShift();keepAwake();
  timers.push(setInterval(()=>{const sh=jget('bt.shift.'+d.u,null);if(!sh)return;const e=Date.now()-sh.start;$('#tm').textContent=hms(e);const over=Math.max(0,e-H8);$('#otb').textContent=over?'وقت إضافي: '+hms(over):'';if(over&&!$('.ring .fg.ot'))renderShift()},1000));
  timers.push(setInterval(()=>{if(st.pos)pushLive()},15000));
  document.onvisibilitychange=()=>{if(!document.hidden)keepAwake()};
}


/* ---------- driver (live backend) ---------- */
async function driverNative(){
  clearTimers();
  if(!await consentGate()){LS.removeItem('bt.session');session=null;return loginView()}
  driverLive();
}
function driverLive(){
  clearTimers();
  const st={pos:null,acc:null,speed:0,bat:null,perm:'ask',last:null,sent:0,shift:null,off:0,net:true,lastList:[],buses:[]};
  $('#app').innerHTML=`<div class="top"><div><b>BusPulse</b><small>${esc(session.name||session.u)} · ${esc(session.u)}</small></div><span class="sp"></span><button class="out" id="lo">خروج</button></div>
  <div class="pad"><div id="perm"></div><div id="trk"></div><div id="net"></div>
   <div class="card"><div id="shift"></div></div>
   <div class="stats"><div class="stat"><b id="s-sp">0</b><span>كم/س</span></div><div class="stat"><b id="s-bat">—</b><span>البطارية</span></div></div>
   <div class="card" id="last"></div>
   <div class="note">${NATIVE?'يرسل التطبيق موقعك وبطارية جوالك للإدارة طوال الدوام، حتى لو كانت الشاشة مقفلة. التتبع يتوقف عند تسليم الباص.':'يرسل التطبيق موقعك وبطارية جوالك للإدارة أثناء فتحه. أبقِ التطبيق مفتوحًا وشاشة الجوال شغالة أثناء الدوام.'}</div></div>`;
  $('#lo').onclick=()=>{if(st.shift){alert('عندك دوام شغال. سلّم الباص أولًا ثم اخرج.');return}logout()};
  const permUi=()=>{$('#perm').innerHTML=st.perm==='ok'?`<div class="banner ok">الموقع شغال${st.acc?` (دقة ${Math.round(st.acc)} م)`:''}</div>`:st.perm==='denied'?`<div class="banner bad">إذن الموقع مرفوض. فعّله من إعدادات المتصفح للموقع، ثم <button class="btn sm gold" id="rt">إعادة المحاولة</button></div>`:st.perm==='nosupport'?`<div class="banner bad">هذا الجهاز لا يدعم تحديد الموقع.</div>`:`<div class="banner warn">بانتظار إذن الموقع. اضغط "سماح" في النافذة. <button class="btn sm gold" id="rt">طلب الإذن</button></div>`;$('#rt')&&($('#rt').onclick=()=>{if(NATIVE&&BG&&BG.openSettings&&st.perm==='denied')BG.openSettings();else startGeo()})};
  const netUi=()=>{$('#net').innerHTML=st.net?'':'<div class="banner bad">لا يوجد اتصال بالخادم. نعيد المحاولة تلقائيًا.</div>'};
  async function send(){
    if(NATIVE)return flush(true);
    if(!st.pos)return; st.sent=Date.now();
    try{await api('/api/position',{method:'POST',body:{lat:st.pos[0],lon:st.pos[1],speed:st.speed,acc:st.acc,bat:st.bat}});st.net=true}catch(e){if(e.message==='unauth')return;st.net=false}netUi();
  }
  function startGeo(){
    if(!navigator.geolocation){st.perm='nosupport';permUi();return}
    if(watchId!=null)navigator.geolocation.clearWatch(watchId);
    watchId=navigator.geolocation.watchPosition(p=>{
      const np=[p.coords.latitude,p.coords.longitude],now=Date.now();st.perm='ok';st.acc=p.coords.accuracy;
      let sp=p.coords.speed!=null&&!isNaN(p.coords.speed)?p.coords.speed*3.6:null;
      if(sp==null&&st.last){const dt=(now-st.last.t)/3600e3;sp=dt>0?dist(st.last.p,np)/dt:0}
      st.speed=sp||0;st.pos=np;st.last={p:np,t:now};$('#s-sp').textContent=Math.round(st.speed);permUi();
      if(now-st.sent>8000)send();
    },e=>{st.perm=e.code===1?'denied':'ask';permUi()},{enableHighAccuracy:true,maximumAge:5000,timeout:20000});
  }
  if(navigator.getBattery)navigator.getBattery().then(b=>{const u=()=>{st.bat=Math.round(b.level*100);$('#s-bat').textContent=st.bat+'%'};u();b.addEventListener('levelchange',u)});
  let wl=null;
  const trkUi=()=>{const el=$('#trk');if(!el)return;if(NATIVE){const p=[];if(st.shift&&nat.id!=null&&nat.mode==='bg')p.push('<div class="banner ok">التتبع شغال في الخلفية حتى مع قفل الشاشة. لا تغلق التطبيق بالسحب.</div>');if(!nat.batOk)p.push('<div class="banner bad">لاستمرار التتبع اسمح للتطبيق بالعمل في الخلفية بدون قيود البطارية. <button class="btn sm gold" id="bt-bat">السماح</button></div>');el.innerHTML=p.join('');$('#bt-bat')&&($('#bt-bat').onclick=async()=>{try{await BAT.request()}catch(_){}setTimeout(checkBat,2500)});return}if(!st.shift){el.innerHTML='';return}const on=!!(wl&&!wl.released);el.innerHTML=on?'<div class="banner ok">التتبع شغال والشاشة ما بتنطفي أثناء الدوام. أبقِ التطبيق مفتوحًا.</div>':navigator.wakeLock?'<div class="banner bad">الشاشة ممكن تنطفي ويوقف التتبع. <button class="btn sm gold" id="wk">تفعيل إبقاء الشاشة</button></div>':'<div class="banner bad">المتصفح لا يدعم إبقاء الشاشة شغالة. اضبط الجوال على عدم إطفاء الشاشة، وأبقِ التطبيق مفتوحًا.</div>';$('#wk')&&($('#wk').onclick=keepAwake)};
  const keepAwake=async()=>{try{if(navigator.wakeLock&&st.shift&&(!wl||wl.released)){wl=await navigator.wakeLock.request('screen');wl.addEventListener('release',()=>trkUi())}}catch(_){}trkUi()};
  let skew=0;
  const nat={id:null,mode:null,starting:false,q:jget('bt.q.'+session.u,[]),lastQ:0,lastFlush:0,busy:false,batOk:true,cfg:{pingSec:15,flushSec:30}};
  const BG=NATIVE?window.Capacitor.Plugins.BackgroundGeolocation:null,BAT=NATIVE?window.Capacitor.Plugins.BatteryOpt:null;
  const saveQ=()=>{if(nat.q.length>3000)nat.q=nat.q.slice(-3000);jset('bt.q.'+session.u,nat.q)};
  async function flush(force){
    if(!nat.q.length||nat.busy)return;
    if(!force&&Date.now()-nat.lastFlush<nat.cfg.flushSec*1000)return;
    nat.busy=true;nat.lastFlush=Date.now();const batch=nat.q.slice(0,300);let ok=false;
    try{await api('/api/positions',{method:'POST',body:{points:batch}});nat.q=nat.q.slice(batch.length);saveQ();st.net=true;st.sent=Date.now();ok=true}catch(e){if(e.message!=='unauth')st.net=false}
    nat.busy=false;netUi();if(ok&&nat.q.length)flush(true)}
  const checkBat=async()=>{if(!BAT)return;try{nat.batOk=!!(await BAT.status()).ignoring}catch(_){}trkUi()};
  async function startNative(){
    if(!BG){st.perm='nosupport';permUi();return}
    const mode=st.shift?'bg':'fg';
    if(nat.starting||(nat.id!=null&&nat.mode===mode))return;
    nat.starting=true;
    try{
      if(nat.id!=null){await BG.removeWatcher({id:nat.id});nat.id=null}
      try{Object.assign(nat.cfg,await api('/api/config'))}catch(_){}
      const o={requestPermissions:true,stale:false,distanceFilter:0};
      if(mode==='bg'){o.backgroundMessage='تتبع الموقع شغال أثناء الدوام';o.backgroundTitle='BusPulse'}
      nat.id=await BG.addWatcher(o,(loc,err)=>{
        if(err){if(err.code==='NOT_AUTHORIZED'){st.perm='denied';permUi()}return}
        const now=Date.now(),ts=loc.time||now,np=[loc.latitude,loc.longitude];
        let sp=loc.speed!=null&&loc.speed>=0?loc.speed*3.6:null;
        if(sp==null&&st.last){const dt=(now-st.last.t)/3600e3;sp=dt>0?dist(st.last.p,np)/dt:0}
        st.speed=sp||0;st.pos=np;st.acc=loc.accuracy;st.last={p:np,t:now};st.perm='ok';
        $('#s-sp')&&($('#s-sp').textContent=Math.round(st.speed));permUi();
        if(ts-nat.lastQ>=nat.cfg.pingSec*1000-500){nat.lastQ=ts;nat.q.push({lat:np[0],lon:np[1],speed:st.speed,acc:loc.accuracy,bat:st.bat,ts});saveQ()}
        flush(false)});
      nat.mode=mode;
    }catch(e){st.perm='denied';permUi()}
    nat.starting=false;trkUi();checkBat();
  }
  window.__natStop=()=>{try{if(nat.id!=null)BG.removeWatcher({id:nat.id});nat.id=null}catch(_){}};
  const lastHtml=()=>`<b>آخر دوام مسجل</b>`+(st.lastList.length?st.lastList.map(x=>`<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #e2e8f0;font-size:14px"><span>${fdate(x.start_ts)} · ${esc(x.bus)}</span><span>${hm(x.end_ts-x.start_ts)} ${x.end_ts-x.start_ts>H8?`<b style="color:#dc2626">(+${hm(x.end_ts-x.start_ts-H8)})</b>`:''}</span></div>`).join(''):'<p style="color:#64748b;margin:8px 0 0;font-size:14px">لا يوجد بعد.</p>');
  const apply=m=>{st.shift=m.shift;st.loaded=true;if(NATIVE)startNative();else if(watchId==null)startGeo();if(m.shift)keepAwake();else{wl?.release?.();wl=null;trkUi()}st.lastList=m.last||[];st.buses=m.buses||[];skew=m.now-Date.now();session.open=!!m.shift;$('#last').innerHTML=lastHtml();renderShift()};
  const C=2*Math.PI*104;
  function renderShift(){
    const sh=st.shift;
    if(!sh&&!st.loaded){$('#shift').innerHTML='<p style="text-align:center;color:#64748b;padding:30px 0">جارٍ التحميل...</p>';return}
    if(!sh){
      const opts=st.buses.length?st.buses.map(b=>b.id):[session.bus].filter(Boolean);
      $('#shift').innerHTML=`<div class="ring-wrap"><svg class="ring" viewBox="0 0 240 240"><circle class="bg" cx="120" cy="120" r="104"/></svg><div class="ring-in"><div class="tm">00:00:00</div><small>الدوام 8 ساعات</small></div></div>
      <label class="f">الباص</label><select class="t" id="bus">${opts.map(b=>`<option ${b===session.bus?'selected':''}>${esc(b)}</option>`).join('')}</select>
      <button class="btn gold" id="in" ${opts.length?'':'disabled'}>استلام الباص</button>${opts.length?'':'<p class="err">ما في باصات مضافة. كلم المدير.</p>'}`;
      $('#in')&&($('#in').onclick=async()=>{const btn=$('#in');if(btn.disabled)return;btn.disabled=true;try{apply(await api('/api/shift/start',{method:'POST',body:{bus:$('#bus').value}}));toast('بدأ الدوام. الله يعطيك العافية');keepAwake();send()}catch(e){btn.disabled=false;if(e.message==='shift_already_open'){try{apply(await api('/api/me'));toast('عندك دوام مفتوح. تم استرجاعه');keepAwake()}catch(_){}}else if(e.message!=='unauth')toast(errMsg(e))}});
    }else{
      const e=Date.now()+skew-sh.start_ts,over=Math.max(0,e-H8),frac=Math.min(1,e/H8);
      $('#shift').innerHTML=`<div class="ring-wrap"><svg class="ring" viewBox="0 0 240 240"><circle class="bg" cx="120" cy="120" r="104"/><circle class="fg ${over?'ot':''}" cx="120" cy="120" r="104" stroke-dasharray="${C}" stroke-dashoffset="${C*(1-frac)}"/></svg>
      <div class="ring-in"><div class="tm" id="tm">${hms(e)}</div><small>${over?'وقت إضافي':'من 8 ساعات'}</small></div></div>
      <div class="ot-box" id="otb">${over?'وقت إضافي: '+hms(over):''}</div>
      <p style="text-align:center;color:#64748b;margin:6px 0 0;font-size:14px">الباص ${esc(sh.bus)} · بدأ ${ftime(sh.start_ts)}</p>
      <button class="btn red" id="out">تسليم الباص</button>`;
      $('#out').onclick=async()=>{if(!confirm('تأكيد تسليم الباص وإنهاء الدوام؟'))return;const btn=$('#out');if(btn.disabled)return;btn.disabled=true;try{await send();const m=await api('/api/shift/end',{method:'POST'});wl?.release?.();apply(m);toast(m.ended.overtimeMs?'تم التسليم. وقت إضافي '+hm(m.ended.overtimeMs):'تم التسليم. شكرًا لك')}catch(e){btn.disabled=false;if(e.message==='no_open_shift'){try{apply(await api('/api/me'));toast('الدوام كان مقفلًا. تم التحديث')}catch(_){}}else if(e.message!=='unauth')toast(errMsg(e))}};
    }
  }
  const load=async()=>{try{apply(await api('/api/me'));st.net=true}catch(e){if(e.message==='unauth')return;st.net=false}netUi()};
  permUi();
  // ask once: only start the prompt flow if not already decided; a granted/denied state is read silently
  if(NATIVE){startNative()}else if(navigator.permissions&&navigator.permissions.query){navigator.permissions.query({name:'geolocation'}).then(r=>{if(r.state==='denied'){st.perm='denied';permUi()}else startGeo();r.onchange=()=>{if(r.state==='granted'){startGeo()}else if(r.state==='denied'){st.perm='denied';permUi()}}}).catch(startGeo)}else startGeo();
  load();
  timers.push(setInterval(()=>{if(!st.shift)return;const e=Date.now()+skew-st.shift.start_ts;const t=$('#tm');if(t)t.textContent=hms(e);const over=Math.max(0,e-H8);$('#otb')&&($('#otb').textContent=over?'وقت إضافي: '+hms(over):'');if(over&&!$('.ring .fg.ot'))renderShift()},1000));
  timers.push(setInterval(()=>{if(NATIVE)flush(false);else if(st.pos&&Date.now()-st.sent>12000)send()},4000));
  timers.push(setInterval(async()=>{try{const m=await api('/api/me');const had=!!st.shift;st.shift=m.shift;st.net=true;if(had!==!!m.shift)apply(m)}catch(e){if(e.message!=='unauth')st.net=false}netUi()},30000));
  document.onvisibilitychange=()=>{if(!document.hidden){wl=null;keepAwake();if(NATIVE){checkBat();flush(true)}else send()}};
}

/* ---------- admin ---------- */
const ESRI='https://server.arcgisonline.com/ArcGIS/rest/services/';
const STYLES=[
 {k:'std',n:'تفصيلي (OSM)',l:['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],z:[19],a:'© OpenStreetMap contributors'},
 {k:'sat',n:'قمر صناعي',z:[19,19,19,19,18,18],c:['tf-sat','tf-halo','tf-halo','tf-txt','tf-sat','tf-sat'],l:[ESRI+'World_Imagery/MapServer/tile/{z}/{y}/{x}','https://tile.openstreetmap.org/{z}/{x}/{y}.png','https://tile.openstreetmap.org/{z}/{x}/{y}.png','https://tile.openstreetmap.org/{z}/{x}/{y}.png',ESRI+'Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}',ESRI+'Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}'],a:'Tiles © Esri, Maxar, Earthstar Geographics'}
];
const COL={lost:'#dc2626',moving:'#16a34a',stopped:'#d97706',offline:'#6b7280',off:'#94a3b8'};
const LBL={lost:'غير متصل أثناء الدوام',moving:'متحرك',stopped:'متوقف',offline:'لا يوجد اتصال',off:'خارج الدوام'};
/* simulation of demo fleet */
const FLEET={};
function initFleet(){
  D.drivers.forEach(d=>{
    const pts=D.routes[d.bus]||[D.depot];const segs=[];let tot=0;
    for(let i=0;i<pts.length;i++){const a=pts[i],b=pts[(i+1)%pts.length],L=pts.length>1?dist(a,b):0;segs.push({a,b,L,c:tot});tot+=L}
    const f={d,pts,segs,tot,s:Math.random()*tot,dwell:0,speed:0,km:d.shiftH*21+Math.random()*3,trips:Math.max(0,Math.floor(d.shiftH*1.6)),state:d.sim==='off'?'off':'moving',pos:pts[0],bat:d.bat,vmax:34+Math.random()*14,lastBeat:Date.now(),hist:[]};
    if(d.sim==='offline'){f.state='offline';f.speed=0}
    FLEET[d.u]=f;place(f);
  });
}
function place(f){
  if(f.tot===0){f.pos=f.pts[0];return}
  const s=((f.s%f.tot)+f.tot)%f.tot;const g=f.segs.find(x=>s>=x.c&&s<x.c+x.L)||f.segs[0];const t=g.L?(s-g.c)/g.L:0;
  f.pos=[g.a[0]+(g.b[0]-g.a[0])*t,g.a[1]+(g.b[1]-g.a[1])*t];
}
function stepFleet(dt){ // dt seconds
  Object.values(FLEET).forEach(f=>{
    if(f.d.sim==='off'||f.d.sim==='offline'){return}
    if(f.dwell>0){f.dwell-=dt;f.state='stopped';f.speed=0;if(f.dwell<=0){f.state='moving'}return}
    const v=f.vmax*(.85+.3*Math.random());f.speed=v;f.state='moving';
    const km=v*dt/3600*6; // x6 so movement is visible in a demo
    const prev=f.s;f.s+=km;f.km+=km;place(f);
    const crossed=f.segs.some(g=>{const e=g.c+g.L;return prev<e&&f.s>=e});
    if(crossed){f.dwell=14+Math.random()*10;f.trips++}
    if(Math.random()<.002)f.bat=Math.max(1,f.bat-1);
  });
}
let LFLEET=[];
async function pollFleet(){try{const r=await api('/api/fleet');LFLEET=r.drivers;}catch(e){}}
function adminState(){
  if(LIVE)return LFLEET.filter(x=>x.lat!=null).map(x=>({d:{u:x.u,name:x.name,phone:x.phone},state:(x.state==='offline'&&x.onShift?'lost':x.state),pos:[x.lat,x.lon],speed:x.speed,km:x.km,trips:x.trips,bat:x.bat,real:false,bus:x.bus||'-',seen:x.lastSeen,onShift:x.onShift}));
  const live=u=>{const l=jget('bt.live.'+u,null);return l&&Date.now()-l.ts<5*60e3?l:null};
  return D.drivers.map(d=>{
    const f=FLEET[d.u],l=live(d.u);
    if(l&&l.onShift!==false){return {d,state:l.speed>4?'moving':'stopped',pos:[l.lat,l.lon],speed:l.speed,km:l.km||0,trips:l.trips||0,bat:l.bat,real:true,bus:l.bus||d.bus}}
    if(l){return {d,state:'off',pos:[l.lat,l.lon],speed:0,km:0,trips:0,bat:l.bat,real:true,bus:d.bus}}
    return {d,state:f.state,pos:f.pos,speed:f.speed,km:f.km,trips:f.trips,bat:f.bat,real:false,bus:d.bus};
  });
}
const batHtml=b=>b==null?'<span class="bat">—</span>':`<span class="bat" style="color:${b<=20?'#dc2626':b<=40?'#d97706':'#16a34a'}">🔋 ${b}%</span>`;
let tab='map',styleK=['std','sat'].includes(localStorage.getItem('bt.style'))?localStorage.getItem('bt.style'):'std',tile=null,markers={},focus=null,month=new Date().toISOString().slice(0,7);
function adminView(){
  clearTimers();markers={};
  $('#app').innerHTML=`<div class="top"><div><b>BusPulse</b><small>لوحة الإدارة · ${esc(LIVE&&session?.name||D.admin.name)}${session?.sub==='manager'?' · مدير التشغيل':session?.sub==='viewer'?' · مدير عام (عرض فقط)':''}</small></div><span class="sp"></span><button class="out" id="lo">خروج</button></div>
  <div class="tabs"><button class="tab ${tab==='map'?'on':''}" data-t="map">الخريطة المباشرة</button><button class="tab ${tab==='rep'?'on':''}" data-t="rep">تقرير الوقت الإضافي</button>${LIVE?`<button class="tab ${tab==='drv'?'on':''}" data-t="drv">السائقون</button><button class="tab ${tab==='acc'?'on':''}" data-t="acc">حسابي</button>`:''}</div>
  <div class="admin" id="body"></div><div class="drawer" id="dr"><div class="in" id="drin"></div></div>`;
  $('#lo').onclick=logout;$('#dr').onclick=e=>{if(e.target.id==='dr')$('#dr').classList.remove('on')};
  document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>{tab=b.dataset.t;adminView()});
  tab==='map'?mapTab():tab==='drv'&&LIVE?drvTab():tab==='acc'&&LIVE?accTab():repTab();
}
function mapTab(){
  $('#body').innerHTML=`<div class="mapwrap"><div id="map"></div><div class="styles" id="styles">${STYLES.map(s=>`<button data-s="${s.k}" class="${s.k===styleK?'on':''}">${s.n}</button>`).join('')}</div>
  <div class="sheet" id="sheet"></div></div>`;
  map=L.map('map',{zoomControl:false,attributionControl:true}).setView(D.depot,12);
  L.control.zoom({position:'bottomleft'}).addTo(map);
  const setTile=k=>{styleK=k;LS.setItem('bt.style',k);const s=STYLES.find(x=>x.k===k);if(tile)map.removeLayer(tile);tile=L.layerGroup(s.l.map((u,i)=>L.tileLayer(u,{attribution:i?'':(s.k==='sat'?s.a+' | © OpenStreetMap contributors':s.a),maxZoom:20,maxNativeZoom:(s.z&&s.z[i])||18,className:(s.c&&s.c[i])||'tf-'+s.k}))).addTo(map);document.querySelectorAll('#styles button').forEach(b=>b.classList.toggle('on',b.dataset.s===k))};
  setTile(styleK);
  document.querySelectorAll('#styles button').forEach(b=>b.onclick=()=>setTile(b.dataset.s));
  const draw=(fit)=>{
    const S=adminState();const pts=[];
    S.forEach(x=>{
      const col=COL[x.state];const html=`<div class="mk ${x.state==='moving'?'mv':''} ${x.state==='lost'?'lost':''}" style="--c:${col}">🚌<span class="mk-l">${esc(x.d.name.split(' ')[0])}${x.state==='lost'&&x.seen?' · '+hm(Math.max(60000,Date.now()-x.seen)):''}</span></div>`;
      if(!markers[x.d.u]){const m=L.marker(x.pos,{icon:L.divIcon({html,className:'',iconSize:[34,34],iconAnchor:[17,17]})}).addTo(map);m.on('click',()=>{focus=x.d.u;map.setView(x.pos,17);sheet()});markers[x.d.u]={m,state:html}}
      else{const k=markers[x.d.u];k.m.setLatLng(x.pos);if(k.state!==html){k.m.setIcon(L.divIcon({html,className:'',iconSize:[34,34],iconAnchor:[17,17]}));k.state=html}}
      pts.push(x.pos);
    });
    if(fit&&pts.length)map.fitBounds(pts,{padding:[50,50],maxZoom:16});
    sheet(S);
  };
  const sheet=(S=adminState())=>{
    const c={lost:0,moving:0,stopped:0,offline:0,off:0};S.sort((p,q)=>(q.state==='lost')-(p.state==='lost'));S.forEach(x=>c[x.state]++);
    $('#sheet').innerHTML=`<div class="grab"></div><div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px">${Object.keys(c).map(k=>`<span class="pill" style="--c:${COL[k]}"><i></i>${LBL[k]} ${c[k]}</span>`).join('')}</div>`+
    (c.lost?`<div class="banner bad" style="margin:4px 0 8px;font-weight:700">⚠ ${c.lost} سائق غير متصل أثناء الدوام. آخر موقع معروف ظاهر على الخريطة.</div>`:'')+(LIVE&&!S.length?'<p style="text-align:center;color:#64748b">لا يوجد سائقون على الخريطة بعد. يظهرون عند فتح التطبيق وإرسال الموقع.</p>':'')+S.map(x=>`<button class="drow" data-u="${x.d.u}" style="${x.state==='lost'?'background:#fee2e2;border-inline-start:4px solid #dc2626':focus===x.d.u?'background:#f1f5f9':''}"><span class="av">${esc(x.d.name[0])}</span>
     <span><b>${esc(x.d.name)} ${x.real?'<span class="pill" style="--c:#2563eb"><i></i>موقع حقيقي</span>':''}</b><small>${esc(x.bus)} · ${x.onShift===false?'خارج الدوام · ':''}${(x.state==='offline'||x.state==='lost')&&x.seen?'آخر ظهور قبل '+hm(Math.max(60000,Date.now()-x.seen)):'<span class="spd"><b>'+Math.round(x.speed||0)+'</b> كم/س</span>'}</small></span>
     <span style="text-align:end"><span class="pill" style="--c:${COL[x.state]}"><i></i>${LBL[x.state]}</span><br>${batHtml(x.bat)}</span></button>`).join('');
    document.querySelectorAll('.drow').forEach(b=>b.onclick=()=>{focus=b.dataset.u;const x=adminState().find(y=>y.d.u===focus);map.setView(x.pos,17);sheet()});
  };
  if(LIVE){pollFleet().then(()=>draw(true));timers.push(setInterval(async()=>{await pollFleet();if(map)draw(false)},3000))}
  else{draw(true);timers.push(setInterval(()=>{stepFleet(2);draw(false)},2000))}
}
function monthRows(m){
  const [y,mo]=m.split('-').map(Number);
  const sh=allShifts().filter(s=>{const d=new Date(s.start);return d.getFullYear()===y&&d.getMonth()+1===mo});
  return D.drivers.map(d=>{const l=sh.filter(s=>s.u===d.u).sort((a,b)=>a.start-b.start);return {d,l,days:l.length,tot:l.reduce((a,s)=>a+(s.end-s.start),0),ot:l.reduce((a,s)=>a+ot(s),0),otDays:l.filter(s=>ot(s)>0).length}});
}
async function repTab(){
  let rows;
  if(LIVE){try{const r=await api('/api/report?month='+month);rows=r.drivers.map(d=>({d:{u:d.u,name:d.name},l:d.shifts.map(x=>({id:x.id,u:d.u,bus:x.bus,start:x.start,end:x.end,pend:x.pending})),days:d.days,tot:d.totalMs,ot:d.overtimeMs,otDays:d.overtimeDays,pending:d.pending||0,pendingOt:d.pendingOvertimeMs||0}))}catch(e){if(e.message==='unauth')return;$('#body').innerHTML='<div class="rep"><div class="banner bad">تعذر تحميل التقرير. '+esc(errMsg(e))+'</div></div>';return}}
  else rows=monthRows(month);
  $('#body').innerHTML=`<div class="rep"><div class="bar"><input type="month" id="mo" value="${month}"><button class="btn sm ghost" id="csv">تصدير CSV</button> <button class="btn sm ghost" id="pdf">تقرير PDF</button><span style="color:#64748b;font-size:13px">الوقت الإضافي = أي وقت بعد 8 ساعات من استلام الباص حتى تسليمه</span></div>
  <table><thead><tr><th>السائق</th><th>أيام</th><th>إجمالي الساعات</th><th>ساعات إضافية</th><th>أيام فيها إضافي</th></tr></thead><tbody>
  ${rows.map(r=>`<tr class="clk" data-u="${r.d.u}"><td><b>${esc(r.d.name)}</b><br><small style="color:#64748b">${esc(r.d.u)}</small></td><td>${r.days}</td><td>${hm(r.tot)}</td><td class="${r.ot?'ov':''}">${hm(r.ot)}${r.pending?`<br><small style="color:#b45309;font-weight:400">⏳ ${r.pending} قيد المراجعة (+${hm(r.pendingOt)} تقديري)</small>`:''}</td><td>${r.otDays}</td></tr>`).join('')}
  <tr style="background:#f1f5f9;font-weight:800"><td>الإجمالي</td><td>${rows.reduce((a,r)=>a+r.days,0)}</td><td>${hm(rows.reduce((a,r)=>a+r.tot,0))}</td><td class="ov">${hm(rows.reduce((a,r)=>a+r.ot,0))}${rows.some(r=>r.pending)?`<br><small style="color:#b45309;font-weight:400">⏳ ${rows.reduce((a,r)=>a+r.pending,0)} قيد المراجعة (+${hm(rows.reduce((a,r)=>a+r.pendingOt,0))} تقديري)</small>`:''}</td><td>${rows.reduce((a,r)=>a+r.otDays,0)}</td></tr></tbody></table>
  <div class="note">بيانات الأشهر السابقة تجريبية. الدوام اللي يسجله سائق على هذا الجهاز يظهر هنا أيضًا. اضغط على اسم السائق لتفاصيل الأيام.</div></div>`;
  $('#mo').onchange=e=>{if(e.target.value){month=e.target.value;repTab()}};
  $('#csv').onclick=()=>{const lines=[['driver','username','date','bus','start','end','total','overtime','status']];rows.forEach(r=>r.l.forEach(s=>lines.push([r.d.name,r.d.u,new Date(s.start).toISOString().slice(0,10),s.bus,ftime(s.start),ftime(s.end),hm(s.end-s.start),s.pend?'pending_review':(ot(s)?hm(ot(s)):'0'),s.pend?'pending_review':''])));
    const csv='\ufeff'+lines.map(r=>r.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(',')).join('\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download='overtime-'+month+'.csv';a.click()};
  $('#pdf').onclick=()=>{const w=window.open('','_blank');if(!w){toast('اسمح بالنوافذ المنبثقة لفتح التقرير');return}
    const E=esc,tot=k=>rows.reduce((a,r)=>a+r[k],0);
    const sum=rows.map(r=>`<tr><td>${E(r.d.name)}<br><small>${E(r.d.u)}</small></td><td>${r.days}</td><td>${hm(r.tot)}</td><td class="${r.ot?'ov':''}">${hm(r.ot)}</td><td>${r.otDays}</td></tr>`).join('');
    const det=rows.filter(r=>r.l.length).map(r=>`<h3>${E(r.d.name)}</h3><table><thead><tr><th>التاريخ</th><th>الباص</th><th>من</th><th>إلى</th><th>المدة</th><th>إضافي</th></tr></thead><tbody>${r.l.map(s=>`<tr><td>${fdate(s.start)}</td><td>${E(s.bus||'-')}</td><td>${ftime(s.start)}</td><td>${ftime(s.end)}</td><td>${hm(s.end-s.start)}</td>${s.pend?`<td style="color:#b45309">قيد المراجعة (تقديري ${hm(ot(s))})</td>`:`<td class="${ot(s)?'ov':''}">${ot(s)?hm(ot(s)):'-'}</td>`}</tr>`).join('')}</tbody></table>`).join('');
    w.document.write(TR(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>تقرير الوقت الإضافي ${month}</title><style>
    body{font-family:Tahoma,Arial,sans-serif;margin:24px;color:#0f172a}h1{font-size:20px;margin:0 0 4px}h3{margin:20px 0 6px;font-size:15px}.s{color:#64748b;font-size:12px;margin-bottom:12px}
    table{width:100%;border-collapse:collapse;font-size:13px;margin-bottom:6px}th,td{border:1px solid #cbd5e1;padding:6px 8px;text-align:right}th{background:#e2e8f0}small{color:#64748b}.ov{color:#b42318;font-weight:700}tr{page-break-inside:avoid}
    .pb{margin-bottom:14px}@media print{.pb{display:none}}button{padding:8px 16px;font:inherit}</style></head><body>
    <div class="pb"><button onclick="window.print()">طباعة / حفظ كـ PDF</button></div>
    <h1>تقرير الوقت الإضافي · ${month}</h1><div class="s">الوقت الإضافي = أي وقت بعد 8 ساعات من استلام الباص حتى تسليمه · أُنشئ ${new Date().toLocaleString(LANGX==='en'?'en-GB':'ar-SA')}</div>
    ${rows.some(r=>r.pending)?`<p style="color:#b45309;font-size:13px">⏳ ${tot('pending')} دوام أُغلق تلقائيًا (نسي السائق التسليم) بانتظار مراجعة الإدارة. وقتها الإضافي التقديري (${hm(tot('pendingOt'))}) غير محسوب في الإجماليات أعلاه حتى يتم تأكيده.</p>`:''}<table><thead><tr><th>السائق</th><th>أيام</th><th>إجمالي الوقت</th><th>وقت إضافي</th><th>أيام فيها إضافي</th></tr></thead><tbody>${sum}<tr style="font-weight:700;background:#f1f5f9"><td>${'الإجمالي'}</td><td>${tot('days')}</td><td>${hm(tot('tot'))}</td><td class="ov">${hm(tot('ot'))}</td><td>${tot('otDays')}</td></tr></tbody></table>${det}
    <script>setTimeout(function(){window.print()},500)<\/script></body></html>`).replace(/lang="ar" dir="rtl"/,LANGX==='en'?'lang="en" dir="ltr"':'lang="ar" dir="rtl"'));w.document.close()};
  document.querySelectorAll('tr.clk').forEach(t=>t.onclick=()=>{const r=rows.find(x=>x.d.u===t.dataset.u);
    const canReview=session.sub!=='viewer';
    $('#drin').innerHTML=`<h3 style="margin:0 0 10px">${esc(r.d.name)} · ${month}</h3>`+(r.l.length?`<table><thead><tr><th>التاريخ</th><th>من</th><th>إلى</th><th>المدة</th><th>إضافي</th>${LIVE?'<th></th>':''}</tr></thead><tbody>${r.l.map(s=>s.pend?`<tr style="background:#fffbeb"><td>${fdate(s.start)}</td><td>${ftime(s.start)}</td><td>${ftime(s.end)}</td><td>${hm(s.end-s.start)}</td><td style="color:#b45309"><small>أُغلق تلقائيًا (نسي التسليم) · تقديري ${hm(ot(s))}</small>${canReview?` <button class="btn sm gold" data-rev="${s.id}">تأكيد</button>`:''}</td>${LIVE?`<td><button class="btn sm ghost" data-track="${s.id}">🗺</button></td>`:''}</tr>`:`<tr><td>${fdate(s.start)}</td><td>${ftime(s.start)}</td><td>${ftime(s.end)}</td><td>${hm(s.end-s.start)}</td><td class="${ot(s)?'ov':''}">${ot(s)?hm(ot(s)):'-'}</td>${LIVE?`<td><button class="btn sm ghost" data-track="${s.id}">🗺</button></td>`:''}</tr>`).join('')}</tbody></table>`:'<p>لا توجد دوامات.</p>')+'<button class="btn ghost" onclick="document.getElementById(\'dr\').classList.remove(\'on\')">إغلاق</button>';
    $('#drin').querySelectorAll('[data-rev]').forEach(b=>b.onclick=async()=>{b.disabled=true;try{await api('/api/shifts/review',{method:'POST',body:{id:+b.dataset.rev}});toast('تم التأكيد');$('#dr').classList.remove('on');repTab()}catch(e){b.disabled=false;toast(errMsg(e))}});
    $('#drin').querySelectorAll('[data-track]').forEach(b=>b.onclick=()=>replayView(+b.dataset.track));
    $('#dr').classList.add('on')});
}

/* ---------- route replay ---------- */
const TR_=(ar,en)=>LANGX==='en'?en:ar;
async function shiftsDrawer(u,name){
  let r;try{r=await api('/api/shifts?u='+encodeURIComponent(u))}catch(e){toast(errMsg(e));return}
  $('#drin').innerHTML=`<h3 style="margin:0 0 10px">${TR_('مسارات','Routes')} · ${esc(name)}</h3>`+(r.shifts.length?`<table><thead><tr><th>${TR_('التاريخ','Date')}</th><th>${TR_('الباص','Bus')}</th><th>${TR_('من','From')}</th><th>${TR_('إلى','To')}</th><th></th></tr></thead><tbody>${r.shifts.map(s=>`<tr><td>${fdate(s.start_ts)}</td><td>${esc(s.bus||'-')}</td><td>${ftime(s.start_ts)}</td><td>${ftime(s.end_ts)}</td><td><button class="btn sm gold" data-track="${s.id}">${TR_('عرض المسار','View route')}</button></td></tr>`).join('')}</tbody></table>`:`<p>${TR_('لا توجد دوامات مسجلة بعد.','No shifts recorded yet.')}</p>`)+`<div style="margin-top:12px"><button class="btn ghost" onclick="document.getElementById('dr').classList.remove('on')">${TR_('إغلاق','Close')}</button></div>`;
  $('#drin').querySelectorAll('[data-track]').forEach(b=>b.onclick=()=>replayView(+b.dataset.track));
  $('#dr').classList.add('on');
}
async function replayView(id){
  let data;try{data=await api('/api/track?shift='+id)}catch(e){toast(errMsg(e));return}
  const pts=(data.points||[]).map(p=>({t:p[0],lat:p[1],lon:p[2],sp:p[3]||0}));
  if(pts.length<2){toast(TR_('لا توجد نقاط مسار محفوظة لهذا الدوام بعد — يبدأ الحفظ من اليوم','No route points stored for this shift yet — recording starts from now on'));return}
  const sh=data.shift;
  const el=document.createElement('div');el.className='replay';
  el.innerHTML=`<div class="rp-map" id="rpmap"></div>
  <div class="styles" id="rpstyles">${STYLES.map(s=>`<button data-s="${s.k}" class="${s.k===styleK?'on':''}">${s.n}</button>`).join('')}</div>
  <div class="rp-bar">
   <div class="rp-top"><b>${esc(sh.name||sh.u)}</b><span>${esc(sh.bus||'')}</span><span>${fdate(sh.start_ts)} · ${ftime(sh.start_ts)} – ${ftime(sh.end_ts)}</span><button class="out" id="rp-x">✕</button></div>
   <input type="range" id="rp-r" min="0" max="${Math.max(1000,pts[pts.length-1].t-pts[0].t)}" value="0" step="500">
   <div class="rp-ctl"><button class="btn sm gold" id="rp-p">▶ ${TR_('تشغيل','Play')}</button>
    <select class="t" id="rp-s" style="width:auto;padding:6px 10px">${[1,2,4,8,16].map(x=>`<option value="${x}"${x===4?' selected':''}>${x}x</option>`).join('')}</select>
    <span id="rp-t"></span><span id="rp-sp"></span><span id="rp-d"></span></div></div>`;
  document.body.appendChild(el);
  const rmap=L.map('rpmap',{zoomControl:false,attributionControl:true});
  L.control.zoom({position:'bottomleft'}).addTo(rmap);
  let rtile=null;const setRT=k=>{styleK=k;LS.setItem('bt.style',k);const s=STYLES.find(x=>x.k===k);if(rtile)rmap.removeLayer(rtile);rtile=L.layerGroup(s.l.map((u,i)=>L.tileLayer(u,{attribution:i?'':s.a,maxZoom:20,maxNativeZoom:(s.z&&s.z[i])||18,className:(s.c&&s.c[i])||'tf-'+s.k}))).addTo(rmap);document.querySelectorAll('#rpstyles button').forEach(b=>b.classList.toggle('on',b.dataset.s===k))};
  setRT(styleK);
  document.querySelectorAll('#rpstyles button').forEach(b=>b.onclick=()=>setRT(b.dataset.s));
  const segs=[[]];let totKm=0;
  for(let i=0;i<pts.length;i++){if(i){totKm+=dist([pts[i-1].lat,pts[i-1].lon],[pts[i].lat,pts[i].lon]);if(pts[i].t-pts[i-1].t>18e4)segs.push([])}segs[segs.length-1].push(pts[i])}
  segs.forEach(sg=>{if(sg.length>1)L.polyline(sg.map(p=>[p.lat,p.lon]),{color:'#4f46e5',weight:5,opacity:.85}).addTo(rmap)});
  for(let i=1;i<segs.length;i++){const a=segs[i-1][segs[i-1].length-1],b=segs[i][0];L.polyline([[a.lat,a.lon],[b.lat,b.lon]],{color:'#94a3b8',weight:3,dashArray:'4 8'}).addTo(rmap)}
  L.circleMarker([pts[0].lat,pts[0].lon],{radius:8,color:'#16a34a',fillColor:'#16a34a',fillOpacity:1}).addTo(rmap).bindTooltip(TR_('البداية','Start'));
  const lp=pts[pts.length-1];
  L.circleMarker([lp.lat,lp.lon],{radius:8,color:'#dc2626',fillColor:'#dc2626',fillOpacity:1}).addTo(rmap).bindTooltip(TR_('النهاية','End'));
  const cur=L.marker([pts[0].lat,pts[0].lon],{icon:L.divIcon({html:'<div class="mk mv" style="--c:#4f46e5">🚌</div>',className:'',iconSize:[34,34],iconAnchor:[17,17]}),zIndexOffset:500}).addTo(rmap);
  rmap.fitBounds(L.latLngBounds(pts.map(p=>[p.lat,p.lon])),{padding:[40,40]});
  const t0=pts[0].t,dur=lp.t-t0;
  let vt=0,playing=false,speed=4,raf=null,idx=0,lastReal=0;
  const R=$('#rp-r',el),P=$('#rp-p',el),S=$('#rp-s',el),TT=$('#rp-t',el),SP=$('#rp-sp',el),DD=$('#rp-d',el);
  DD.textContent='📏 '+totKm.toFixed(1)+' '+TR_('كم','km');
  const posAt=t=>{while(idx<pts.length-2&&pts[idx+1].t<=t)idx++;while(idx>0&&pts[idx].t>t)idx--;
    const a=pts[idx],b=pts[idx+1]||a,f=b.t>a.t?Math.min(1,(t-a.t)/(b.t-a.t)):0;
    return{lat:a.lat+(b.lat-a.lat)*f,lon:a.lon+(b.lon-a.lon)*f,sp:f<1?a.sp:0,gap:b.t-a.t>18e4,be:b.t}};
  const render=()=>{const q=posAt(t0+vt);cur.setLatLng([q.lat,q.lon]);R.value=Math.min(vt,+R.max);TT.textContent='🕐 '+ftime(t0+vt);SP.textContent='🚌 '+Math.round(q.sp)+' '+TR_('كم/س','km/h')};
  const tick=ts=>{if(!playing)return;const dr=lastReal?ts-lastReal:0;lastReal=ts;vt+=dr*speed;
    const q=posAt(t0+vt);if(q.gap&&t0+vt>pts[idx].t&&q.be>t0+vt)vt=q.be-t0; // fast-forward through recording gaps
    if(vt>=dur){vt=dur;playing=false;P.innerHTML='▶ '+TR_('تشغيل','Play')}
    render();if(playing)raf=requestAnimationFrame(tick)};
  P.onclick=()=>{playing=!playing;P.innerHTML=(playing?'⏸ '+TR_('إيقاف','Pause'):'▶ '+TR_('تشغيل','Play'));if(playing){if(vt>=dur){vt=0;idx=0}lastReal=0;raf=requestAnimationFrame(tick)}else cancelAnimationFrame(raf)};
  S.onchange=()=>{speed=+S.value};
  R.oninput=()=>{vt=+R.value;render()};
  render();
  $('#rp-x',el).onclick=()=>{cancelAnimationFrame(raf);rmap.remove();el.remove()};
}


async function accTab(flash){
  let adms=null;if(!session.sub){try{adms=(await api('/api/admins')).admins}catch(e){if(e.message==='unauth')return}}
  const LVL={manager:'مدير تشغيل',viewer:'مدير عام (عرض فقط)'};
  $('#body').innerHTML=`<div class="rep">${flash?`<div class="banner ok" style="margin-bottom:14px">${esc(flash)}</div>`:''}<div class="card"><b>تغيير كلمة مروري (${esc(session.u)})</b>
   <label class="f">كلمة المرور الحالية</label><input class="t" id="pc" type="password" autocomplete="current-password">
   <label class="f">كلمة المرور الجديدة (4 أحرف على الأقل)</label><input class="t" id="pn" type="password" autocomplete="new-password">
   <div class="err" id="pe"></div><button class="btn gold" id="ps">حفظ</button></div>
   ${session.sub?'':`<div class="card" style="margin-top:14px"><b>المستخدمون الإداريون</b><small style="display:block;color:#64748b;margin:4px 0 10px">أنشئ حسابات إدارة إضافية واختر صلاحية كل حساب.</small>
   <table><thead><tr><th>المستخدم</th><th>الصلاحية</th><th>الحالة</th><th></th></tr></thead><tbody>${(adms||[]).map(a=>`<tr><td><b>${esc(a.name)}</b><br><small style="color:#64748b">${esc(a.u)}</small></td><td>${a.sub?(LVL[a.sub]||esc(a.sub)):'مدير كامل'}</td><td>${a.active?'مفعّل':'موقوف'}</td>
    <td>${a.u==='admin'?'':`<button class="btn sm ghost" data-alvl="${esc(a.u)}|${a.sub==='viewer'?'manager':'viewer'}">${a.sub==='viewer'?'إلى مدير تشغيل':'إلى عرض فقط'}</button> <button class="btn sm ghost" data-apw="${esc(a.u)}">كلمة مرور جديدة</button> <button class="btn sm ghost" data-aact="${esc(a.u)}|${a.active?0:1}">${a.active?'إيقاف':'تفعيل'}</button> <button class="btn sm ghost" style="color:#c0392b" data-adel="${esc(a.u)}|${esc(a.name)}">حذف</button>`}</td></tr>`).join('')}</tbody></table>
   <b style="display:block;margin:16px 0 2px">إضافة مستخدم إداري</b>
   <label class="f">الاسم</label><input class="t" id="an" style="direction:rtl">
   <label class="f">اسم المستخدم للدخول (حروف إنجليزية وأرقام فقط)</label><input class="t" id="au" dir="ltr" style="text-align:left" autocapitalize="off" autocorrect="off" spellcheck="false">
   <label class="f">كلمة المرور (4 أحرف على الأقل)</label><input class="t" id="aw" type="text" autocomplete="off">
   <label class="f">الصلاحية</label><select class="t" id="al"><option value="manager">مدير تشغيل — يدير السائقين والإعدادات</option><option value="viewer">مدير عام — عرض فقط بدون أي تغيير</option></select>
   <div class="err" id="ae"></div><button class="btn gold" id="aa">إضافة</button></div>`}</div>`;
  $('#ps').onclick=async()=>{try{await api('/api/me/password',{method:'POST',body:{current:$('#pc').value,password:$('#pn').value}});$('#pc').value=$('#pn').value='';$('#pe').textContent='';toast('تم تغيير كلمة المرور')}catch(e){$('#pe').textContent=e.code==='wrong_password'||e.message==='wrong_password'?'كلمة المرور الحالية غير صحيحة':e.code==='password_too_short'||e.message==='password_too_short'?'كلمة المرور الجديدة 4 أحرف على الأقل':errMsg(e)}};
  if($('#aa'))$('#aa').onclick=async()=>{const u=unorm($('#au').value);if(!/^[a-z0-9._-]+$/.test(u)){$('#ae').textContent='اسم المستخدم للدخول: حروف إنجليزية صغيرة وأرقام فقط (a-z 0-9 . _ -) بدون مسافات';return}if(String($('#aw').value).trim().length<4){$('#ae').textContent='كلمة المرور 4 أحرف على الأقل';return}try{await api('/api/admins',{method:'POST',body:{name:$('#an').value,u,password:$('#aw').value,level:$('#al').value}});accTab('تمت إضافة المستخدم ✓ اسم المستخدم للدخول: '+u)}catch(e){$('#ae').textContent=e.code==='exists'||e.message==='exists'?'اسم المستخدم مستخدم':e.code==='bad_request'||e.message==='bad_request'?'تأكد: اسم المستخدم حروف إنجليزية وأرقام، وكلمة المرور 4 أحرف أو أكثر':errMsg(e)}};
  document.querySelectorAll('[data-apw]').forEach(b=>b.onclick=async()=>{const p=prompt('كلمة المرور الجديدة لـ '+b.dataset.apw+' (4 أحرف على الأقل)');if(!p)return;try{await api('/api/admins/'+b.dataset.apw,{method:'PATCH',body:{password:p}});toast('تم تغيير كلمة المرور')}catch(e){toast(errMsg(e))}});
  document.querySelectorAll('[data-aact]').forEach(b=>b.onclick=async()=>{const[u,a]=b.dataset.aact.split('|');await api('/api/admins/'+u,{method:'PATCH',body:{active:a==='1'}});accTab()});
  document.querySelectorAll('[data-alvl]').forEach(b=>b.onclick=async()=>{const[u,l]=b.dataset.alvl.split('|');await api('/api/admins/'+u,{method:'PATCH',body:{level:l}});toast('تم تغيير الصلاحية');accTab()});
  document.querySelectorAll('[data-adel]').forEach(b=>b.onclick=async()=>{const[u,n]=b.dataset.adel.split('|');if(!confirm('حذف المستخدم الإداري '+n+'؟'))return;try{await api('/api/admins/'+u,{method:'DELETE'});toast('تم حذف المستخدم');accTab()}catch(e){toast(errMsg(e))}});
}

async function drvTab(flash){
  const viewer=session?.sub==='viewer';
  let list=[];try{list=await api('/api/drivers')}catch(e){if(e.message==='unauth')return}
  let cons={},cfg={pingSec:15};try{(await api('/api/consents')).consents.forEach(c=>cons[c.u]=c)}catch(_){}try{cfg=await api('/api/config')}catch(_){}
  let buses=[];
  $('#body').innerHTML=`<div class="rep">${flash?`<div class="banner ok" style="margin-bottom:14px">${esc(flash)}</div>`:''}${viewer?'<div class="banner warn" style="margin-bottom:14px">وضع العرض فقط — يمكنك الاطلاع على كل شيء بدون إجراء تغييرات.</div>':`<div class="card"><b>فترة إرسال الموقع من التطبيق</b><label class="f">بالثواني (من 5 إلى 300)</label><input class="t" id="ps2" inputmode="numeric" value="${cfg.pingSec||15}"><div class="err" id="pse"></div><button class="btn gold" id="psb">حفظ</button></div>
  <div class="card" style="margin-top:14px"><b>إضافة سائق</b>
   <label class="f">اسم المستخدم للدخول (حروف إنجليزية وأرقام فقط) — هو المعرف الوحيد للسائق ويظهر في كل مكان</label><input class="t" id="du" dir="ltr" style="text-align:left" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="shakeer">
   <label class="f">الجوال</label><input class="t" id="dp" inputmode="tel">
   <label class="f">الباص الافتراضي</label><input class="t" id="db" placeholder="B-101">
   <label class="f">كلمة المرور (4 أحرف على الأقل)</label><input class="t" id="dw" type="text" autocomplete="off">
   <div class="err" id="de"></div><button class="btn gold" id="da">إضافة</button></div>`}
   <h3 style="margin:18px 0 8px">السائقون (${list.length})</h3>
   <table><thead><tr><th>السائق</th><th>الباص</th><th>الحالة</th>${viewer?'':'<th></th>'}</tr></thead><tbody>${list.map(d=>`<tr><td><b>${esc(d.name)}</b><br><small style="color:#64748b">${esc(d.u)} · ${esc(d.phone||'')}</small></td><td>${esc(d.bus||'-')}</td><td>${d.active?'مفعّل':'موقوف'}<br><small style="color:${cons[d.u]?'#16a34a':'#d97706'}">${cons[d.u]?'وافق على التتبع '+fdate(cons[d.u].ts):'لم يوافق على التتبع بعد'}</small></td>
    ${viewer?'':`<td><button class="btn sm ghost" data-trk="${esc(d.u)}|${esc(d.name)}">المسارات</button> <button class="btn sm ghost" data-pw="${esc(d.u)}">كلمة مرور جديدة</button> <button class="btn sm ghost" data-act="${esc(d.u)}|${d.active?0:1}">${d.active?'إيقاف':'تفعيل'}</button> <button class="btn sm ghost" style="color:#c0392b" data-del="${esc(d.u)}|${esc(d.name)}">حذف</button></td>`}</tr>`).join('')}</tbody></table></div>`;
  if($('#da'))$('#da').onclick=async()=>{const u=unorm($('#du').value);if(!/^[a-z0-9._-]+$/.test(u)){$('#de').textContent='اسم المستخدم للدخول: حروف إنجليزية صغيرة وأرقام فقط (a-z 0-9 . _ -) بدون مسافات';return}if(String($('#dw').value).trim().length<4){$('#de').textContent='كلمة المرور 4 أحرف على الأقل';return}try{await api('/api/drivers',{method:'POST',body:{u,phone:$('#dp').value,bus:$('#db').value,password:$('#dw').value}});
      const b=$('#db').value.trim();if(b)await api('/api/buses',{method:'POST',body:{id:b}}).catch(()=>{});drvTab('تمت إضافة السائق ✓ اسم المستخدم للدخول: '+u)}catch(e){$('#de').textContent=e.code==='bad_request'?'تأكد: اسم المستخدم حروف إنجليزية وأرقام، وكلمة المرور 4 أحرف أو أكثر':e.code==='username_taken'?'اسم المستخدم مستخدم':errMsg(e)}};
  if($('#psb'))$('#psb').onclick=async()=>{try{await api('/api/settings',{method:'PUT',body:{pingSec:parseInt($('#ps2').value)}});$('#pse').textContent='';toast('تم الحفظ')}catch(e){$('#pse').textContent='القيمة من 5 إلى 300 ثانية'}};
  document.querySelectorAll('[data-pw]').forEach(b=>b.onclick=async()=>{const p=prompt('كلمة المرور الجديدة لـ '+b.dataset.pw+' (4 أحرف على الأقل)');if(!p)return;try{await api('/api/drivers/'+b.dataset.pw,{method:'PATCH',body:{password:p}});toast('تم تغيير كلمة المرور')}catch(e){toast(errMsg(e))}});
  document.querySelectorAll('[data-trk]').forEach(b=>b.onclick=()=>{const[u,n]=b.dataset.trk.split('|');shiftsDrawer(u,n)});
  document.querySelectorAll('[data-del]').forEach(b=>b.onclick=async()=>{const[u,n]=b.dataset.del.split('|');if(!confirm('حذف السائق '+n+' نهائيا؟ سيتم حذف بياناته وسجل دوامه ولا يمكن التراجع. (للإيقاف المؤقت استخدم إيقاف)'))return;if(!confirm('تأكيد أخير: حذف '+n+' نهائيا؟'))return;try{await api('/api/drivers/'+u,{method:'DELETE'});toast('تم حذف السائق');drvTab()}catch(e){toast(e.code==='shift_open'||e.message==='shift_open'?'السائق عنده دوام مفتوح، لازم يسلم الباص أولا':errMsg(e))}});
  document.querySelectorAll('[data-act]').forEach(b=>b.onclick=async()=>{const[u,a]=b.dataset.act.split('|');await api('/api/drivers/'+u,{method:'PATCH',body:{active:a==='1'}});drvTab()});
}


const CONSENT_V='2';
function consentModal(){return new Promise(res=>{const el=document.createElement('div');el.className='consent';
  el.innerHTML=`<div class="cbox"><h2>إشعار تتبع الموقع</h2>
  <p>هذا الهاتف والتطبيق ملك الشركة. قبل الاستخدام يرجى قراءة ما يلي:</p>
  <ul><li><b>ما الذي يُجمع:</b> موقعك الجغرافي (الإحداثيات والسرعة ودقة الموقع)، ونسبة بطارية الجهاز، ووقت كل تحديث.</li>
  <li><b>متى:</b> من لحظة استلام الباص حتى تسليمه، بشكل متواصل، حتى لو كانت الشاشة مقفلة أو التطبيق في الخلفية. يظهر إشعار دائم "تتبع الموقع شغال" أثناء ذلك. خارج الدوام يُرسل الموقع فقط أثناء فتح التطبيق.</li>
  <li><b>من يرى بياناتك:</b> مدير النظام ومدير التشغيل فقط.</li>
  <li><b>مدة الحفظ:</b> يُحفظ آخر موقع ويُستبدل مع كل تحديث. يُحفظ سجل مسار كل دوام (نقاط الموقع من الاستلام إلى التسليم) لمدة 90 يومًا لعرض المسار للإدارة، ثم يُحذف تلقائيًا. يُحفظ سجل الدوام (أوقات الاستلام والتسليم والوقت الإضافي) حسب سياسة الشركة.</li>
  <li><b>الغرض:</b> متابعة أسطول الباصات والسلامة وحساب الوقت الإضافي، ولا يُستخدم لغير ذلك.</li></ul>
  <p>بالضغط على "أوافق" تؤكد أنك قرأت الإشعار ووافقت على التتبع المذكور. تسجّل موافقتك مع التاريخ والوقت. إذا لم توافق لن تتمكن من استخدام التطبيق.</p>
  <button class="btn gold" id="c-ok">أوافق</button> <button class="btn ghost" id="c-no">لا أوافق</button></div>`;
  document.body.appendChild(el);
  el.querySelector('#c-ok').onclick=async()=>{el.querySelector('#c-ok').disabled=true;try{await api('/api/consent',{method:'POST',body:{version:CONSENT_V,device:(navigator.userAgent||'').slice(0,120)}});LS.setItem('bt.consent.'+session.u,CONSENT_V);el.remove();res(true)}catch(e){el.querySelector('#c-ok').disabled=false;toast(errMsg(e))}};
  el.querySelector('#c-no').onclick=()=>{el.remove();res(false)}})}
async function consentGate(){
  if(LS.getItem('bt.consent.'+session.u)===CONSENT_V)return true;
  try{const c=await api('/api/config');if(c.consented){LS.setItem('bt.consent.'+session.u,CONSENT_V);return true}}catch(e){if(e.message==='unauth')return false;toast(errMsg(e));return false}
  return await consentModal()}
async function driverInfo(){
  clearTimers();
  $('#app').innerHTML=`<div class="top"><div><b>BusPulse</b><small>${esc(session.name||session.u)} · ${esc(session.u)}</small></div><span class="sp"></span><button class="out" id="lo">خروج</button></div><div class="pad" id="inf"><p style="text-align:center;color:#64748b;padding:30px 0">جارٍ التحميل...</p></div>`;
  $('#lo').onclick=()=>{LS.removeItem('bt.session');session=null;route()};
  const dl=`<div class="card" style="text-align:center"><b>تطبيق السائق</b><p style="color:#64748b;font-size:14px;margin:6px 0 12px">استلام وتسليم الباص وتتبع الموقع يتم من تطبيق أندرويد فقط. حمّله وثبّته، ثم سجّل دخولك بنفس الحساب.</p><a class="dl" href="${APK_URL}">📲 تحميل التطبيق (أندرويد)</a><p style="color:#64748b;font-size:12.5px;margin:10px 0 0">بعد التحميل افتح الملف واسمح بالتثبيت من هذا المصدر إذا طُلب منك.</p></div>`;
  try{
    const m=await api('/api/me'),u=m.user||{},sh=m.shift;
    const row=x=>{const pend=x.auto_closed&&!x.reviewed;return `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #e2e8f0;font-size:14px"><span>${fdate(x.start_ts)} · ${esc(x.bus)}${pend?' <small style="color:#b45309">(قيد مراجعة الإدارة)</small>':''}</span><span>${hm(x.end_ts-x.start_ts)} ${!pend&&x.end_ts-x.start_ts>H8?`<b style="color:#dc2626">(+${hm(x.end_ts-x.start_ts-H8)})</b>`:''}</span></div>`};
    $('#inf').innerHTML=`<div class="card"><b>بياناتي</b><p style="margin:8px 0 0;font-size:14px;line-height:1.9">الاسم: ${esc(u.name||'')}<br>اسم المستخدم: ${esc(u.u||'')}<br>الجوال: ${esc(u.phone||'-')}<br>الباص الافتراضي: ${esc(u.bus||'-')}</p></div>
    <div class="card"><b>الدوام الحالي</b><p style="margin:8px 0 0;font-size:14px">${sh?`دوام مفتوح على الباص ${esc(sh.bus)} · بدأ ${ftime(sh.start_ts)}<br><small style="color:#64748b">للتسليم افتح التطبيق.</small>`:'لا يوجد دوام مفتوح.'}</p></div>
    <div class="card"><b>آخر الدوامات والوقت الإضافي</b>${(m.last||[]).length?(m.last||[]).map(row).join(''):'<p style="color:#64748b;margin:8px 0 0;font-size:14px">لا يوجد بعد.</p>'}</div>`+dl;
  }catch(e){if(e.message==='unauth')return;$('#inf').innerHTML=`<div class="banner bad">${esc(errMsg(e))}</div>`+dl}
}

function route(){if(!session)return loginView();if(session.role==='driver'&&LIVE&&NATIVE)regPush();session.role==='admin'?adminView():(LIVE?(NATIVE?driverNative():driverInfo()):driverView())}
initFleet();route();
if('serviceWorker'in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('sw.js').catch(()=>{});
})();
