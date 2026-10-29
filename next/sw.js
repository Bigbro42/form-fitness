// FORM. service worker. Generated at build time from src/sw-template.js.
// App files are precached; navigation falls back to the cached app shell when offline.
const VERSION = '1793288354087';
const CACHE = `form-next-${VERSION}`;
const PRECACHE = ["./","assets/index-BBG_0hiU.css","assets/index-Cknb5-Ks.js"];
// Exercise photos: cached in the background after activation, so the first start stays fast.
const MEDIA = ["media/exercises/Air_Bike/0.jpg","media/exercises/Air_Bike/1.jpg","media/exercises/Alternate_Heel_Touchers/0.jpg","media/exercises/Alternate_Heel_Touchers/1.jpg","media/exercises/Band_Pull_Apart/0.jpg","media/exercises/Band_Pull_Apart/1.jpg","media/exercises/Barbell_Bench_Press_-_Medium_Grip/0.jpg","media/exercises/Barbell_Bench_Press_-_Medium_Grip/1.jpg","media/exercises/Barbell_Deadlift/0.jpg","media/exercises/Barbell_Deadlift/1.jpg","media/exercises/Barbell_Hip_Thrust/0.jpg","media/exercises/Barbell_Hip_Thrust/1.jpg","media/exercises/Barbell_Squat/0.jpg","media/exercises/Barbell_Squat/1.jpg","media/exercises/Bent_Over_Barbell_Row/0.jpg","media/exercises/Bent_Over_Barbell_Row/1.jpg","media/exercises/Bicycling_Stationary/0.jpg","media/exercises/Bicycling_Stationary/1.jpg","media/exercises/Bodyweight_Squat/0.jpg","media/exercises/Bodyweight_Squat/1.jpg","media/exercises/Bodyweight_Walking_Lunge/0.jpg","media/exercises/Bodyweight_Walking_Lunge/1.jpg","media/exercises/Butt_Lift_Bridge/0.jpg","media/exercises/Butt_Lift_Bridge/1.jpg","media/exercises/Cable_Crossover/0.jpg","media/exercises/Cable_Crossover/1.jpg","media/exercises/Calf_Stretch_Hands_Against_Wall/0.jpg","media/exercises/Calf_Stretch_Hands_Against_Wall/1.jpg","media/exercises/Childs_Pose/0.jpg","media/exercises/Childs_Pose/1.jpg","media/exercises/Dead_Bug/0.jpg","media/exercises/Dead_Bug/1.jpg","media/exercises/Dumbbell_Bench_Press/0.jpg","media/exercises/Dumbbell_Bench_Press/1.jpg","media/exercises/Dumbbell_Bicep_Curl/0.jpg","media/exercises/Dumbbell_Bicep_Curl/1.jpg","media/exercises/Dumbbell_Floor_Press/0.jpg","media/exercises/Dumbbell_Floor_Press/1.jpg","media/exercises/Dumbbell_Lunges/0.jpg","media/exercises/Dumbbell_Lunges/1.jpg","media/exercises/Dumbbell_Shoulder_Press/0.jpg","media/exercises/Dumbbell_Shoulder_Press/1.jpg","media/exercises/Dumbbell_Step_Ups/0.jpg","media/exercises/Dumbbell_Step_Ups/1.jpg","media/exercises/Elliptical_Trainer/0.jpg","media/exercises/Elliptical_Trainer/1.jpg","media/exercises/Face_Pull/0.jpg","media/exercises/Face_Pull/1.jpg","media/exercises/Front_Squat_Clean_Grip/0.jpg","media/exercises/Front_Squat_Clean_Grip/1.jpg","media/exercises/Glute_Kickback/0.jpg","media/exercises/Glute_Kickback/1.jpg","media/exercises/Hammer_Curls/0.jpg","media/exercises/Hammer_Curls/1.jpg","media/exercises/Incline_Push-Up_Close-Grip/0.jpg","media/exercises/Incline_Push-Up_Close-Grip/1.jpg","media/exercises/Incline_Push-Up_Medium/0.jpg","media/exercises/Incline_Push-Up_Medium/1.jpg","media/exercises/Kneeling_Hip_Flexor/0.jpg","media/exercises/Kneeling_Hip_Flexor/1.jpg","media/exercises/Lateral_Raise_-_With_Bands/0.jpg","media/exercises/Lateral_Raise_-_With_Bands/1.jpg","media/exercises/Leg_Extensions/0.jpg","media/exercises/Leg_Extensions/1.jpg","media/exercises/Leg_Press/0.jpg","media/exercises/Leg_Press/1.jpg","media/exercises/Lying_Leg_Curls/0.jpg","media/exercises/Lying_Leg_Curls/1.jpg","media/exercises/Machine_Bench_Press/0.jpg","media/exercises/Machine_Bench_Press/1.jpg","media/exercises/Machine_Shoulder_Military_Press/0.jpg","media/exercises/Machine_Shoulder_Military_Press/1.jpg","media/exercises/Mountain_Climbers/0.jpg","media/exercises/Mountain_Climbers/1.jpg","media/exercises/One-Arm_Dumbbell_Row/0.jpg","media/exercises/One-Arm_Dumbbell_Row/1.jpg","media/exercises/Pallof_Press/0.jpg","media/exercises/Pallof_Press/1.jpg","media/exercises/Plank/0.jpg","media/exercises/Plank/1.jpg","media/exercises/Pull_Through/0.jpg","media/exercises/Pull_Through/1.jpg","media/exercises/Reverse_Crunch/0.jpg","media/exercises/Reverse_Crunch/1.jpg","media/exercises/Romanian_Deadlift/0.jpg","media/exercises/Romanian_Deadlift/1.jpg","media/exercises/Rope_Jumping/0.jpg","media/exercises/Rope_Jumping/1.jpg","media/exercises/Rowing_Stationary/0.jpg","media/exercises/Rowing_Stationary/1.jpg","media/exercises/Seated_Cable_Rows/0.jpg","media/exercises/Seated_Cable_Rows/1.jpg","media/exercises/Shoulder_Circles/0.jpg","media/exercises/Shoulder_Circles/1.jpg","media/exercises/Side_Bridge/0.jpg","media/exercises/Side_Bridge/1.jpg","media/exercises/Side_Lateral_Raise/0.jpg","media/exercises/Side_Lateral_Raise/1.jpg","media/exercises/Single_Leg_Glute_Bridge/0.jpg","media/exercises/Single_Leg_Glute_Bridge/1.jpg","media/exercises/Split_Squats/0.jpg","media/exercises/Split_Squats/1.jpg","media/exercises/Standing_Cable_Wood_Chop/0.jpg","media/exercises/Standing_Cable_Wood_Chop/1.jpg","media/exercises/Standing_Dumbbell_Calf_Raise/0.jpg","media/exercises/Standing_Dumbbell_Calf_Raise/1.jpg","media/exercises/Standing_Dumbbell_Triceps_Extension/0.jpg","media/exercises/Standing_Dumbbell_Triceps_Extension/1.jpg","media/exercises/Standing_Military_Press/0.jpg","media/exercises/Standing_Military_Press/1.jpg","media/exercises/Stiff-Legged_Dumbbell_Deadlift/0.jpg","media/exercises/Stiff-Legged_Dumbbell_Deadlift/1.jpg","media/exercises/Superman/0.jpg","media/exercises/Superman/1.jpg","media/exercises/Triceps_Pushdown/0.jpg","media/exercises/Triceps_Pushdown/1.jpg","media/exercises/Wide-Grip_Lat_Pulldown/0.jpg","media/exercises/Wide-Grip_Lat_Pulldown/1.jpg","media/exercises/Worlds_Greatest_Stretch/0.jpg","media/exercises/Worlds_Greatest_Stretch/1.jpg"];
const MEDIA_CACHE = 'form-next-media';

