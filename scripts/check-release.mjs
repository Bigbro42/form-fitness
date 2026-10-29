import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const root=process.cwd();
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const exists=file=>fs.existsSync(path.join(root,file));
const errors=[];
function check(label,fn){try{fn();console.log('PASS',label)}catch(e){errors.push(label+': '+e.message);console.error('FAIL',label,e.message)}}
const html=read('index.html'),sw=read('service-worker.js'),manifest=JSON.parse(read('manifest.webmanifest'));
check('inline app JavaScript parses',()=>{
 const inline=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)];
 assert.ok(inline.length>0);
 inline.forEach((m,i)=>new vm.Script(m[1],{filename:'inline-'+i+'.js'}));
});
check('external JavaScript and CSS references exist',()=>{
 const refs=[...html.matchAll(/<(?:script|link)\b[^>]*(?:src|href)="([^"]+)"[^>]*>/gi)].map(m=>m[1]);
 for(const ref of refs){
  if(/^https?:|^data:/.test(ref))continue;
  const p=decodeURIComponent(ref.split('?')[0]).replace(/^\.\//,'');
  assert.ok(exists(p),'Missing file: '+p);
  if(p.endsWith('.js'))new vm.Script(read(p),{filename:p});
 }
 assert.ok(refs.includes('./form-anatomy-v20.js?v=20'),'Anatomy atlas not linked');
});
check('PWA manifest and icons valid',()=>{
 assert.ok(manifest.name&&manifest.short_name&&manifest.start_url);
 for(const ico of manifest.icons||[])assert.ok(exists(ico.src.split('?')[0].replace(/^\.\//,'')),'Missing icon: '+ico.src);
});
check('service worker version and syntax',()=>{
 new vm.Script(sw,{filename:'service-worker.js'});
 assert.match(sw,/const CACHE='form-v\d+-/,'Service worker cache must be versioned');
});
check('offline images exist',()=>{
 const ids=['Bodyweight_Squat','Butt_Lift_Bridge','Bodyweight_Walking_Lunge','Dead_Bug','Incline_Push-Up_Medium','Side_Bridge','Plank','Superman','Single_Leg_Glute_Bridge','Split_Squats','Incline_Push-Up_Close-Grip','Alternate_Heel_Touchers'];
 for(const id of ids)for(const n of [0,1])assert.ok(exists('media/exercises/'+id+'/'+n+'.jpg'),'Missing exercise photo: '+id+'/'+n);
});
check('third-party licenses bundled',()=>{
 for(const p of ['third-party/body-muscles-LICENSE.txt','third-party/body-muscles-NOTICE.txt'])assert.ok(exists(p),'Missing attribution: '+p);
});
if(errors.length){console.error(errors.length+' quality checks failed.');process.exit(1)}
console.log('All FORM. release checks passed.');
