(function(){
var LS=window.localStorage,L=LS.getItem('bt.lang')==='en'?'en':'ar';
window.LANGX=L;
var P=[
['انتهت الجلسة. سجّل دخولك من جديد','Session expired. Please sign in again'],
['اسم المستخدم أو كلمة المرور غير صحيحة','Wrong username or password'],
['محاولات كثيرة. حاول بعد 15 دقيقة','Too many attempts. Try again in 15 minutes'],
['هذا الباص مستخدم عند سائق آخر','This bus is in use by another driver'],
['عندك دوام مفتوح. تم استرجاعه','You already have an open shift. It was restored'],
['عندك دوام مفتوح','You already have an open shift'],
['اسم المستخدم مستخدم','Username already taken'],
['بيانات غير صحيحة','Invalid data'],
['تعذر تنفيذ الطلب','Request failed'],
['لا يوجد اتصال بالخادم. نعيد المحاولة تلقائيًا.','No connection to the server. Retrying automatically.'],
['لا يوجد اتصال بالخادم','No connection to the server'],
['دخول السائقين ولوحة الإدارة','Driver sign-in and admin dashboard'],
['تتبع الباصات','Bus Tracker'],
['اسم المستخدم (إنجليزي)','Username (English letters)'],
['اسم المستخدم','Username'],
['كلمة المرور الحالية غير صحيحة','Current password is wrong'],
['كلمة المرور الحالية','Current password'],
['كلمة المرور الجديدة لـ ','New password for '],
['كلمة المرور الجديدة (8 أحرف على الأقل)','New password (at least 8 characters)'],
['كلمة المرور (8 أحرف على الأقل)','Password (at least 8 characters)'],
['(اتركها فارغة بدون تغيير)','(leave empty to keep it)'],
['(8 أحرف على الأقل)','(at least 8 characters)'],
['كلمة المرور 8 أحرف أو أكثر','password of 8+ characters'],
['كلمة المرور','Password'],
['كلمة مرور جديدة','New password'],
['تم تغيير كلمة المرور','Password changed'],
['النظام متصل بالخادم. استخدم اسم المستخدم وكلمة المرور اللي أعطاك إياها المدير.','Connected to the server. Use the username and password your manager gave you.'],
['دخول','Sign in'],
['خروج','Sign out'],
['عندك دوام شغال. تبي تخرج بدون تسليم الباص؟ الدوام يبقى شغال.','You have a shift running. Sign out without handing over the bus? The shift stays open.'],
['الموقع شغال','Location is on'],
['(دقة ','(accuracy '],
[' م)',' m)'],
['إذن الموقع مرفوض. فعّله من إعدادات المتصفح للموقع، ثم ','Location permission denied. Enable it in the browser settings for this site, then '],
['إعادة المحاولة','Try again'],
['هذا الجهاز أو المتصفح لا يدعم تحديد الموقع.','This device or browser does not support location.'],
['هذا الجهاز لا يدعم تحديد الموقع.','This device does not support location.'],
['بانتظار إذن الموقع. اضغط "سماح" في النافذة اللي ظهرت. ','Waiting for location permission. Tap "Allow" in the prompt. '],
['بانتظار إذن الموقع. اضغط "سماح" في النافذة. ','Waiting for location permission. Tap "Allow" in the prompt. '],
['طلب الإذن','Request permission'],
['التتبع شغال والشاشة ما بتنطفي أثناء الدوام. أبقِ التطبيق مفتوحًا.','Tracking is on and the screen stays awake during the shift. Keep the app open.'],
['الشاشة ممكن تنطفي ويوقف التتبع. ','The screen may turn off and tracking will stop. '],
['تفعيل إبقاء الشاشة','Keep screen awake'],
['المتصفح لا يدعم إبقاء الشاشة شغالة. اضبط الجوال على عدم إطفاء الشاشة، وأبقِ التطبيق مفتوحًا.','This browser cannot keep the screen awake. Set your phone to never turn the screen off and keep the app open.'],
['جارٍ التحميل...','Loading...'],
['الدوام 8 ساعات','8-hour shift'],
['من 8 ساعات','of 8 hours'],
['وقت إضافي: ','Overtime: '],
['وقت إضافي','Overtime'],
['الباص الافتراضي','Default bus'],
['الباص ','Bus '],
['الباص','Bus'],
['استلام الباص','Take over the bus'],
['تسليم الباص','Hand over the bus'],
['ما في باصات مضافة. كلم المدير.','No buses added. Contact your manager.'],
['بدأ الدوام. الله يعطيك العافية','Shift started. Have a good one'],
['تأكيد تسليم الباص وإنهاء الدوام؟','Confirm handing over the bus and ending the shift?'],
['تم التسليم. وقت إضافي ','Handed over. Overtime '],
['تم التسليم. شكرًا لك','Handed over. Thank you'],
[' · بدأ ',' · started '],
['آخر دوام مسجل','Last recorded shifts'],
['البطارية','Battery'],
['كم/س','km/h'],
['يرسل التطبيق موقعك وبطارية جوالك للإدارة أثناء فتحه. أبقِ التطبيق مفتوحًا وشاشة الجوال شغالة أثناء الدوام.','The app sends your location and phone battery to management while it is open. Keep the app open and the phone screen on during your shift.'],
['عند فتح التطبيق يطلب إذن الموقع. التطبيق يرسل موقعك للإدارة طوال الدوام. في هذه النسخة التجريبية البيانات تبقى على هذا الجهاز فقط.','The app asks for location permission. It sends your location to management during the shift.'],
['لوحة الإدارة','Admin dashboard'],
[' · مدير التشغيل',' · Operations manager'],
['مدير التشغيل','Operations manager'],
['الأدمن','Admin'],
['الخريطة المباشرة','Live map'],
['تقرير الوقت الإضافي','Overtime report'],
['السائقون','Drivers'],
['السائق','Driver'],
['حسابي','My account'],
['خريطة الشوارع','Streets'],
['قمر صناعي','Satellite'],
['تفصيلي (OSM)','Detailed (OSM)'],
['غير متصل أثناء الدوام','Offline during shift'],
['سائق غير متصل أثناء الدوام. آخر موقع معروف ظاهر على الخريطة.','driver(s) offline during shift. Last known location is shown on the map.'],
['عندك دوام شغال. سلّم الباص أولًا ثم اخرج.','You have an open shift. Hand over the bus first, then sign out.'],
['متحرك','Moving'],
['متوقف','Stopped'],
['لا يوجد اتصال','Offline'],
['خارج الدوام','Off shift'],
['موقع حقيقي','Live location'],
['آخر ظهور قبل ','Last seen '],
['لا يوجد سائقون على الخريطة بعد. يظهرون عند فتح التطبيق وإرسال الموقع.','No drivers on the map yet. They appear once the app is open and sending location.'],
['تعذر تحميل التقرير. ','Could not load the report. '],
['تصدير CSV','Export CSV'],
['تقرير PDF','PDF report'],
['الوقت الإضافي = أي وقت بعد 8 ساعات من استلام الباص حتى تسليمه','Overtime = any time beyond 8 hours from taking the bus until handing it over'],
['أيام فيها إضافي','Overtime days'],
['إجمالي الساعات','Total hours'],
['إجمالي الوقت','Total time'],
['ساعات إضافية','Overtime hours'],
['الإجمالي','Total'],
['أيام','Days'],
['بيانات الأشهر السابقة تجريبية. الدوام اللي يسجله سائق على هذا الجهاز يظهر هنا أيضًا. اضغط على اسم السائق لتفاصيل الأيام.','Tap a driver name for the day-by-day details.'],
['اسمح بالنوافذ المنبثقة لفتح التقرير','Allow pop-ups to open the report'],
['طباعة / حفظ كـ PDF','Print / Save as PDF'],
['أُنشئ ','Generated '],
['التاريخ','Date'],
['من','From'],
['إلى','To'],
['المدة','Duration'],
['إضافي','Overtime'],
['تغيير كلمة مروري (','Change my password ('],
['حفظ','Save'],
['نفس صلاحيات الأدمن، بحساب منفصل. ','Same powers as admin, separate account. '],
['الحساب الحالي: ','Current account: '],
[' (موقوف)',' (disabled)'],
['لم يتم إنشاؤه بعد.','Not created yet.'],
['الاسم','Name'],
['تحديث','Update'],
['إنشاء','Create'],
['حذف الحساب','Delete account'],
['تم حفظ حساب Operations manager','Operations manager account saved'],
['تم حفظ حساب مدير التشغيل','Operations manager account saved'],
['حذف حساب مدير التشغيل؟','Delete the operations manager account?'],
['حذف حساب Operations manager؟','Delete the operations manager account?'],
['تم الحذف','Deleted'],
['إضافة سائق','Add driver'],
['الجوال','Phone'],
['إضافة','Add'],
['تمت إضافة السائق','Driver added'],
['تأكد: اسم المستخدم حروف إنجليزية وأرقام، وكلمة المرور 8 أحرف أو أكثر','Check: username must be English letters and numbers, and password 8+ characters'],
['الحالة','Status'],
['مفعّل','Active'],
['موقوف','Disabled'],
['إيقاف','Deactivate'],
['تفعيل','Activate'],
['حذف السائق ','Delete driver '],
[' نهائيا؟ سيتم حذف بياناته وسجل دوامه ولا يمكن التراجع. (للإيقاف المؤقت استخدم إيقاف)',' permanently? Their data and shift history will be deleted. This cannot be undone. (To pause, use Deactivate)'],
['تأكيد أخير: حذف ','Final confirmation: delete '],
[' نهائيا؟',' permanently?'],
['تم حذف السائق','Driver deleted'],
['السائق عنده دوام مفتوح، لازم يسلم الباص أولا','This driver has an open shift. They must hand over the bus first'],
['حذف','Delete'],
['السائقين','Drivers'],
['تقرير الوقت الإضافي','Overtime report']
];
P.sort(function(a,b){return b[0].length-a[0].length});
var AR='ء-ي';
P.forEach(function(p){var a=p[0];if(a.length<=12&&/^[ء-ي]/.test(a)&&/[ء-ي]$/.test(a)){p.push(new RegExp('(?<![ء-ي])'+a.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'(?![ء-ي])','g'))}});
var NUM=/(\d+) د(?![ء-ي])/g;
function TR(s){if(L!=='en'||typeof s!=='string'||!/[ء-ي]/.test(s))return s;
 for(var i=0;i<P.length;i++){if(P[i][2]){s=s.replace(P[i][2],P[i][1])}else if(s.indexOf(P[i][0])>-1)s=s.split(P[i][0]).join(P[i][1])}
 return s.replace(NUM,'$1 min')}
window.TR=TR;
if(L==='en'){document.documentElement.lang='en';document.documentElement.dir='ltr';document.documentElement.classList.add('en');document.title='Bus Tracker';
 var oc=window.confirm,op=window.prompt,oa=window.alert;
 window.confirm=function(m){return oc.call(window,TR(m))};window.prompt=function(m,d){return op.call(window,TR(m),d)};window.alert=function(m){return oa.call(window,TR(m))};}
function walk(n){
 if(n.nodeType===3){var v=n.nodeValue,t=TR(v);if(t!==v)n.nodeValue=t;return}
 if(n.nodeType!==1)return;
 if(n.tagName==='SCRIPT'||n.tagName==='STYLE')return;
 if(L==='en'){['placeholder','title','aria-label'].forEach(function(a){var v=n.getAttribute&&n.getAttribute(a);if(v){var t=TR(v);if(t!==v)n.setAttribute(a,t)}})}
 for(var c=n.firstChild;c;c=c.nextSibling)walk(c)}
function toggle(){LS.setItem('bt.lang',L==='en'?'ar':'en');location.reload()}
function btn(){var b=document.createElement('button');b.type='button';b.className='lg';b.id='lg';b.textContent=L==='en'?'العربية':'English';b.onclick=toggle;return b}
function ensure(){
 if(document.getElementById('lg'))return;
 var o=document.querySelector('.top .out');if(o){o.parentNode.insertBefore(btn(),o);return}
 var lg=document.querySelector('.login');if(lg)lg.insertBefore(btn(),lg.firstChild)}
var busy=false;
function run(){if(busy)return;busy=true;try{if(L==='en')walk(document.body);ensure()}finally{busy=false}}
new MutationObserver(function(){run()}).observe(document.documentElement,{childList:true,subtree:true,characterData:true});
document.addEventListener('DOMContentLoaded',run);
})();
