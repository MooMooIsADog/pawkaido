import {INNS} from './data.js';
import {mapPoints,pathFor} from './map.js';

// Replay precisely the same cubic curves drawn on the map, including skipped stops.
export async function walkOnMap({dog,from,to,leg,fast,sprite,animateSprites}){
 const root=document.querySelector('#route'),canvas=root.querySelector('.map-canvas');
 if(!canvas||to<=from||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 const wasList=root.classList.contains('map-list-mode'),view=document.querySelector('[data-map-control="view"]');
 root.classList.remove('map-list-mode');if(wasList){view.textContent='地点列表';view.setAttribute('aria-pressed','false');}
 const points=mapPoints(leg,INNS[leg+1]-INNS[leg]+1);
 const path=document.createElementNS('http://www.w3.org/2000/svg','path');
 path.setAttribute('d',pathFor(points,from-INNS[leg],to-INNS[leg]));
 const svg=canvas.querySelector('.map-path');svg.append(path);
 const length=path.getTotalLength(),duration=Math.max(fast?450:1000,Math.min(fast?1600:4600,length*(fast?1.2:3.5)));
 const source=root.querySelector(`.stop[data-id="${from}"] .sprite[data-dog="${dog}"]`)?.closest('.token');
 const walker=document.createElement('div');walker.className='walking-dog';walker.dataset.dog=dog;
 walker.innerHTML=sprite(dog,1)+`<span>散步中…</span>`;canvas.append(walker);
 if(source)source.style.visibility='hidden';
 const pet=walker.querySelector('.sprite'),scroller=root.querySelector('.map-scroll');
 let lastX=path.getPointAtLength(0).x,lastRow=1;
 const paint=t=>{
  const point=path.getPointAtLength(t*length);
  walker.style.left=`${point.x/10}%`;walker.style.top=`${point.y/6.66667}%`;
  if(Math.abs(point.x-lastX)>.1){const row=point.x<lastX?2:1;if(row!==lastRow){pet.dataset.row=row;lastRow=row;animateSprites();}}
  lastX=point.x;
  // Keep the moving dog in view when zoomed; never scroll the whole document per frame.
  if(scroller.scrollWidth>scroller.clientWidth+1){const x=point.x/1000*canvas.clientWidth,margin=Math.min(110,scroller.clientWidth*.28);
   if(x<scroller.scrollLeft+margin)scroller.scrollLeft=x-margin;
   else if(x>scroller.scrollLeft+scroller.clientWidth-margin)scroller.scrollLeft=x-scroller.clientWidth+margin;
  }
 };
 paint(0);animateSprites();
 // Bring the map into view if a deep list selection or an AI turn started off-screen.
 const bounds=scroller.getBoundingClientRect();
 if(bounds.bottom>innerHeight-24||bounds.top<24)scroller.scrollIntoView({block:'center',behavior:'instant'});
 try{
  await new Promise(resolve=>{
   let started;
   const tick=now=>{if(started===undefined)started=now;const t=Math.min(1,(now-started)/duration);paint(t);if(t<1)requestAnimationFrame(tick);else resolve();};
   requestAnimationFrame(tick);
  });
 }finally{
  walker.remove();path.remove();if(source)source.style.visibility='';
  if(wasList){root.classList.add('map-list-mode');view.textContent='山海地图';view.setAttribute('aria-pressed','true');}
 }
}
