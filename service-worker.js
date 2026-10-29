const CACHE='form-v23-randomizer-20261029';
const FILES=['./','./index.html','./manifest.webmanifest','./apple-touch-icon.png','./icon-192.png','./icon-512.png','./form-icon.svg','./form-upgrades-v18.js','./form-upgrades-v18.css','./form-upgrades-v19.js','./form-upgrades-v19.css','./form-anatomy-v20.js','./form-anatomy-v20.css','./form-upgrades-v20.js','./form-upgrades-v20.css','./form-randomizer-v23.js','./form-randomizer-v23.css'];
const EXERCISE_IMAGES=["./media/exercises/Bodyweight_Squat/0.jpg","./media/exercises/Bodyweight_Squat/1.jpg","./media/exercises/Butt_Lift_Bridge/0.jpg","./media/exercises/Butt_Lift_Bridge/1.jpg","./media/exercises/Bodyweight_Walking_Lunge/0.jpg","./media/exercises/Bodyweight_Walking_Lunge/1.jpg","./media/exercises/Dead_Bug/0.jpg","./media/exercises/Dead_Bug/1.jpg","./media/exercises/Incline_Push-Up_Medium/0.jpg","./media/exercises/Incline_Push-Up_Medium/1.jpg","./media/exercises/Side_Bridge/0.jpg","./media/exercises/Side_Bridge/1.jpg","./media/exercises/Plank/0.jpg","./media/exercises/Plank/1.jpg","./media/exercises/Superman/0.jpg","./media/exercises/Superman/1.jpg","./media/exercises/Single_Leg_Glute_Bridge/0.jpg","./media/exercises/Single_Leg_Glute_Bridge/1.jpg","./media/exercises/Split_Squats/0.jpg","./media/exercises/Split_Squats/1.jpg","./media/exercises/Incline_Push-Up_Close-Grip/0.jpg","./media/exercises/Incline_Push-Up_Close-Grip/1.jpg","./media/exercises/Alternate_Heel_Touchers/0.jpg","./media/exercises/Alternate_Heel_Touchers/1.jpg"];
self.addEventListener('install',e=>{
 e.waitUntil(caches.open(CACHE).then(async cache=>{
  await cache.addAll(FILES);
  await Promise.allSettled(EXERCISE_IMAGES.map(file=>cache.add(file)));
 }).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',e=>{
 e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',e=>{
 if(e.request.method!=='GET'||new URL(e.request.url).origin!==self.location.origin)return;
 e.respondWith(fetch(e.request).then(r=>{
  if(r.ok){const copy=r.clone();e.waitUntil(caches.open(CACHE).then(c=>c.put(e.request,copy)))}return r;
 }).catch(async()=>{
 const direct=await caches.match(e.request);
 if(direct)return direct;
 // Local assets use version query strings in HTML, while precache stores bare paths.
 // Fall back to the same local file without its version query, including exercise images.
 const url=new URL(e.request.url);
 if(url.search){url.search='';const plain=await caches.match(url.toString());if(plain)return plain}
 if(e.request.mode==='navigate')return await caches.match('./index.html')||Response.error();
 return Response.error();
}));
});