async function warmMedia() {
  const cache = await caches.open(MEDIA_CACHE);
  for (const file of MEDIA) {
    if (await cache.match(file)) continue;
    try {
      const res = await fetch(file);
      if (res.ok) await cache.put(file, res);
    } catch {
      return; // offline or interrupted: the next start continues
    }
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    // Only remove our own old caches; the legacy app's caches belong to the legacy app.
    await Promise.all(keys.filter((k) => k.startsWith('form-next-') && k !== CACHE && k !== MEDIA_CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
  void warmMedia();
});

self.addEventListener('message', (event) => {
  if (event.data === 'skip-waiting') self.skipWaiting();
  if (event.data === 'warm-media') event.waitUntil(warmMedia());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  if (request.mode === 'navigate') {
    // Network first for the page itself, so updates arrive; cached shell when offline.
    event.respondWith(fetch(request).catch(async () => (await caches.match('./index.html', { ignoreSearch: true })) ?? (await caches.match('./')) ?? Response.error()));
    return;
  }
  // Built files have content hashes: cache first is safe.
  event.respondWith((async () => {
    const cached = await caches.match(request, { ignoreSearch: true });
    if (cached) return cached;
    const response = await fetch(request);
    if (response.ok && new URL(request.url).pathname.includes('/media/')) {
      const copy = response.clone();
      caches.open(MEDIA_CACHE).then((cache) => cache.put(request, copy));
    }
    return response;
  })());
});
