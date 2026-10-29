/* FORM. V25 — workout-first exercise details, reliable visual fallbacks.
 * No training data migration; progressive enhancement over V24. */
(()=>{
'use strict';
// A walking lunge is not an accurate visual demonstration of a reverse lunge.
const originalPhotoSourceV25=photoSrc;
photoSrc=function(id,step=0){return id==='lunge'?null:originalPhotoSourceV25(id,step)};
const esc25 = s => String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function muscleLabels(id){
 const ex=catalog[id]||{};
 return (ex.muscles||[]).map(m=>muscleNames[m]||m).join(' · ')||'Ganzkörper';
}
function anatomyBlock(id){
 const ex=catalog[id];
 if(!ex || typeof window.FORM_muscleDiagram!=='function')return null;
 const map=window.FORM_muscleDiagram(ex.muscles||[]);
 return `<section class="v25-anatomy" aria-label="Beanspruchte Muskelgruppen">
  <div class="v25-anatomy-titles"><span class="v25-kicker">MUSKELÜBERSICHT</span><strong>${esc25(muscleLabels(id))}</strong>
  <small>Vorder- und Rückansicht · grün: beteiligte Muskelgruppen</small></div>
  ${map}<p>Keine geprüfte Bildserie für diese Übung. Die Körperkarte zeigt <b>Muskelgruppen</b>, nicht die Bewegungsausführung.</p>
  <p class="v25-credit">Anatomie: <a href="https://github.com/emmorts/body-muscles" rel="noopener noreferrer" target="_blank">Body Muscles</a> (Apache-2.0).</p>
 </section>`;
}
function installExerciseVisual(id){
 const normal=state.view==='detail',random=state.view==='randomizer'&&state.randomStage==='detail';
 if(!normal&&!random)return;
 const gallery=document.querySelector(normal?'.form-gallery, .media-missing':'.v23-demonstrations, .form-gallery, .media-missing');
 if(!gallery)return;
 const replacement=()=>{
  if(!gallery.isConnected||gallery.classList.contains('v25-visual-replaced'))return;
  const atlas=anatomyBlock(id);
  if(!atlas)return;
  gallery.classList.add('v25-visual-replaced');
  gallery.outerHTML=atlas;
  const credit=document.querySelector(normal?'.image-credit':'.v23-demo-credit');
  if(credit)credit.hidden=true;
 };
 const images=[...gallery.querySelectorAll('img')];
 if(!images.length){replacement();return}
 const check=()=>{
  if(images.every(im=>im.complete&&im.naturalWidth===0))replacement();
 };
 images.forEach(im=>{im.addEventListener('error',check,{once:true});im.addEventListener('load',check,{once:true})});
 check();
}
function repositionTrainingDetail(){
 const isNormal=state.view==='detail'&&state.detailTab==='training';
 const isRandom=state.view==='randomizer'&&state.randomStage==='detail';
 if(!isNormal&&!isRandom)return;
 const id=isNormal?list(state.index)[state.detailIndex]?.id:activeRandom()?.exercises?.[state.randomDetailIndex||0]?.id;
 if(!id)return;
 const coach=document.querySelector('.v24-coach');
 const prescription=coach?.querySelector('.v24-prescription');
 const how=coach?.querySelector('.v24-how');
 if(prescription){
  const anchor=document.querySelector(isNormal?'.detail-tabs':'.v23-detail-heading');
  if(anchor){
   anchor.after(prescription);
   prescription.classList.add('v25-prescription-top');
   prescription.insertAdjacentHTML('afterend','<button type="button" class="v25-jump" data-v25-jump>Sätze erfassen ↓</button>');
  }
 }
 if(how){
  const section=document.createElement('details');section.className='v25-instructions';
  section.innerHTML='<summary><span>Technik & Ausführung</span><small>Schritte, Atmung, häufige Fehler</small></summary>';
  section.append(how);
  const after=document.querySelector(isNormal?'.detail-tools':'.v23-sets');
  if(after)after.after(section);
 }
 if(coach&&!coach.children.length)coach.remove();
 installExerciseVisual(id);
}
function improveRandomCards(){
 if(state.view!=='randomizer'||state.randomStage!=='plan')return;
 const rs=activeRandom();if(!rs)return;
 document.querySelectorAll('.v23-exercise').forEach((card,i)=>{
  const x=rs.exercises[i],ex=catalog[x?.id];if(!ex)return;
  const sub=card.querySelector('.v23-sub');
  if(sub){
   const hold=setMetric(x.id)==='Sek.';
   sub.textContent=`${x.sets.length} Sätze · ${ex.target|| (hold?'20–30 Sek.':'8–12 Wdh.')}`;
  }
  const thumb=card.querySelector('.v23-thumb');
  if(thumb&&!thumb.querySelector('img')){
   const small=thumb.querySelector('.v23-fallback small');
   if(small)small.textContent='Muskelübersicht im Detail';
  }
 });
}
document.addEventListener('click',event=>{
 const jump=event.target.closest('[data-v25-jump]');if(!jump)return;
 const sets=document.querySelector(state.view==='randomizer'?'.v23-detail-set-header':'.detail-section-title');
 if(sets)sets.scrollIntoView({behavior:'smooth',block:'start'});
});
const originalRender=render;
render=function(){
 originalRender();
 try{repositionTrainingDetail();improveRandomCards()}catch(e){console.error('FORM V25 view enhancement:',e)}
};
render();
})();