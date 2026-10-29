/* FORM. V24 – actionable exercise coaching. Reuses the V23 workout and existing saved history. */
(()=>{
'use strict';
const coaching = {
 squat:{steps:['Stelle deine Füße etwa schulterbreit auf und verteile das Gewicht auf den ganzen Fuß.','Schiebe das Gesäß nach hinten und unten. Die Knie folgen ungefähr der Richtung deiner Zehen.','Drücke dich kontrolliert über die Füße wieder nach oben. Atme beim Aufstehen aus.'],avoid:'Fersen abheben, Knie nach innen kippen lassen oder den Rücken stark runden.',breath:'Beim Absenken einatmen, beim Aufstehen ausatmen.',tempo:'2 Sekunden abwärts · kontrolliert aufwärts'},
 bridge:{steps:['Lege dich auf den Rücken, stelle die Füße hüftbreit und nah genug am Gesäß auf.','Spanne Bauch und Gesäß an und hebe das Becken, bis Schultern, Hüfte und Knie annähernd eine Linie bilden.','Halte kurz, senke kontrolliert ab und vermeide ein starkes Hohlkreuz.'],avoid:'Die Bewegung nur aus dem unteren Rücken statt aus dem Gesäß machen.',breath:'Beim Anheben ausatmen.',tempo:'2 Sekunden heben · 1 Sekunde halten · 2 Sekunden senken'},
 lunge:{steps:['Stelle dich aufrecht hin und mache einen kontrollierten Schritt nach hinten.','Beuge beide Knie und senke den Körper senkrecht ab. Das vordere Knie bleibt in Fußrichtung.','Drücke dich über den vorderen Fuß hoch und kehre in den Stand zurück. Wechsle das Bein.'],avoid:'Zu schmal stehen, ins Hohlkreuz fallen oder nach vorne kippen.',breath:'Beim Aufstehen ausatmen.',tempo:'2–3 Sekunden absenken · ruhig aufstehen'},
 deadbug:{steps:['Lege dich auf den Rücken und halte Hüfte und Knie ungefähr im rechten Winkel; die Arme zeigen nach oben.','Spanne den Bauch an und strecke einen Arm und das gegenüberliegende Bein langsam vom Körper weg.','Bewege nur so weit, wie dein unterer Rücken stabil bleibt. Kehre zurück und wechsle die Seite.'],avoid:'Den unteren Rücken stark ins Hohlkreuz drücken oder hektisch wechseln.',breath:'Beim Ausstrecken ruhig ausatmen.',tempo:'Langsam und ohne Schwung'},
 pushup:{steps:['Platziere die Hände auf einer stabilen, rutschfesten Erhöhung, ungefähr schulterbreit.','Spanne Bauch und Gesäß an, sodass dein Körper von Kopf bis Fuß eine Linie bildet.','Beuge die Ellenbogen kontrolliert, senke die Brust zur Erhöhung und drücke dich wieder weg.'],avoid:'Hüfte durchhängen lassen oder die Ellenbogen weit nach außen spreizen.',breath:'Beim Hochdrücken ausatmen.',tempo:'2 Sekunden absenken · kontrolliert drücken'},
 snow:{steps:['Lege dich auf den Bauch, die Stirn zeigt Richtung Matte und der Nacken bleibt lang.','Hebe die Arme nur leicht an und führe sie langsam von neben dem Körper in einem großen Bogen nach oben.','Bewege die Arme kontrolliert zurück. Schulterblätter sanft nach hinten-unten führen.'],avoid:'Den Kopf hochreißen oder stark ins Hohlkreuz gehen.',breath:'Ruhig weiteratmen.',tempo:'Langsame, fließende Bögen'},
 hinge:{steps:['Stelle die Füße hüftbreit auf und beuge die Knie minimal.','Schiebe die Hüfte nach hinten, als wolltest du mit dem Gesäß eine Wand berühren. Dein Rücken bleibt lang.','Spüre die Spannung an der Oberschenkelrückseite und richte dich mit dem Gesäß wieder auf.'],avoid:'Aus der Wirbelsäule nach vorne einknicken oder die Kniebeuge mit einer Hüftbeuge verwechseln.',breath:'Beim Aufrichten ausatmen.',tempo:'3 Sekunden nach hinten · kontrolliert aufrichten'},
 sideplank:{steps:['Lege dich seitlich hin und stütze den Ellenbogen direkt unter der Schulter ab.','Hebe Becken und Rumpf, sodass Schultern, Hüfte und Knie bzw. Füße eine Linie bilden.','Halte die Spannung und atme ruhig. Wechsle nach der vorgesehenen Zeit die Seite.'],avoid:'Schulter einsinken lassen, Becken nach hinten drehen oder die Luft anhalten.',breath:'Ruhig und gleichmäßig atmen.',tempo:'Kontrollierte Haltezeit je Seite'},
 plank:{steps:['Lege die Unterarme schulterbreit auf, Ellenbogen unter den Schultern.','Strecke die Beine und spanne Bauch, Gesäß und Beine an.','Halte den Körper möglichst gerade und atme ohne Pressatmung weiter.'],avoid:'Hüfte absinken oder zu hoch schieben.',breath:'Ruhig weiteratmen.',tempo:'Qualität vor längerer Haltezeit'},
 calf:{steps:['Stelle dich aufrecht auf beide Füße und halte dich bei Bedarf an einer Wand fest.','Drücke dich langsam auf die Fußballen und hebe beide Fersen.','Halte oben kurz und senke die Fersen bewusst und vollständig ab.'],avoid:'Mit Schwung wippen oder über die Fußaußenkante kippen.',breath:'Ruhig atmen.',tempo:'2 Sekunden hoch · 1 halten · 3 runter'},
 bird:{steps:['Beginne im Vierfüßlerstand: Hände unter den Schultern, Knie unter den Hüften.','Strecke einen Arm und das gegenüberliegende Bein langsam aus, ohne den Oberkörper zu drehen.','Halte kurz, setze kontrolliert ab und wechsle die Diagonale.'],avoid:'Becken zur Seite kippen lassen oder den Kopf überstrecken.',breath:'Beim Strecken ausatmen.',tempo:'2 Sekunden strecken · kurz halten'},
 wall:{steps:['Stelle dich mit dem Rücken an eine Wand und die Füße etwas vor die Hüfte.','Rutsche kontrolliert nach unten, bis du eine gut haltbare Sitzposition erreichst.','Halte den Rücken an der Wand und drücke gleichmäßig in die Füße.'],avoid:'Knieschmerz ignorieren oder tiefer gehen als kontrolliert möglich.',breath:'Gleichmäßig weiteratmen.',tempo:'Stabile Haltezeit'},
 superman:{steps:['Lege dich bäuchlings hin und richte den Blick zur Matte.','Spanne den Rumpf leicht an und hebe Brust und Arme nur wenige Zentimeter ab.','Halte kurz und lege alles ohne Schwung wieder ab.'],avoid:'Den Kopf hochreißen oder die Lendenwirbelsäule überstrecken.',breath:'Beim Anheben ausatmen.',tempo:'Langsam mit kurzer Pause oben'},
 pike:{steps:['Starte mit Händen am Boden und dem Gesäß hoch in einer umgekehrten V-Position.','Beuge die Ellenbogen und senke den Kopf kontrolliert zwischen die Hände.','Drücke dich über Arme und Schultern wieder hoch.'],avoid:'Mit Schwung nach unten gehen oder bei Schulterproblemen erzwingen.',breath:'Beim Hochdrücken ausatmen.',tempo:'2–3 Sekunden runter · kontrolliert hoch'},
 diamond:{steps:['Platziere deine Hände enger als bei normalen erhöhten Liegestützen auf einer stabilen Unterlage.','Spanne den ganzen Körper an und führe die Ellenbogen eher nah am Rumpf nach hinten.','Senke dich so weit ab, wie es sich für Handgelenke und Schultern gut anfühlt, und drücke dich hoch.'],avoid:'Handgelenke unnatürlich verdrehen oder Ellenbogen schmerzhaft einklemmen.',breath:'Beim Hochdrücken ausatmen.',tempo:'Kontrollierte Wiederholungen'},
 split:{steps:['Stelle einen Fuß vor den anderen, beide Füße bleiben während des Satzes am Platz.','Senke das hintere Knie kontrolliert Richtung Boden, der Oberkörper bleibt stabil.','Drücke dich über den vorderen Fuß hoch und absolviere anschließend die andere Seite.'],avoid:'Die Füße auf einer zu schmalen Linie aufstellen oder ins Hohlkreuz fallen.',breath:'Beim Aufrichten ausatmen.',tempo:'2–3 Sekunden abwärts'},
 sidestep:{steps:['Stehe breit genug für einen kontrollierten Schritt zur Seite.','Verlagere das Gewicht auf das gebeugte Bein und schiebe die Hüfte nach hinten; das andere Bein bleibt länger.','Drücke dich über das belastete Bein zurück in die Mitte und wechsle die Seite.'],avoid:'Knie nach innen kippen lassen oder die Ferse abheben.',breath:'Beim Zurückdrücken ausatmen.',tempo:'Ruhig absenken und zurückführen'},
 singlebridge:{steps:['Lege dich auf den Rücken, stelle einen Fuß stabil auf und hebe das andere Bein.','Spanne das Gesäß der Standbeinseite an und hebe das Becken kontrolliert.','Halte das Becken möglichst waagerecht und senke es wieder. Danach Seite wechseln.'],avoid:'Das Becken verdrehen oder den unteren Rücken überstrecken.',breath:'Beim Anheben ausatmen.',tempo:'2 hoch · kurz halten · 2 runter'},
 heeltoe:{steps:['Stelle dich auf einen Fuß und halte dich zur Balance leicht fest.','Hebe die Ferse langsam so hoch wie möglich an.','Senke die Ferse kontrolliert ab und wechsle nach dem Satz das Bein.'],avoid:'Zu schnell federn oder über den Fußrand kippen.',breath:'Ruhig atmen.',tempo:'Langsam hoch · 3 Sekunden runter'},
 heeltilt:{steps:['Lege dich auf den Rücken, die Knie sind gebeugt und die Füße stehen auf dem Boden.','Hebe die Schultern nur leicht ab und bewege eine Hand kontrolliert zur Ferse derselben Seite.','Kehre zur Mitte zurück und wiederhole die Bewegung auf der anderen Seite.'],avoid:'Mit dem Nacken ziehen oder den Oberkörper hochreißen.',breath:'Beim seitlichen Heranreichen ausatmen.',tempo:'Abwechselnd und ohne Schwung'},
 hollow:{steps:['Lege dich auf den Rücken und spanne den Bauch an, sodass dein unterer Rücken stabil bleibt.','Hebe Schultern und Beine nur so weit ab, dass diese Position erhalten bleibt.','Halte die Spannung und verkürze den Hebel, sobald dein Rücken ins Hohlkreuz geht.'],avoid:'Die Beine zu tief halten und dabei den Rücken stark überstrecken.',breath:'Ruhig weiteratmen.',tempo:'Kontrollierte Haltezeit'},
 wallpush:{steps:['Stelle dich etwa eine Armlänge von einer stabilen Wand entfernt hin.','Lege beide Handflächen etwa auf Schulterhöhe an und halte den Körper gestreckt.','Beuge die Ellenbogen und führe die Brust zur Wand; drücke dich kontrolliert zurück.'],avoid:'Hüfte abknicken oder Schultern zu den Ohren ziehen.',breath:'Beim Wegdrücken ausatmen.',tempo:'2 Sekunden Richtung Wand · ruhig zurück'},
 wallslide:{steps:['Stelle dich an eine Wand und halte den Bauch sanft angespannt.','Führe die Unterarme entlang der Wand langsam nach oben, soweit die Schulterbeweglichkeit reicht.','Senke die Arme wieder ab, ohne die Rippen deutlich nach vorne zu schieben.'],avoid:'Ins Hohlkreuz ausweichen oder Schulterschmerzen ignorieren.',breath:'Ruhig atmen.',tempo:'Langsam und kontrolliert'},
 pronecobra:{steps:['Lege dich auf den Bauch, Arme neben dem Körper, Blick zur Matte.','Hebe den Oberkörper minimal an und drehe die Handflächen leicht nach außen.','Ziehe die Schulterblätter sanft nach hinten-unten und halte kurz.'],avoid:'Den Nacken stark nach hinten ziehen.',breath:'Gleichmäßig weiteratmen.',tempo:'Kurz halten, dann lösen'},
 bearhold:{steps:['Beginne im Vierfüßlerstand mit Händen unter den Schultern und Knien unter den Hüften.','Spanne den Bauch an und hebe die Knie wenige Zentimeter vom Boden ab.','Halte die Position ohne zu wackeln und setze die Knie kontrolliert wieder ab.'],avoid:'Rundrücken erzwingen oder die Luft anhalten.',breath:'Ruhig weiteratmen.',tempo:'Kontrollierte Haltezeit'}
};
const escapeHtml=(x)=>String(x??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
function exerciseHistoryBefore(id,randomSession){
 return loggedHistory(id).filter(h=>!randomSession||h.randomId!==randomSession.id);
}
function recommendation(exercise,rs){
 const id=exercise.id, ex=catalog[id]||{name:id,target:'',muscles:[]};
 const history=exerciseHistoryBefore(id,rs);const last=history.at(-1);
 const weighted=last?.lines?.findLast?.(line=>line.weight!==null&&Number(line.weight)>0);
 const isHold=setMetric(id)==='Sek.';
 const sets=Math.max(1,exercise.sets?.length||2);
 return {id,ex,last,weighted,isHold,sets,
  target:ex.target|| (isHold?'20–30 Sekunden':'8–12 Wiederholungen'),
  weightText:weighted?`${fmt(weighted.weight)} kg zuletzt genutzt · nur als Orientierung`:'Körpergewicht · zusätzliches Gewicht nicht erforderlich',
  note:'Die Empfehlung ist ein Richtwert. Passe sie an dein Können an; saubere Technik geht vor mehr Gewicht.'};
}
function guideSection(rec,showRec=true){
 const d=coaching[rec.id]||{},ex=rec.ex;
 return `<section class="v24-coach" aria-label="Empfehlung und Ausführung">
  ${showRec?`<div class="v24-prescription"><div class="v24-overline">DEIN TRAININGSRICHTWERT</div><div class="v24-prescription-grid"><div><small>Sätze</small><strong>${rec.sets}</strong></div><div><small>${rec.isHold?'Haltezeit':'Wiederholungen'}</small><strong>${escapeHtml(rec.target)}</strong></div></div><div class="v24-weight"><span>Gewicht</span><b>${escapeHtml(rec.weightText)}</b></div><p class="v24-guidance-note">${escapeHtml(rec.note)}</p></div>`:''}
  <div class="v24-how"><div class="v24-overline">SO GEHT DIE ÜBUNG</div><h2>${escapeHtml(ex.name)}</h2><ol>${(d.steps||[ex.tip||'Kontrolliert bewegen, ohne Schmerzen zu provozieren.']).map(x=>`<li>${escapeHtml(x)}</li>`).join('')}</ol>
  <div class="v24-tips"><p><strong>Häufiger Fehler:</strong> ${escapeHtml(d.avoid||'Schwung einsetzen statt die Bewegung zu kontrollieren.')}</p><p><strong>Atmung:</strong> ${escapeHtml(d.breath||'Ruhig und gleichmäßig atmen.')}</p>${d.tempo?`<p><strong>Tempo:</strong> ${escapeHtml(d.tempo)}</p>`:''}</div>
  <details class="v24-variations"><summary>Leichter oder schwerer trainieren</summary><p><b>Leichter:</b> ${escapeHtml(ex.easy||'Bewegungsumfang reduzieren.')}</p><p><b>Schwerer:</b> ${escapeHtml(ex.hard||'Wiederholungen kontrollierter ausführen.')}</p></details>
  </div></section>`;
}
function enhanceDetail(){
 if(state.view==='detail'){
  const exercise=list(state.index)?.[state.detailIndex];if(!exercise)return;
  const rec=recommendation(exercise,null);
  if(state.detailTab==='training'){
   const anchor=document.querySelector('.detail-section-title');if(anchor){anchor.insertAdjacentHTML('beforebegin',guideSection(rec));}
   const copy=document.querySelector('[data-copy-last]');const guide=document.querySelector('.v24-prescription');if(copy&&guide)guide.append(copy);
  }
  if(state.detailTab==='guide'){
   const guide=document.querySelector('.detail-guide');if(guide){guide.insertAdjacentHTML('beforebegin',guideSection(rec));guide.classList.add('v24-original-guide');guide.innerHTML='<a class="v24-more-link" href="'+escapeHtml(rec.ex.link||'#')+'" target="_blank" rel="noopener noreferrer">Weitere externe Übungsanleitung ↗</a>'}
  }
 } else if(state.view==='randomizer'&&state.randomStage==='detail'){
  const rs=activeRandom(),exercise=rs?.exercises?.[state.randomDetailIndex||0];if(!exercise)return;
  const rec=recommendation(exercise,rs);
  const lastBox=document.querySelector('.v23-last-box');if(lastBox)lastBox.insertAdjacentHTML('beforebegin',guideSection(rec));
  const oldGuide=document.querySelector('.v23-guide');if(oldGuide)oldGuide.remove();
  const how=document.querySelector('.v24-how');if(how&&window.innerWidth<=450){how.classList.add('v24-small')}
  const prescription=document.querySelector('.v24-prescription');
  if(prescription&&!rs.completed&&rec.last?.lines?.length){prescription.insertAdjacentHTML('beforeend','<button class="v24-paste" type="button" data-v24-random-last>↙ Vorherige Satzwerte übernehmen</button>')}
 }

}
const oldRender=render;
render=function(){oldRender();enhanceDetail()};
document.addEventListener('click',e=>{
 const btn=e.target.closest('[data-v24-random-last]');if(!btn)return;
 const rs=activeRandom(),item=rs?.exercises?.[state.randomDetailIndex||0];if(!item||rs.completed)return;
 const last=exerciseHistoryBefore(item.id,rs).at(-1);if(!last?.lines?.length)return;
 modifyRandom(session=>{
  const x=session.exercises[state.randomDetailIndex||0];
  if(!Array.isArray(x.weights))x.weights=x.sets.map(()=>null);
  last.lines.slice(0,x.sets.length).forEach((line,j)=>{
   if(!isVal(x.sets[j]))x.sets[j]=line.reps;
   if((x.weights[j]===null||x.weights[j]===undefined||x.weights[j]==='')&&line.weight!==null)x.weights[j]=line.weight;
  });
 });
 const p=document.createElement('p');p.className='v24-copy-note';p.textContent='Vorwerte übernommen. Erst nach der Ausführung einen Satz abhaken.';
 document.querySelector('.v24-paste')?.after(p);
},true);
render();
})();
