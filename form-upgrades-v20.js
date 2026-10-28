/* FORM. V20 | Blank-slate calendar, opt-in recurrence, reliable local photo selection.
 * Existing workout records/plans and randomizer history remain in their existing keys.
 */
(()=>{
'use strict';
const KEY='form-calendar-v20';
const localDay=(d)=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const dateOf=(s)=>new Date(`${s}T12:00:00`);
const dayDiff=(a,b)=>Math.round((dateOf(b)-dateOf(a))/86400000);
const safeText=(x)=>esc(String(x??''));
const cloneItem=(id)=>({id,variant:'standard',sets:[null,null],weights:[null,null],done:[]});
const normalize=(o)=>({version:1,oneOff:o&&typeof o.oneOff==='object'&&!Array.isArray(o.oneOff)?o.oneOff:{},series:Array.isArray(o?.series)?o.series:[],skips:o&&typeof o.skips==='object'&&!Array.isArray(o.skips)?o.skips:{}});
let schedule;try{schedule=normalize(JSON.parse(localStorage.getItem(KEY)||'null'))}catch(e){schedule=normalize(null)}
const saveSchedule=()=>{try{localStorage.setItem(KEY,JSON.stringify(schedule));return true}catch(e){alert('Die Terminplanung konnte nicht gespeichert werden. Bitte speichere ein Backup.');return false}};
const today=localDay(new Date());
state.v20Day=(idx(today)>=0&&idx(today)<total)?today:iso(0);
state.v20Month=0;
state.v20Form=false;
state.v20EditId=null;
state.v20PhotoQuery='';
state.v20PhotoId='';
state.v20PhotoUrl=null;
state.v20PhotoName='';
const baseMonth=new Date(new Date().getFullYear(),new Date().getMonth(),1,12);
const monthAt=n=>new Date(baseMonth.getFullYear(),baseMonth.getMonth()+n,1,12);
const within=s=>idx(s)>=0&&idx(s)<total;
const period=(rule,date)=>{
 if(date<rule.startsOn||rule.endsOn&&date>rule.endsOn)return false;
 const freq=rule.freq||'weekly',n=rule.interval||1;
 if(freq==='weekly')return dayDiff(rule.startsOn,date)%(7*n)===0;
 if(freq==='daily')return dayDiff(rule.startsOn,date)%n===0;
 if(freq==='monthly'){
  const a=dateOf(rule.startsOn),b=dateOf(date);
  const diff=(b.getFullYear()-a.getFullYear())*12+b.getMonth()-a.getMonth();
  return diff>=0&&diff%n===0&&a.getDate()===b.getDate();
 }
 return false;
};
function eventsOn(date){
 const events=[];
 if(schedule.oneOff[date])events.push({...schedule.oneOff[date],source:'single',date});
 for(const rule of schedule.series){if(period(rule,date)&&!schedule.skips[`${rule.id}|${date}`])events.push({...rule,source:'series',date});}
 return events;
}
function randomCompletedOn(date){return randomSessions.filter(x=>x.date===date&&x.completed)}
function historicalOn(date){const e=records[date];return Boolean(e?.complete||Array.isArray(plans[date])&&plans[date].length>0||randomCompletedOn(date).length)}
function currentEvent(date){return eventsOn(date)[0]||null}
const legacyType=(i)=>{const d=iso(i),e=records[d];if(Array.isArray(e?.completedExercises))return 'A';if(Array.isArray(plans[d]))return dt(i).getDay()===4?'B':'A';if(e?.complete)return 'K';return ''};
dayType=function(i){if(i<0||i>=total)return '';const ev=currentEvent(iso(i));return ev?ev.type==='strength'?'A':'K':legacyType(i)};
list=function(i){if(!within(iso(i)))return [];const d=iso(i);if(Array.isArray(plans[d]))return plans[d];
 const ev=currentEvent(d);if(ev?.type==='strength'){const preset=ev.preset||'';return preset&&Array.isArray(defaults[preset])?defaults[preset].map(cloneItem):[]}
 const past=records[d]?.completedExercises;return Array.isArray(past)?clone(past):[];
};
const eventTitle=(ev)=>ev?.name||'Training';
function calendarForm(){
 const edit=state.v20EditId, old=edit?(schedule.series.find(x=>x.id===edit)||Object.values(schedule.oneOff).find(x=>x.id===edit)):null;
 const date=old?.startsOn||old?.date||state.v20Day;
 return `<section class="v20-form-panel" aria-label="Trainingstermin anlegen">
 <div class="v20-form-head"><div><small>DEINE PLANUNG</small><h2>${edit?'Termin bearbeiten':'Training planen'}</h2></div><button type="button" data-v20-cancel class="v20-icon-button" aria-label="Schließen">×</button></div>
 <form id="v20-event-form">
 <label>Datum<input required name="date" type="date" min="${iso(0)}" max="${iso(total-1)}" value="${safeText(date)}"></label>
 <label>Bezeichnung<input required name="name" type="text" maxlength="52" placeholder="z. B. Beine & Core" value="${safeText(old?.name||'Krafttraining')}"></label>
 <div class="v20-two"><label>Aktivität<select name="type"><option value="strength" ${old?.type!=='sport'?'selected':''}>Krafttraining</option><option value="sport" ${old?.type==='sport'?'selected':''}>Sport / Kurs</option></select></label><label>Uhrzeit (optional)<input type="time" name="time" value="${safeText(old?.time||'')}"></label></div>
 <label>Wiederholen (Serientermin)<select name="freq"><option value="once" ${!old?.freq?'selected':''}>Einmalig</option><option value="weekly" ${old?.freq==='weekly'&&old?.interval!==2?'selected':''}>Jede Woche am gleichen Wochentag</option><option value="biweekly" ${old?.freq==='weekly'&&old?.interval===2?'selected':''}>Alle 2 Wochen</option><option value="monthly" ${old?.freq==='monthly'?'selected':''}>Jeden Monat am selben Datum</option></select></label>
 <label>Bis (optional)<input type="date" name="endsOn" min="${safeText(date)}" max="${iso(total-1)}" value="${safeText(old?.endsOn||'')}"></label>
 <label>Übungsauswahl beim Start<select name="preset"><option value="" ${!old?.preset?'selected':''}>Leer starten, selbst Übungen wählen</option><option value="A" ${old?.preset==='A'?'selected':''}>Vorlage Kraft A</option><option value="B" ${old?.preset==='B'?'selected':''}>Vorlage Kraft B</option></select></label>
 <p class="v20-help">Serientermine erscheinen künftig automatisch im Kalender. Sätze und Wiederholungen jeder Trainingseinheit bleiben unabhängig davon.</p>
 <button type="submit" class="v20-primary">${edit?'Änderungen speichern':'Termin speichern'}</button></form></section>`;
}
function agendaLine(d,ev){const e=records[d]||{},old=!ev&&historicalOn(d),randomOnly=!ev&&!e.complete&&randomCompletedOn(d).length>0;return `<div class="v20-agenda-row"><div class="v20-agenda-dot ${e.complete?'done':ev?.type==='sport'?'sport':''}"></div><button data-v20-choose="${d}"><strong>${safeText(dateOf(d).toLocaleDateString('de-AT',{weekday:'short',day:'2-digit',month:'short'}))}</strong><span>${safeText(ev?eventTitle(ev):randomOnly?'Zufallstraining':'Dokumentiertes Training')}${ev?.source==='series'?' · Wiederholt':''}${ev?.time?' · '+safeText(ev.time):''}</span></button><b>${e.complete?'✓':'›'}</b></div>`;}
calendar=function(){
 const first=monthAt(state.v20Month||0),yy=first.getFullYear(),mm=first.getMonth(),count=new Date(yy,mm+1,0).getDate(),offset=(first.getDay()+6)%7;
 const days=Array.from({length:count},(_,n)=>{const d=localDay(new Date(yy,mm,n+1,12));return {date:d,number:n+1,planned:eventsOn(d).length>0,done:Boolean(records[d]?.complete),historical:historicalOn(d),isAvailable:within(d)}});
 const selected=state.v20Day,ev=currentEvent(selected),done=Boolean(records[selected]?.complete),randomForDay=randomCompletedOn(selected),dateEntries=days.filter(x=>x.planned||x.historical||x.done);
 const selDate=dateOf(selected).toLocaleDateString('de-AT',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
 return `<div class="v20-page"><div class="v20-topline"><div><h1>Kalender</h1><p>Nur deine geplanten und tatsächlich absolvierten Trainings</p></div><button data-v20-new class="v20-top-add" aria-label="Workout planen">＋</button></div>
 <section class="v20-calendar"><div class="v20-month-head"><button type="button" data-v20-prev aria-label="Vorheriger Monat">‹</button><h2>${safeText(first.toLocaleDateString('de-AT',{month:'long',year:'numeric'}))}</h2><button type="button" data-v20-next aria-label="Nächster Monat">›</button></div>
 <div class="v20-month-grid">${['Mo','Di','Mi','Do','Fr','Sa','So'].map(x=>`<span class="v20-dow">${x}</span>`).join('')}${Array(offset).fill('<span></span>').join('')}${days.map(x=>`<button type="button" data-v20-choose="${x.date}" class="v20-day ${x.done?'finished':''} ${x.planned?'planned':''} ${x.date===selected?'chosen':''}" ${!x.isAvailable?'disabled':''} aria-label="${x.date} ${x.done?'Absolviert':x.planned?'Geplant':''}"><span>${x.number}</span>${x.done?'<i class="v20-completed"></i>':x.planned?'<i></i>':x.historical?'<i class="v20-history-dot"></i>':''}</button>`).join('')}</div>
 <div class="v20-key"><span><i class="v20-planned-dot"></i>Geplant</span><span><i class="v20-done-dot"></i>Absolviert</span></div></section>
 <section class="v20-selected"><small>AUSGEWÄHLTER TAG</small><h2>${safeText(selDate)}</h2>${ev?`<div class="v20-event-card"><strong>${safeText(eventTitle(ev))}</strong><span>${ev.time?safeText(ev.time)+' Uhr · ':''}${ev.source==='series'?'Serientermin':'Einmalig'}${done?' · Abgeschlossen':''}</span></div><div class="v20-actions"><button data-v20-open-training class="v20-primary">${done?'Training ansehen':'Training öffnen'}</button><button data-v20-edit class="v20-soft">Bearbeiten</button></div><div class="v20-quiet-actions"><button data-v20-skip>${ev.source==='series'?'Nur diesen Termin auslassen':'Termin entfernen'}</button>${ev.source==='series'?'<button data-v20-delete-series>Ganze Serie löschen</button>':''}</div>`:historicalOn(selected)?`<div class="v20-event-card"><strong>${randomForDay.length&&!done?'Zufallstraining abgeschlossen':done?'Abgeschlossenes Training':'Begonnenes Training'}</strong><span>Aus deiner bisherigen Trainingshistorie</span></div><button ${randomForDay.length&&!done?'data-v20-open-random':'data-v20-open-training'} class="v20-primary">Eintrag ansehen</button>`:`<div class="v20-empty"><strong>Hier ist noch nichts geplant.</strong><p>Du entscheidest selbst, wann du trainierst. Kein automatischer Wochenplan.</p><button data-v20-new class="v20-primary">＋ Workout planen</button></div>`}</section>
 ${state.v20Form?calendarForm():''}
 <section class="v20-agenda"><div class="v20-section-label"><h2>Dieser Monat</h2><span>${dateEntries.length} Tage</span></div>${dateEntries.length?dateEntries.map(x=>agendaLine(x.date,currentEvent(x.date))).join(''):'<p class="v20-no-events">Noch keine Einträge in diesem Monat.</p>'}</section></div>`;
};
const oldDashboard=dashboard;
dashboard=function(){
 const d=today,idxDay=idx(d),ev=within(d)?currentEvent(d):null,done=Boolean(records[d]?.complete),isLogged=historicalOn(d);
 const upcoming=[];for(let k=0;k<42&&upcoming.length<4;k++){const dt0=dateOf(d);dt0.setDate(dt0.getDate()+k);const date=localDay(dt0),event=currentEvent(date);if(event)upcoming.push({date,event})}
 const completed=Object.entries(records).filter(([x,v])=>v?.complete).sort((a,b)=>b[0].localeCompare(a[0])).slice(0,2);
 return `<div class="v20-page v20-home"><div class="v20-topline"><div><small>FORM. / DEIN TRAINING</small><h1>Dein Training. Deine Entscheidung.</h1><p>${safeText(dateOf(d).toLocaleDateString('de-AT',{weekday:'long',day:'numeric',month:'long'}))}</p></div><button data-v20-to-calendar class="v20-top-add" aria-label="Kalender öffnen">▦</button></div>
 <section class="v20-home-hero"><small>HEUTE</small><h2>${ev?safeText(eventTitle(ev)):isLogged?'Dein Training':'Ein freier Tag.'}</h2><p>${ev?ev.source==='series'?'Dein wiederkehrender Termin steht bereit.':'Dein Workout ist geplant.':isLogged?'Du hast hier bereits etwas dokumentiert.':'Kein Training vorgeschrieben. Du planst nur, was du wirklich machen möchtest.'}</p><div class="v20-hero-actions">${ev||isLogged?`<button class="v20-primary" data-v20-home-start>${done?'Training ansehen':'Training starten'}</button>`:'<button class="v20-primary" data-v20-home-new>＋ Workout planen</button>'}<button class="v20-soft" data-v20-to-calendar>Kalender</button></div></section>
 <div class="v20-section-label"><h2>Als Nächstes</h2><button data-v20-to-calendar>Alle Termine ›</button></div><section class="v20-upcoming">${upcoming.length?upcoming.map(x=>agendaLine(x.date,x.event)).join(''):'<div class="v20-zero">Noch keine Trainingstermine. Lege einen einmaligen Termin oder eine Wiederholung an.</div>'}</section>
 <div class="v20-section-label"><h2>Zuletzt abgeschlossen</h2></div><section>${completed.length?completed.map(([date,e])=>agendaLine(date,currentEvent(date))).join(''):'<p class="v20-no-events">Sobald du eine Einheit abschließt, erscheint sie hier.</p>'}</section></div>`;
};
const oldTraining=training;
training=function(){const d=iso(state.index),event=currentEvent(d),type=dayType(state.index);
 if(!type)return `<section class="v20-page"><div class="v20-topline"><div><h1>Freier Tag</h1><p>${safeText(dateOf(d).toLocaleDateString('de-AT',{dateStyle:'full'}))}</p></div></div><div class="v20-empty"><h2>Noch kein Workout geplant</h2><p>Du kannst einen Termin einmalig oder als Serie anlegen.</p><button class="v20-primary" data-v20-plan-from-training>Workout planen</button></div><button class="v20-soft" data-v20-to-calendar>Zum Kalender</button></section>`;
 let html=oldTraining();
 html=html.replace(/<div class="seg-tabs training-seg">[\s\S]*?<\/div>/,`<div class="v20-training-label"><span>${safeText(eventTitle(event)|| (type==='K'?'Sport':'Krafttraining'))}</span><button data-v20-to-calendar>Kalender ›</button></div>`)
 .replace(/<details class="plan-fold">[\s\S]*?<\/details>/,'')
 .replace(/<span>Woche \d+ \/ 26<\/span>/,'')
 .replace('Selbstverteidigung</h2>',safeText(eventTitle(event))+'</h2>')
 .replace('70 Minuten · Mittlere Intensität',event?.time?safeText(event.time)+' Uhr':'Sport / Kurs');
 if(['A','B'].includes(type)&&list(state.index).length===0){html=html.replace('<div class="exercise-list"></div>','<div class="v20-empty-exercises"><h3>Dein Training ist noch leer.</h3><p>Füge deine ersten Übungen hinzu oder wähle eine Vorlage bei der Terminplanung.</p></div>')}
 return html;
};
const synonyms={squat:'kniebeuge knie beugen squat',bridge:'glute bridge hüftheben po',lunge:'ausfallschritt ausfallschritte lunges kniefall',pushup:'liegestütze push up',sideplank:'seitstütz seitliche plank',snow:'reverse snow angel rücken schulter schneeengel',hinge:'good morning hüftbeuge kreuzheben',deadbug:'dead bug käfer bauch',plank:'unterarmstütz planke',calf:'wadenheben',bird:'bird dog vierfüßler'};
function photoMatches(q){const terms=q.toLocaleLowerCase('de-AT').split(/[^a-z0-9äöüß]+/).filter(x=>x.length>2);return Object.entries(catalog).map(([id,x])=>{
 const hay=(x.name+' '+id+' '+(synonyms[id]||'')).toLocaleLowerCase('de-AT');let score=terms.reduce((n,t)=>n+(x.name.toLocaleLowerCase('de-AT').includes(t)?8:hay.includes(t)?4:0),0);return {id,x,score};
 }).filter(x=>!terms.length||x.score>0).sort((a,b)=>b.score-a.score||a.x.name.localeCompare(b.x.name,'de')).slice(0,18)}
function photoResults(){const q=state.v20PhotoQuery,matches=photoMatches(q);return matches.length?matches.map(({id,x})=>`<button type="button" class="v20-photo-result ${state.v20PhotoId===id?'active':''}" data-v20-pick="${id}">${miniIcon(id)}<span><strong>${safeText(x.name)}</strong><small>${safeText((x.muscles||[]).map(m=>muscleNames[m]).join(' · '))}</small></span><b>${state.v20PhotoId===id?'✓':'＋'}</b></button>`).join(''):'<div class="v20-no-events">Keine passende Übung. Versuche einen anderen Begriff.</div>'}
scanPage=function(){const selected=state.v20PhotoId?catalog[state.v20PhotoId]:null;return `<section class="v20-page v20-photo"><div class="v20-topline"><div><h1>Übung mit Foto hinzufügen</h1><p>Foto auswählen, Übung zuordnen, Training ergänzen</p></div><button class="v20-top-add" data-v20-photo-back aria-label="Schließen">×</button></div>
 <div class="v20-photo-info"><strong>Keine automatische KI-Erkennung</strong><p>Du kannst ein Foto aufnehmen und daneben die passende Übung aus der Bibliothek auswählen. Der Bildinhalt wird nicht automatisch analysiert und nicht hochgeladen.</p></div>
 <div class="v20-photo-preview">${state.v20PhotoUrl?`<img src="${state.v20PhotoUrl}" alt="Dein ausgewähltes Übungsfoto" id="v20-photo-preview"><span>${safeText(state.v20PhotoName)}</span>`:'<div class="v20-camera-placeholder"><span>◎</span><b>Noch kein Foto ausgewählt</b><small>Du kannst auch ohne Foto direkt eine Übung suchen.</small></div>'}</div>
 <div class="v20-photo-buttons"><label for="v20-camera">Kamera öffnen<input id="v20-camera" type="file" accept="image/*" capture="environment"></label><label for="v20-gallery">Foto auswählen<input id="v20-gallery" type="file" accept="image/*"></label></div>
 <label class="v20-search-label" for="v20-photo-search">Übung finden<input id="v20-photo-search" type="search" autocomplete="off" placeholder="z. B. Kniebeuge, Plank, Ausfallschritt" value="${safeText(state.v20PhotoQuery)}"></label>
 <div class="v20-photo-results">${photoResults()}</div>
 ${selected?`<div class="v20-confirm-exercise"><small>AUSGEWÄHLTE ÜBUNG</small><h2>${safeText(selected.name)}</h2><p>${safeText(selected.tip||'')}</p><p><b>Leichter:</b> ${safeText(selected.easy||'')}</p><p><b>Schwerer:</b> ${safeText(selected.hard||'')}</p><button class="v20-primary" data-v20-photo-confirm>Zum ${state.scanReturn==='randomizer'?'Zufallstraining':'Training'} hinzufügen</button></div>`:''}</section>`};
const originalProgress=progress;
progress=function(){const completed=Object.entries(records).filter(([k,e])=>e?.complete).sort((a,b)=>b[0].localeCompare(a[0]));
 const strength=completed.filter(([date,e])=>Array.isArray(e.completedExercises)),others=completed.length-strength.length;
 const loggedRandom=randomSessions.filter(x=>x.completed),selected=Object.entries(catalog).map(([id,x])=>({id,x,h:loggedHistory(id)})).filter(v=>v.h.length).sort((a,b)=>b.h.at(-1).date.localeCompare(a.h.at(-1).date));
 const prev=Array.from({length:12},(_,i)=>{const d=new Date();d.setDate(d.getDate()-((11-i)*7));return localDay(d)});
 const weeks=prev.map(end=>{const endDate=dateOf(end),begin=new Date(endDate);begin.setDate(begin.getDate()-6);const lo=localDay(begin),hits=completed.filter(([d])=>d>=lo&&d<=end).length+loggedRandom.filter(x=>x.date>=lo&&x.date<=end).length;return hits});
 const max=Math.max(1,...weeks);
 return `<section class="v20-page"><div class="v20-topline"><div><h1>Fortschritt</h1><p>Dein tatsächlich dokumentiertes Training</p></div></div>
 <div class="v20-stat-grid"><div><small>Abgeschlossen</small><strong>${completed.length+loggedRandom.length}</strong></div><div><small>Krafttraining</small><strong>${strength.length}</strong></div><div><small>Sport / Kurse</small><strong>${others}</strong></div><div><small>Zufallstrainings</small><strong>${loggedRandom.length}</strong></div></div>
 <div class="v20-section-label"><h2>Letzte 12 Wochen</h2><small>Abgeschlossene Einheiten</small></div><div class="v20-stat-chart" aria-label="Trainingshäufigkeit der vergangenen 12 Wochen">${weeks.map((v,i)=>`<div title="Woche ${i+1}: ${v} Einheiten"><i style="height:${Math.max(4,v/max*100)}%"></i><span>${v||''}</span></div>`).join('')}</div>
 <div class="v20-section-label"><h2>Deine Übungen</h2><small>${selected.length} mit Einträgen</small></div><div class="v20-progress-exercises">${selected.length?selected.map(({id,x,h})=>`<button data-open-history="${id}"><span>${safeText(x.name)}<small>${h.length} dokumentierte Trainings</small></span><b>Verlauf ›</b></button>`).join(''):'<p class="v20-no-events">Sobald du Sätze erfasst, erscheinen sie hier.</p>'}</div>
 <div class="v20-section-label"><h2>Letzte Trainingseinheiten</h2></div>${completed.slice(0,12).map(([d])=>agendaLine(d,currentEvent(d))).join('')||'<p class="v20-no-events">Noch keine abgeschlossenen Trainingseinheiten.</p>'}
 <div class="v20-data-tools"><h2>Deine Daten sichern</h2><p>Alle Daten bleiben derzeit lokal im Browser. Sichere sie regelmäßig als JSON-Datei.</p><button class="v20-primary" data-v20-export>JSON-Backup herunterladen</button><button class="v20-soft" data-v20-csv>CSV-Verlauf exportieren</button><label>JSON-Backup wiederherstellen<input type="file" id="v20-import" accept="application/json,.json"></label></div>
 </section>`;
};
function openDate(date){if(!within(date))return;state.v20Day=date;state.index=idx(date);state.v20Form=false;let month=dateOf(date);state.v20Month=(month.getFullYear()-baseMonth.getFullYear())*12+month.getMonth()-baseMonth.getMonth();setView('calendar')}
function openForm(){state.v20Form=true;state.v20EditId=null;setView('calendar')}
function leavePhoto(){if(state.v20PhotoUrl){URL.revokeObjectURL(state.v20PhotoUrl);state.v20PhotoUrl=null}state.v20PhotoName='';state.v20PhotoId=''}
function openPhoto(returnView){leavePhoto();state.scanReturn=returnView||state.view;state.v20PhotoQuery='';setView('scan')}
const jsonFile=()=>({version:20,createdAt:new Date().toISOString(),records,plans,sex,randomSessions,scheduleV20:schedule});
function exportCsv(){const rows=[['Datum','Übung','Gewicht (kg)','Wiederholungen / Sek.','Quelle','Abgeschlossen']];for(const [date,e] of Object.entries(records)){const entries=Array.isArray(e.completedExercises)?e.completedExercises:(plans[date]||[]);for(const ex of entries)for(let i=0;i<(ex.sets||[]).length;i++)if(isVal(ex.sets[i]))rows.push([date,catalog[ex.id]?.name||ex.id,ex.weights?.[i]??'',ex.sets[i],'Workout',e.complete?'Ja':'Nein'])}for(const rs of randomSessions)for(const ex of rs.exercises||[])for(let i=0;i<(ex.sets||[]).length;i++)if(isVal(ex.sets[i]))rows.push([rs.date,catalog[ex.id]?.name||ex.id,ex.weights?.[i]??'',ex.sets[i],'Randomizer',rs.completed?'Ja':'Nein']);const csv=rows.map(r=>r.map(x=>'"'+String(x??'').replaceAll('\"','\"\"')+'"').join(';')).join('\r\n');const url=URL.createObjectURL(new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download='FORM_Verlauf_'+today+'.csv';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),12000)}
function exportJson(){const blob=new Blob([JSON.stringify(jsonFile(),null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='FORM_Backup_'+today+'.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),12000)}
async function importJson(file){if(!file)return;try{if(file.size>15*1024*1024)throw Error('Datei ist zu groß');const data=JSON.parse(await file.text());if(!data.records||typeof data.records!=='object'||Array.isArray(data.records))throw Error('Kein gültiges FORM.-Backup');if(!confirm('Aktuelle Daten einschließlich Kalender durch diese Sicherung ersetzen?'))return;records=data.records;plans=data.plans&&typeof data.plans==='object'?data.plans:{};sex=data.sex==='male'?'male':'female';randomSessions=Array.isArray(data.randomSessions)?data.randomSessions:[];schedule=normalize(data.scheduleV20);save();saveRandom();saveSchedule();setView('stats');alert('FORM.-Backup wiederhergestellt.')}catch(e){alert('Import fehlgeschlagen: '+e.message)}}
const oldRender=render;
render=function(){oldRender();if(state.view==='training'&&list(state.index).length===0){const resume=document.querySelector('[data-v19-resume]');if(resume){resume.textContent='Übung hinzufügen →';resume.onclick=()=>{state.adding=true;setView('body')}}}
 const expo=document.querySelector('[data-export]');if(expo)expo.onclick=exportJson;
 const imp=document.querySelector('#import');if(imp)imp.onchange=()=>importJson(imp.files?.[0]);
};
function saveForm(form){const fd=new FormData(form),d=String(fd.get('date')),name=String(fd.get('name')||'').trim(),type=String(fd.get('type')),option=String(fd.get('freq')),preset=type==='strength'?String(fd.get('preset')||''):'';
 if(!within(d)){alert('Datum außerhalb des verfügbaren Kalenders.');return}if(!name){alert('Bitte einen Namen eingeben.');return}
 const conflicting=eventsOn(d).some(e=>e.id!==state.v20EditId);if(conflicting){alert('Für diesen Tag ist bereits ein Termin geplant. Öffne den vorhandenen Termin zum Bearbeiten.');return}
 const until=String(fd.get('endsOn')||'');if(until&&until<d){alert('Das Enddatum darf nicht vor dem Start liegen.');return}
 const old=state.v20EditId;if(old){let series=schedule.series.find(x=>x.id===old);if(series){schedule.series=schedule.series.filter(x=>x.id!==old)}else{for(const k of Object.keys(schedule.oneOff))if(schedule.oneOff[k].id===old)delete schedule.oneOff[k]}}
 const id=old||'ev-'+Date.now()+'-'+Math.floor(Math.random()*1e6),base={id,name,type:type==='sport'?'sport':'strength',preset,time:String(fd.get('time')||''),date:d};
 if(option==='once'){schedule.oneOff[d]=base}else{const freq=option==='biweekly'?'weekly':option==='monthly'?'monthly':'weekly';schedule.series.push({...base,startsOn:d,endsOn:String(fd.get('endsOn')||'')||null,freq,interval:option==='biweekly'?2:1});}
 saveSchedule();state.v20Day=d;state.v20Form=false;state.v20EditId=null;state.index=idx(d);setView('calendar');
}
function stopEvent(scope){const d=state.v20Day,ev=currentEvent(d);if(!ev)return;
 const msg=scope==='series'?'Wirklich die ganze wiederkehrende Serie entfernen? Bereits dokumentierte Trainingseinheiten bleiben erhalten.':'Nur diesen Termin entfernen? Bereits dokumentierte Trainingsdaten bleiben erhalten.';
 if(!confirm(msg))return;
 if(ev.source==='single'){delete schedule.oneOff[d]}else if(scope==='series'){schedule.series=schedule.series.filter(x=>x.id!==ev.id);for(const key of Object.keys(schedule.skips))if(key.startsWith(ev.id+'|'))delete schedule.skips[key]}else{schedule.skips[ev.id+'|'+d]=true}
 saveSchedule();setView('calendar');
}
function addSelectedExercise(){const id=state.v20PhotoId;if(!id||!catalog[id])return;
 if(state.scanReturn==='randomizer'&&activeRandom()){modifyRandom(x=>x.exercises.push(cloneItem(id)));state.randomStage='plan';leavePhoto();setView('randomizer');return}
 const date=iso(state.index);if(dayType(state.index)===''){schedule.oneOff[date]={id:'ad-hoc-'+Date.now(),date,name:'Mein Training',type:'strength',preset:'',time:''};saveSchedule()}
 const a=clone(list(state.index));a.push(cloneItem(id));updatePlan(state.index,a);leavePhoto();setView('training');
}
// Event delegation remains stable while render() reconstructs the view.
document.addEventListener('click',e=>{
 const b=e.target.closest('[data-v20-choose],[data-v20-prev],[data-v20-next],[data-v20-new],[data-v20-cancel],[data-v20-open-training],[data-v20-open-random],[data-v20-edit],[data-v20-skip],[data-v20-delete-series],[data-v20-plan-from-training],[data-v20-to-calendar],[data-v20-home-new],[data-v20-home-start],[data-v20-photo-back],[data-v20-pick],[data-v20-photo-confirm],[data-v20-open-photo],[data-v20-export],[data-v20-csv],[data-v19-backup]');if(!b)return;
 if(b.hasAttribute('data-v20-choose')){openDate(b.dataset.v20Choose);return}
 if(b.hasAttribute('data-v20-prev')||b.hasAttribute('data-v20-next')){state.v20Month=Math.min(35,Math.max(-1,(state.v20Month||0)+(b.hasAttribute('data-v20-next')?1:-1)));render();return}
 if(b.hasAttribute('data-v20-new')||b.hasAttribute('data-v20-plan-from-training')||b.hasAttribute('data-v20-home-new')){if(b.hasAttribute('data-v20-home-new')){state.v20Day=today;state.index=idx(today)}openForm();return}
 if(b.hasAttribute('data-v20-cancel')){state.v20Form=false;state.v20EditId=null;render();return}
 if(b.hasAttribute('data-v20-to-calendar')){state.v20Day=iso(state.index);openDate(state.v20Day);return}
 if(b.hasAttribute('data-v20-open-training')||b.hasAttribute('data-v20-home-start')){state.index=idx(b.hasAttribute('data-v20-home-start')?today:state.v20Day);state.view='training';render();window.scrollTo(0,0);return}
 if(b.hasAttribute('data-v20-open-random')){const rs=randomCompletedOn(state.v20Day).at(-1);if(rs){state.randomActiveId=rs.id;state.randomStage='plan';setView('randomizer')}return}
 if(b.hasAttribute('data-v20-edit')){const ev=currentEvent(state.v20Day);if(ev){state.v20Form=true;state.v20EditId=ev.id;render()}return}
 if(b.hasAttribute('data-v20-skip')||b.hasAttribute('data-v20-delete-series')){stopEvent(b.hasAttribute('data-v20-delete-series')?'series':'single');return}
 if(b.hasAttribute('data-v20-photo-back')){leavePhoto();setView(state.scanReturn||'training');return}
 if(b.hasAttribute('data-v20-open-photo')){openPhoto(b.dataset.v20OpenPhoto||state.view);return}
 if(b.hasAttribute('data-v20-pick')){state.v20PhotoId=b.dataset.v20Pick;render();return}
 if(b.hasAttribute('data-v20-photo-confirm')){addSelectedExercise();return}
 if(b.hasAttribute('data-v20-csv')){e.preventDefault();exportCsv();return}
 if(b.hasAttribute('data-v20-export')||b.hasAttribute('data-v19-backup')){e.preventDefault();e.stopImmediatePropagation();exportJson();return}
},true);
document.addEventListener('submit',e=>{if(e.target?.id==='v20-event-form'){e.preventDefault();saveForm(e.target)}},true);
document.addEventListener('input',e=>{if(e.target?.id==='v20-photo-search'){state.v20PhotoQuery=e.target.value;state.v20PhotoId='';document.querySelector('.v20-photo-results').innerHTML=photoResults();document.querySelector('.v20-confirm-exercise')?.remove()}},true);
document.addEventListener('change',e=>{const el=e.target;if(el.id==='v20-import'){importJson(el.files?.[0]);return}if(!['v20-gallery','v20-camera'].includes(el.id))return;const file=el.files?.[0];if(!file)return;if(!file.type.startsWith('image/')){alert('Bitte eine Bilddatei auswählen.');return}if(file.size>12*1024*1024){alert('Bitte ein Bild unter 12 MB auswählen.');return}
 if(state.v20PhotoUrl)URL.revokeObjectURL(state.v20PhotoUrl);
 state.v20PhotoUrl=URL.createObjectURL(file);state.v20PhotoName=file.name||'Foto';render();
 const image=document.querySelector('#v20-photo-preview');if(image)image.addEventListener('error',()=>{const parent=image.parentElement;image.remove();parent.insertAdjacentHTML('afterbegin','<p>Die Bildvorschau wird für dieses Dateiformat nicht unterstützt. Du kannst die Übung trotzdem manuell zuordnen.</p>')},{once:true});
},true);
// Replace the misleading old scanner entry with the accurate new one, including random workouts.
const prevRender=render;
render=function(){prevRender();if(state.view==='training'){
 const b=document.querySelector('[data-open-scan]');if(b){b.onclick=null;b.removeAttribute('data-open-scan');b.setAttribute('data-v20-open-photo','training');b.textContent='◎ Übung mit Foto hinzufügen (manuell)'}
 else if(dayType(state.index)!==''){const add=document.querySelector('[data-add]');if(add&&!document.querySelector('[data-v20-open-photo]'))add.insertAdjacentHTML('afterend','<button class="v20-photo-link" data-v20-open-photo="training">◎ Übung mit Foto hinzufügen</button>')}
 }
 if(state.view==='randomizer'&&state.randomStage==='plan'){
 const b=document.querySelector('[data-v19-rscan]');if(b){b.onclick=null;b.removeAttribute('data-v19-rscan');b.setAttribute('data-v20-open-photo','randomizer');b.textContent='◎ Foto auswählen und Übung zuordnen'}
 }
};
if(within(today))state.index=idx(today);
render();
})();
