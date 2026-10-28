/* FORM V19 – incremental, backward-compatible UX improvements. Runs after V18. */
(()=>{
'use strict';
const q = s => document.querySelector(s);
const nfmt = (n) => Number(n).toLocaleString('de-AT',{maximumFractionDigits:1});
const valid = v => v!==null && v!==undefined && String(v).trim()!=='' && Number.isFinite(Number(v)) && Number(v)>=0;
const currentSummary = () => {
 const x=list(state.index);
 const totalSets=x.reduce((n,a)=>n+(a.sets||[]).length,0);
 const logged=x.reduce((n,a)=>n+(a.sets||[]).filter(valid).length,0);
 const checked=x.reduce((n,a)=>n+(a.sets||[]).filter((v,j)=>valid(v)&&Boolean(a.done?.[j])).length,0);
 return {totalSets,logged,checked,exercises:x.length};
};
function exportBackup(){
 const data={version:5,exportedAt:new Date().toISOString(),records,plans,sex,randomSessions};
 const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
 const href=URL.createObjectURL(blob),link=document.createElement('a');
 link.href=href;link.download='FORM-Backup-'+new Date().toISOString().slice(0,10)+'.json';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(href),10000);
}
let finishedSheet=null;
function dismissSheet(){document.querySelector('.v19-finish-backdrop')?.remove();finishedSheet=null;}
function showFinishSheet(day){
 dismissSheet();const e=entry(day),xs=Array.isArray(e.completedExercises)?e.completedExercises:[];
 const total=xs.reduce((n,a)=>n+(a.sets||[]).filter(valid).length,0);
 const done=xs.reduce((n,a)=>n+(a.sets||[]).filter((v,j)=>valid(v)&&a.done?.[j]).length,0);
 const kg=xs.reduce((n,a)=>n+(a.sets||[]).reduce((s,v,j)=>s+(valid(v)&&valid(a.weights?.[j])?Number(v)*Number(a.weights[j]):0),0),0);
 const root=document.createElement('div');root.className='v19-finish-backdrop';root.setAttribute('role','presentation');
 const panel=document.createElement('section');panel.className='v19-finish-sheet';panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-labelledby','v19-finish-title');
 panel.innerHTML='<div class="v19-finish-icon" aria-hidden="true">✓</div><div class="v19-kicker">TRAINING ABGESCHLOSSEN</div><h2 id="v19-finish-title">Gut trainiert.</h2><p>Deine Einheit wurde gespeichert und erscheint in deinem Verlauf.</p><div class="v19-finish-stats"><div><b>'+xs.length+'</b><span>Übungen</span></div><div><b>'+total+'</b><span>Sätze erfasst</span></div><div><b>'+done+'</b><span>Abgehakt</span></div></div>'+(kg>0?'<p class="v19-finish-volume">Trainingsvolumen: '+nfmt(kg)+' kg</p>':'')+'<button class="v19-primary" data-v19-progress>Fortschritt ansehen</button><button class="v19-secondary" data-v19-backup>JSON-Sicherung herunterladen</button><button class="v19-textbtn" data-v19-close>Zurück zum Training</button>';
 root.append(panel);document.body.append(root);finishedSheet=root;
 panel.querySelector('[data-v19-progress]').onclick=()=>{dismissSheet();state.progressTab='overview';setView('stats')};
 panel.querySelector('[data-v19-backup]').onclick=exportBackup;
 panel.querySelector('[data-v19-close]').onclick=dismissSheet;
 root.addEventListener('click',e=>{if(e.target===root)dismissSheet()});
 panel.querySelector('[data-v19-progress]').focus({preventScroll:true});
}
function finalizeWorkout(){
 if(!['A','B'].includes(dayType(state.index)))return;
 const stats=currentSummary();
 if(stats.logged===0 && !confirm('Es wurden noch keine Sätze eingetragen. Training trotzdem abschließen?'))return;
 const day=state.index;
 edit(day,{complete:true,completedExercises:clone(list(day)),completedAt:new Date().toISOString()});
 state.view='training';render();window.scrollTo({top:0,behavior:'instant'});showFinishSheet(day);
}
function enhance(){
 if(state.view==='training'&&['A','B'].includes(dayType(state.index))){
  const hero=q('.session-summary');
  if(hero&&!q('.v19-session-card')){
   const {totalSets,logged,checked,exercises}=currentSummary();
   const pct=totalSets?Math.round(checked/totalSets*100):0;
   const e=entry(state.index);
   const card=document.createElement('section');card.className='v19-session-card';
   card.innerHTML='<div class="v19-session-top"><div><small>DEINE EINHEIT</small><b>'+(e.complete?'Abgeschlossen':checked?'Training läuft':'Bereit zum Training')+'</b></div><span>'+checked+' / '+totalSets+' Sätze</span></div><div class="v19-progress-track" role="progressbar" aria-label="Abgehakte Sätze" aria-valuemin="0" aria-valuemax="'+totalSets+'" aria-valuenow="'+checked+'"><i style="width:'+pct+'%"></i></div><div class="v19-session-bottom"><span>'+exercises+' Übungen · '+logged+' Sätze dokumentiert</span><button data-v19-resume>'+(e.complete?'Training ansehen':checked||logged?'Weitertrainieren':'Erste Übung starten')+' →</button></div>';
   hero.after(card);
   card.querySelector('[data-v19-resume]').onclick=()=>{const xs=list(state.index);const ni=xs.findIndex(x=>(x.sets||[]).some((v,j)=>!x.done?.[j]));state.detailIndex=Math.max(0,ni);state.detailTab='training';setView('detail');window.scrollTo({top:0,behavior:'instant'})};
  }
 }
 if(state.view==='detail'&&state.detailTab==='training'){
  const xs=list(state.index),ix=state.detailIndex,cur=xs[ix];if(!cur)return;
  const header=q('.detail-section-title');
  if(header&&!q('.v19-exercise-progress')){
   const checked=cur.sets?.filter((v,j)=>valid(v)&&cur.done?.[j]).length||0;
   const note=document.createElement('div');note.className='v19-exercise-progress';
   note.innerHTML='<div><span>ÜBUNG '+(ix+1)+' / '+xs.length+'</span><strong>'+checked+' von '+cur.sets.length+' Sätzen erledigt</strong></div><div class="v19-exercise-bars">'+cur.sets.map((v,j)=>'<i class="'+(valid(v)&&cur.done?.[j]?'done':'')+'"></i>').join('')+'</div>';
   header.before(note);
  }
  const rows=document.querySelectorAll('.detail-set-row'),last=loggedHistory(cur.id,state.index).filter(h=>h.complete).at(-1);
  if(last){rows.forEach((r,j)=>{if(r.querySelector('.v19-prior-line'))return;const old=last.lines[j];if(!old)return;const cap=document.createElement('small');cap.className='v19-prior-line';cap.textContent='Vorher: '+(old.weight!==null&&old.weight>0?nfmt(old.weight)+' kg × ':'')+nfmt(old.reps)+' '+(old.weight!==null&&old.weight>0?'Wdh.':setMetric(cur.id));r.after(cap)})}
  const saveButton=q('[data-detail-save]');if(saveButton){saveButton.classList.add('v19-saved-button');saveButton.textContent='✓ Automatisch gespeichert';saveButton.setAttribute('aria-label','Trainingseinträge werden automatisch gespeichert')}
  const next=q('[data-detail-next]');if(next){next.classList.add('v19-next-button');if(ix===xs.length-1)next.textContent='Training abschließen →'}
  const gallery=q('.form-gallery');if(gallery){gallery.classList.add('v19-gallery');gallery.querySelectorAll('img').forEach(img=>{const fallback=()=>{img.style.display='none';const item=img.closest('div');if(item){item.classList.add('v19-image-missing');let message=item.querySelector('.v19-img-note');if(!message){message=document.createElement('span');message.className='v19-img-note';message.textContent='Übungsbild derzeit nicht verfügbar';item.prepend(message)}}};img.addEventListener('error',fallback);if(img.complete&&img.naturalWidth===0)fallback()})}
 }
 // Avoid broken thumbnails when local image assets are not available.
 document.querySelectorAll('.photo-thumb img').forEach(img=>{
  const fallback=()=>{
   const holder=img.closest('.photo-thumb');if(!holder||holder.classList.contains('v19-thumb-fallback'))return;
   const id=Object.keys(exercisePhotos).find(k=>img.getAttribute('src')?.includes('/'+exercisePhotos[k]+'/'));
   holder.classList.add('v19-thumb-fallback');
   holder.innerHTML=id?miniIconFallback(id):'<span aria-hidden="true">◦</span>';
  };
  img.addEventListener('error',fallback);
  if(img.complete&&img.naturalWidth===0)fallback();
 });
 if(state.view==='randomizer'&&state.randomStage==='plan'&&activeRandom()&&!q('[data-v19-rscan]')){
  const add=q('[data-radd]');if(add){const b=document.createElement('button');b.className='v19-scan-add';b.dataset.v19Rscan='';b.textContent='Kamera · Übung mit Foto hinzufügen';add.after(b);b.onclick=()=>{state.scanReturn='randomizer';state.scanCandidate='';state.scanQuery='';state.scanPhoto=null;setView('scan')}}
 }
 if(state.view==='randomizer'&&state.randomStage==='detail'){
  const a=q('.random-context');const x=activeRandom()?.exercises[state.randomDetailIndex];if(a&&x&&!q('.v19-random-media')){
   const media=document.createElement('div');media.className='v19-random-media';media.innerHTML=exerciseMedia(x.id);a.after(media);
  }
 }
}
// Keep V18's render extensions and implement this release as a separate layer.
const previousRender=render;render=function(){previousRender();enhance()};
// Capture before V15's click handler: final exercise must actually finish the session.
window.addEventListener('click',e=>{
 const next=e.target.closest('[data-detail-next]');
 if(next && state.view==='detail' && state.detailTab==='training' && state.detailIndex===list(state.index).length-1){e.preventDefault();e.stopImmediatePropagation();finalizeWorkout();return}
 const complete=e.target.closest('[data-complete]');
 if(complete && ['A','B'].includes(dayType(state.index)) && state.view==='training'){
  e.preventDefault();e.stopImmediatePropagation();
  if(entry(state.index).complete){if(confirm('Training wieder öffnen? Dadurch wird der abgeschlossene Verlauf für diese Einheit entfernt.')){edit(state.index,{complete:false,completedExercises:null,completedAt:null});render()}return}
  finalizeWorkout();return;
 }
},true);
window.addEventListener('keydown',e=>{if(e.key==='Escape'&&finishedSheet)dismissSheet()});
// Ensure camera search cannot accidentally use a stale candidate from a previous text query.
document.addEventListener('input',e=>{if(e.target?.id==='scan-search')state.scanCandidate=''},true);
enhance();
})();
