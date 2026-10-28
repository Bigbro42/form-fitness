/* FORM. V18 – Trainingsablauf. Ergänzung zum bestehenden V17-Datenformat.
   Kein neues Datenschema: nutzt gespeicherte Übungspläne und deren Historie. */
(function(){
'use strict';
let restLength=60,restAuto=true,restUntil=0,restTick=null;
try{
 const n=Number(localStorage.getItem('form-rest-length'));
 if([45,60,90].includes(n))restLength=n;
 restAuto=localStorage.getItem('form-rest-auto')!=='false';
}catch(e){}
const currentSeconds=()=>Math.max(0,Math.ceil((restUntil-Date.now())/1000));
const displayRest=()=>{const n=currentSeconds();return n?String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0'):'Bereit'};
function refreshRest(){
 const p=document.querySelector('[data-rest-remaining]');if(p)p.textContent=displayRest();
 if(restTick&&currentSeconds()===0){clearInterval(restTick);restTick=null;restUntil=0}
}
function startRest(){restUntil=Date.now()+restLength*1000;if(restTick)clearInterval(restTick);restTick=setInterval(refreshRest,400);refreshRest()}
function stopRest(){restUntil=0;if(restTick){clearInterval(restTick);restTick=null}refreshRest()}
function enhance(){
 if(state.view==='detail'&&state.detailTab==='training'){
  const ex=list(state.index)[state.detailIndex];if(!ex)return;
  const prev=loggedHistory(ex.id,state.index).at(-1);
  const anchor=document.querySelector('.detail-section-title');
  if(prev&&anchor&&!document.querySelector('[data-copy-last]')){
   const btn=document.createElement('button');btn.className='copy-last';btn.type='button';btn.dataset.copyLast='';btn.textContent='↙ Letzte Satzwerte übernehmen';anchor.before(btn);
  }
  const tools=document.querySelector('.detail-tools');
  if(tools&&!document.querySelector('.rest-panel')){
   const p=document.createElement('section');p.className='rest-panel';p.setAttribute('aria-label','Pausentimer');
   p.innerHTML='<div class="rest-top"><div><strong>Pausentimer</strong><small>Dein Timer während der Übung</small></div><strong class="rest-time" data-rest-remaining></strong></div><div class="rest-choices"><button data-rest-length="45">45 Sek.</button><button data-rest-length="60">60 Sek.</button><button data-rest-length="90">90 Sek.</button><button data-rest-stop>Stopp</button></div><label class="rest-auto"><input type="checkbox" data-rest-auto> Automatisch nach jedem erledigten Satz starten</label>';
   tools.after(p);
   p.querySelectorAll('[data-rest-length]').forEach(b=>b.classList.toggle('selected',Number(b.dataset.restLength)===restLength));
   p.querySelector('[data-rest-auto]').checked=restAuto;
   refreshRest();
  }
 }
 if(state.view==='training'){
  const e=entry(state.index);const target=document.querySelector('.workout-complete');
  if(e.complete&&target&&!document.querySelector('.finish-recap')){
   const completed=Array.isArray(e.completedExercises)?e.completedExercises:[];
   const sets=completed.reduce((n,x)=>n+(x.sets||[]).filter(isVal).length,0);
   const confirmed=completed.reduce((n,x)=>n+(x.done||[]).filter(Boolean).length,0);
   const box=document.createElement('section');box.className='finish-recap';
   const h=document.createElement('strong');h.textContent='✓ Training abgeschlossen';
   const p=document.createElement('p');p.textContent=sets+' erfasste Sätze · '+confirmed+' abgehakt · '+(e.duration||'–')+' Minuten';
   const note=document.createElement('small');note.textContent='Die abgeschlossene Einheit ist als Momentaufnahme gesichert. Planänderungen verändern sie nicht.';
   box.append(h,p,note);target.before(box);
  }
 }
}
const oldRender=render;
render=function(){oldRender();enhance()};
document.addEventListener('click',function(ev){
 const set=ev.target.closest('[data-checkset]');
 if(set&&restAuto&&state.view==='detail'){
  const parts=set.dataset.checkset.split(':').map(Number);const x=list(state.index)[parts[0]];
  if(x&&isVal(x.sets?.[parts[1]])&&!x.done?.[parts[1]])startRest();
 }
 const copy=ev.target.closest('[data-copy-last]');
 if(copy){
  const a=clone(list(state.index)),n=state.detailIndex,x=a[n];if(!x)return;
  const last=loggedHistory(x.id,state.index).at(-1);if(!last)return;
  if(!Array.isArray(x.weights))x.weights=Array(x.sets.length).fill(null);
  last.lines.slice(0,x.sets.length).forEach((line,j)=>{
   if(!isVal(x.sets[j]))x.sets[j]=line.reps;
   if(!isVal(x.weights[j])&&line.weight!==null)x.weights[j]=line.weight;
  });
  updatePlan(state.index,a);render();
  const notice=document.createElement('p');notice.className='copy-info';notice.textContent='Vorwerte eingetragen. Prüfe sie und hake jeden Satz erst nach der Ausführung ab.';
  document.querySelector('[data-copy-last]')?.after(notice);
 }
 const duration=ev.target.closest('[data-rest-length]');
 if(duration){restLength=Number(duration.dataset.restLength);try{localStorage.setItem('form-rest-length',String(restLength))}catch(e){};document.querySelectorAll('[data-rest-length]').forEach(b=>b.classList.toggle('selected',b===duration));if(!currentSeconds())startRest();}
 if(ev.target.closest('[data-rest-stop]'))stopRest();
},true);
document.addEventListener('change',function(ev){
 if(ev.target.matches('[data-rest-auto]')){restAuto=ev.target.checked;try{localStorage.setItem('form-rest-auto',String(restAuto))}catch(e){}}
});
enhance();
})();