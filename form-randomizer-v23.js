/* FORM. V23: photo-led, transparent random workout experience. Depends on the V22 core.
 * Historical records and storage keys are deliberately unchanged. */
(()=>{
'use strict';
const oldRandomizer=randomizer;
const oldWire=wire;
const oldModifyRandom=modifyRandom;
const oldRandomHistory=randomHistory;
const oldRender=render;

// A draft workout is not a finished workout and must not inflate charts or personal bests.
randomHistory=function(id,beforeDate){
  return oldRandomHistory(id,beforeDate).filter(h=>!h.randomId || randomSessions.some(s=>s.id===h.randomId&&s.completed));
};
modifyRandom=function(fn){
  if(activeRandom()?.completed){alert('Dieses Training ist abgeschlossen. Öffne es zuerst wieder, bevor du Änderungen machst.');return}
  return oldModifyRandom(fn);
};

const historyExcludingCurrent=(id,rs)=>loggedHistory(id).filter(h=>h.randomId!==rs.id);
function fromLast(id,rs){return historyExcludingCurrent(id,rs).at(-1)}
function valuesFor(id,rs){
  const a=historyExcludingCurrent(id,rs);
  if(!a.length)return {last:null,best:null};
  const weighted=a.some(h=>h.maxKg!==null);
  return {last:a.at(-1),best:Math.max(...a.map(h=>weighted?(h.maxKg||0):h.topReps)),weighted};
}
function shortDate(s){try{return new Date(s+'T12:00:00').toLocaleDateString('de-AT',{day:'numeric',month:'short'})}catch{return s}}
function cardImage(id){
  const ex=catalog[id]||{name:id};
  const src=photoSrc(id);
  const alt=esc(ex.name)+' · Übungsdemonstration';
  return `<span class="v23-thumb ${src?'':'is-missing'}">${src?`<img loading="lazy" src="${src}" alt="${alt}" onerror="this.hidden=true;this.parentElement.classList.add('is-missing')">`:''}<span class="v23-fallback"><strong>FORM.</strong><small>Kein Foto</small></span></span>`;
}
const labelFor={chest:'Brust',back:'Rücken',shoulders:'Schultern',arms:'Arme',legs:'Beine',glutes:'Gesäß',abs:'Core'};
function muscleSummary(ex){return (ex.muscles||[]).slice(0,2).map(m=>muscleNames[m]||labelFor[m]||m).join(' · ')||'Körpergewicht'}
function moveTypeLabel(id){return {squat:'Kniebeuge',lunge:'Ausfallschritt',bridge:'Hüftstreckung',hinge:'Hüftbeuge',push:'Drücken',back:'Rücken',core:'Stabilität',calf:'Waden'}[movement[id]]||'Beweglichkeit'}
function alternatives(rs,n){
  const current=rs.exercises[n];if(!current)return [];
  const taken=new Set(rs.exercises.map(e=>e.id));
  const pool=[...new Set([...(focusPools[rs.focus]||focusPools.all),...Object.keys(catalog)])];
  const primary=catalog[current.id]?.muscles||[];
  return pool.filter(id=>catalog[id]&&!taken.has(id)).map(id=>{
    const sameMove=movement[id]===movement[current.id]?4:0;
    const shared=(catalog[id].muscles||[]).filter(x=>primary.includes(x)).length;
    return {id,score:sameMove+shared*2+(photoSrc(id)?0.4:0)};
  }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||catalog[a.id].name.localeCompare(catalog[b.id].name,'de')).slice(0,6);
}
function statsFor(rs){
 const all=rs.exercises.flatMap(x=>(x.sets||[]).map((v,j)=>({v,done:!!x.done?.[j]})));
 return {total:all.length,entered:all.filter(x=>isVal(x.v)).length,checked:all.filter(x=>x.done&&isVal(x.v)).length};
}
function workoutPlan(rs){
 const st=statsFor(rs),finished=!!rs.completed;
 const cards=rs.exercises.map((item,n)=>{
   const ex=catalog[item.id]||{name:item.id,muscles:[],target:''};
   const v=valuesFor(item.id,rs);
   const recorded=(item.sets||[]).filter(isVal).length;
   const checked=(item.done||[]).filter(Boolean).length;
   const open=state.v23ReplaceIndex===n && !finished;
   return `<article class="v23-exercise" data-rdrag="${n}" draggable="${!finished}">
     <button class="v23-exercise-main" data-rdetail="${n}" aria-label="${esc(ex.name)} öffnen">
       ${cardImage(item.id)}<span class="v23-exercise-copy"><span class="v23-move">${esc(moveTypeLabel(item.id))} · ${esc(muscleSummary(ex))}</span>
       <strong>${esc(ex.name)}</strong><span class="v23-sub">${item.sets.length} Sätze · ${esc(ex.target||setMetric(item.id))}</span>
       ${v.last?`<span class="v23-last"><b>Zuletzt:</b> ${esc(lastSetSummary(v.last,item.id,1))} · ${shortDate(v.last.date)}</span>`:'<span class="v23-last">Noch kein vorheriger Eintrag</span>'}
       </span><span class="v23-chevron">›</span></button>
     <div class="v23-exercise-foot"><span class="v23-progress">${recorded?`${recorded} von ${item.sets.length} Sätzen erfasst`:'Noch keine Sätze erfasst'}${checked?` · ${checked} abgehakt`:''}</span>
       <div class="v23-card-actions">${!finished?`<button data-rreplace="${n}" aria-expanded="${open}" aria-label="${esc(ex.name)} ersetzen">Ersetzen</button><button data-rmove="${n}:-1" ${n===0?'disabled':''} aria-label="Nach oben">↑</button><button data-rmove="${n}:1" ${n===rs.exercises.length-1?'disabled':''} aria-label="Nach unten">↓</button><button data-rremove="${n}" aria-label="${esc(ex.name)} entfernen">×</button>`:`<span class="v23-closed">Abgeschlossen</span>`}</div></div>
     ${open?`<div class="v23-replace"><div class="v23-replace-head"><b>Passende Alternative wählen</b><button data-rcancel>Schließen</button></div><p>Ähnliche Bewegung oder Muskelgruppen. Deine bisherigen Einträge bleiben erhalten.</p><div class="v23-alt-list">${alternatives(rs,n).map(({id})=>`<button data-rchoose="${n}:${id}">${cardImage(id)}<span><b>${esc(catalog[id].name)}</b><small>${esc(muscleSummary(catalog[id]))}</small></span><span>＋</span></button>`).join('')||'<p>Keine passende Alternative gefunden. Nutze „Übung hinzufügen“.</p>'}</div></div>`:''}
   </article>`;
 }).join('');
 return `<div class="v23-title"><span>FORM. / ZUFALL</span><h1>Dein Trainingsplan</h1><p>Flexibel zusammengestellt. Du entscheidest, was du wirklich trainierst.</p></div>
  <div class="v23-workout-top"><div><span class="v23-kicker">${esc(focusLabels[rs.focus]||'Ganzkörper')}</span><h2>${rs.exercises.length} Übungen</h2><p>Geplant: ${rs.duration} Minuten · ${esc(rs.date)}</p></div><span class="v23-session-state">${finished?'✓ Abgeschlossen':'Entwurf'}</span></div>
  <div class="v23-overview"><span><strong>${st.entered}</strong> / ${st.total} Sätze erfasst</span><span>${st.checked} abgehakt</span></div>
  <div class="v23-list">${cards||'<div class="v23-empty">Dein Plan ist leer. Füge eine Übung hinzu.</div>'}</div>
  ${!finished?`<div class="v23-add-actions"><button data-radd>＋ Übung über Körperkarte</button><button data-v23-new-from-library>＋ Aus Übungsbibliothek</button></div>`:''}
  <div class="v23-bottom"><button class="v23-primary" data-rcomplete ${finished?'disabled':''}>${finished?'✓ Training abgeschlossen':'Training abschließen'}</button>
  ${finished?`<button class="v23-secondary" data-rreopen>Einheit wieder öffnen</button>`:`<button class="v23-secondary" data-rsetup>Anderes Training erstellen</button>`}</div>
  ${finished?`<div class="v23-summary"><b>Training gespeichert</b><p>${st.entered} Sätze dokumentiert. Die Übungen erscheinen jetzt auch im normalen Verlauf.</p><button data-v23-progress>Fortschritt ansehen →</button></div>`:''}`;
}
function randomDetail(rs){
 const n=Math.max(0,Math.min(rs.exercises.length-1,Number(state.randomDetailIndex)||0));const x=rs.exercises[n];if(!x){state.randomStage='plan';return workoutPlan(rs)}
 const ex=catalog[x.id]||{name:x.id,tip:'',target:'',easy:'',hard:''};const h=valuesFor(x.id,rs);
 return `<div class="v23-detail-top"><button class="v23-back" data-rback-plan aria-label="Zurück zum Plan">‹</button><span>ÜBUNG ${n+1} / ${rs.exercises.length}</span><button class="v23-history" data-rhistory="${x.id}">Verlauf ↗</button></div>
  <div class="v23-detail-heading"><h1>${esc(ex.name)}</h1><p>${esc(muscleSummary(ex))} · ${esc(moveTypeLabel(x.id))}</p></div>
  ${exerciseMedia(x.id)}
  <div class="v23-last-box"><span>ZULETZT</span><b>${h.last?esc(lastSetSummary(h.last,x.id,3)):'Noch keine erfassten Einheiten'}</b>${h.last?`<small>${shortDate(h.last.date)}</small>`:''}${h.best!==null?`<small>Bestleistung: ${fmt(h.best)} ${h.weighted?'kg':setMetric(x.id)}</small>`:''}</div>
  <div class="v23-detail-set-header"><h2>Deine Sätze</h2><span>${x.sets.length} Sätze</span></div>
  <div class="detail-set-head"><span>Satz</span><span>Gewicht (kg)</span><span>${setMetric(x.id)}</span><span>✓</span></div>
  <div class="v23-sets">${x.sets.map((v,j)=>`<div class="detail-set-row"><b>${j+1}</b><input aria-label="Gewicht Satz ${j+1}" type="number" min="0" step="0.5" inputmode="decimal" data-rweight="${j}" value="${esc(x.weights?.[j]??'')}" placeholder="–" ${rs.completed?'disabled':''}><input aria-label="${setMetric(x.id)} Satz ${j+1}" type="number" min="0" inputmode="numeric" data-rset="${j}" value="${esc(v??'')}" placeholder="–" ${rs.completed?'disabled':''}><button class="set-check ${x.done?.[j]?'checked':''}" data-rcheck="${j}" ${rs.completed?'disabled':''} aria-label="Satz ${j+1} abhaken">${x.done?.[j]?'✓':'○'}</button></div>`).join('')}</div>
  ${rs.completed?'':`<div class="detail-tools"><button data-raddset>＋ Satz</button><button data-rdelset ${x.sets.length<=1?'disabled':''}>− Letzten Satz</button></div><label class="v23-variant">Variante<select class="plaininput" data-rvariant><option value="easy" ${x.variant==='easy'?'selected':''}>Leichter</option><option value="standard" ${x.variant==='standard'?'selected':''}>Standard</option><option value="hard" ${x.variant==='hard'?'selected':''}>Schwerer</option></select></label>`}
  <details class="v23-guide"><summary>Ausführung & Sicherheit</summary><p>${esc(ex.tip||'Langsam und kontrolliert ausführen.')}</p><p>Leichter: ${esc(ex.easy||'')}</p><p>Schwerer: ${esc(ex.hard||'')}</p></details>
  <div class="v23-detail-next"><button class="v23-secondary" data-rback-plan>Zurück zum Plan</button>${n<rs.exercises.length-1?`<button class="v23-primary" data-rnext>Weiter: nächste Übung →</button>`:`<button class="v23-primary" data-rback-plan>Alle Übungen ansehen →</button>`}</div>`;
}
randomizer=function(){
 const rs=activeRandom();
 if(state.randomStage==='setup'||!rs){
   const base=oldRandomizer();
   const helpful=`<div class="v23-setup-note"><b>So funktioniert der Vorschlag</b><p>Wir mischen passende Bewegungen für deinen Fokus und vermeiden möglichst ähnliche Übungen. Du kannst jede Übung anschließend austauschen. Fotos sind nur dort verfügbar, wo die Übung korrekt bebildert ist.</p></div>`;
   return base.replace('<div class="random-note">',helpful+'<div class="random-note">');
 }
 return state.randomStage==='detail'?randomDetail(rs):workoutPlan(rs);
};
wire=function(){
 oldWire();
 if(state.view!=='randomizer')return;
 const rs=activeRandom();if(!rs)return;
 document.querySelectorAll('[data-rreplace]').forEach(b=>b.onclick=()=>{state.v23ReplaceIndex=Number(b.dataset.rreplace);render()});
 document.querySelectorAll('[data-rcancel]').forEach(b=>b.onclick=()=>{state.v23ReplaceIndex=null;render()});
 document.querySelectorAll('[data-rchoose]').forEach(b=>b.onclick=()=>{
  const [n,id]=b.dataset.rchoose.split(':');const at=Number(n);const old=rs.exercises[at];
  if(!old||!catalog[id]||rs.exercises.some(x=>x.id===id))return;
  if((old.sets||[]).some(isVal)&&!confirm('Diese Übung enthält bereits Satzwerte. Beim Ersetzen würden die Werte dieser Übung im aktuellen Entwurf verloren gehen. Trotzdem ersetzen?'))return;
  state.v23ReplaceIndex=null;
  modifyRandom(s=>{const v=s.exercises[at];s.exercises[at]={id,variant:v.variant||'standard',sets:v.sets.map(()=>null),weights:v.sets.map(()=>null),done:[]}});
 });
 document.querySelectorAll('[data-rcomplete]').forEach(b=>b.onclick=()=>{
  if(rs.completed)return;
  const st=statsFor(rs);
  if(!st.entered){alert('Noch kein Satz dokumentiert. Erfasse mindestens einen Satz, bevor du das Training abschließt.');return}
  if(st.checked===0&&!confirm('Du hast Werte eingetragen, aber noch keinen Satz abgehakt. Training trotzdem abschließen?'))return;
  rs.completed=true;rs.completedAt=new Date().toISOString();saveRandom();render();
 });
 document.querySelectorAll('[data-rreopen]').forEach(b=>b.onclick=()=>{
  if(!confirm('Training wieder öffnen? Danach können seine gespeicherten Werte verändert werden.'))return;
  rs.completed=false;rs.completedAt=null;saveRandom();render();
 });
 document.querySelectorAll('[data-rnext]').forEach(b=>b.onclick=()=>{state.randomDetailIndex=Math.min(rs.exercises.length-1,state.randomDetailIndex+1);saveRandom();render();window.scrollTo(0,0)});
 document.querySelectorAll('[data-v23-progress]').forEach(b=>b.onclick=()=>{state.progressTab='overview';setView('stats')});
 document.querySelectorAll('[data-v23-new-from-library]').forEach(b=>b.onclick=()=>{state.adding=true;state.addingToRandom=true;state.muscle=state.randomFocus==='abs'?'abs':state.randomFocus==='upper'?'chest':'legs';setView('body')});
 // Completed records are read-only. Base listeners are left attached but controls are disabled.
 if(rs.completed){document.querySelectorAll('[data-rdrag]').forEach(el=>{el.draggable=false});document.querySelectorAll('[data-rweight],[data-rset],[data-rcheck],[data-raddset],[data-rdelset],[data-rvariant],[data-rremove],[data-rmove],[data-radd]').forEach(el=>{el.disabled=true;el.setAttribute('aria-disabled','true')})}
};
// Informational, unobtrusive polish after V22's render hook runs.
render=function(){oldRender();if(state.view==='randomizer')document.documentElement.classList.add('v23-random-active');else document.documentElement.classList.remove('v23-random-active')};
render();
})();
