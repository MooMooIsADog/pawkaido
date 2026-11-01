import {getMapPack} from './map-content.js';
// Every pack shares the same station IDs. Dense waypoints follow the painted road.
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function mapGeometry(leg,count,pack=getMapPack()){
 const r=pack.regions[leg],indices=r.stops||r.route.map((_,i)=>i);
 if(indices.length!==count)throw Error('地图站点数量不匹配');
 return {route:r.route,indices,points:indices.map(i=>r.route[i])};
}
export const mapPoints=(leg,count,pack)=>mapGeometry(leg,count,pack).points;
export function roadPath(leg,count,start=0,end=count-1,pack=getMapPack()){
 const {route,indices}=mapGeometry(leg,count,pack);
 return pathFor(route,indices[start],indices[end]);
}
export function artStyle(r){return `background-image:url('${r.image}');background-size:${r.imageSize};background-position:${r.imagePosition}`;}
export function mapStoryHTML(leg){const pack=getMapPack(),r=pack.regions[leg],story=r.story;return `<figure class="map-story-picture"><div class="atlas-scene" style="${artStyle(r)}" role="img" aria-label="${esc(r.name+pack.style)}地图"></div><figcaption>${esc(r.sub)}</figcaption></figure><div class="dialog-copy map-story-copy"><h3>${esc(story.title)}</h3>${story.paragraphs.map(p=>`<p>${esc(p)}</p>`).join('')}</div><div class="note-box map-story-note">${esc(pack.storyNote)}<br><br>我看见背景里的风景不会自动拿到画卷；我还要在风景地点停靠，或收到朋友、旅行能力送来的画卷，才能把它们收进背包啦。</div>`;}
const coord=p=>`${p[0]*10},${p[1]*6.66667}`;
export function pathFor(points,start=0,end=points.length-1){
 let path=`M${coord(points[start])}`;
 for(let i=start+1;i<=end;i++){
  const a=points[i-1],b=points[i],prev=points[Math.max(0,i-2)],next=points[Math.min(points.length-1,i+1)];
  const c1=[a[0]+(b[0]-prev[0])/6,a[1]+(b[1]-prev[1])/6],c2=[b[0]-(next[0]-a[0])/6,b[1]-(next[1]-a[1])/6];
  path+=` C${coord(c1)} ${coord(c2)} ${coord(b)}`;
 }
 return path;
}
export function mapMarkup(leg,points,buttons,progress){const pack=getMapPack(),r=pack.regions[leg],count=points.length,path=roadPath(leg,count);return `<div class="map-scroll" tabindex="0" role="region" aria-label="可横向滚动的旅行地图"><div class="map-canvas ${pack.paintedRoad?'painted-road':''}" data-map-pack="${pack.id}" data-leg="${leg}"><div class="map-art" style="${artStyle(r)}" role="img" aria-label="${esc(pack.style+r.name)}地图"></div><div class="map-cartouche"><span>${esc(pack.cartouche)}</span><strong>${esc(r.name)}</strong><small>${esc(r.sub)}</small></div>${r.landmarks.map(([n,x,y])=>`<span class="map-landmark" style="left:${x}%;top:${y}%">${esc(n)}</span>`).join('')}<svg class="map-path" viewBox="0 0 1000 666.667" aria-hidden="true"><path class="road-edge" d="${path}"/><path class="road-paper" d="${path}"/><path class="road-guide" d="${path}"/>${progress>0?`<path class="road-done" d="${roadPath(leg,count,0,progress)}"/>`:''}</svg><div class="route map-stops">${buttons}</div><div class="map-seal">${pack.seal}</div><span class="map-caption">${esc(pack.caption)}</span></div></div>`;}
export function mapAtlasHTML(){const pack=getMapPack();return `<div class="map-atlas">${pack.regions.map((r,i)=>`<figure><div class="atlas-scene" style="${artStyle(r)}" role="img" aria-label="${esc(r.name+pack.style)}地图"></div><figcaption>第 ${i+1} 段 · ${esc(r.name)}<button class="text-button" data-ui="scenery" data-id="${i}" aria-label="MooMoo 介绍${esc(r.name)}">听我讲风景 ↗</button></figcaption></figure>`).join('')}</div>`;}
export function initMapControls(){document.addEventListener('click',e=>{
 const b=e.target.closest('[data-map-control]');if(!b||document.querySelector('#route').dataset.walking==='true')return;
 const root=document.querySelector('#route'),action=b.dataset.mapControl;
 if(action==='view'){
  const list=root.classList.toggle('map-list-mode');b.textContent=list?'山海地图':'地点列表';b.setAttribute('aria-pressed',String(list));
  document.querySelectorAll('[data-map-control="zoom"],[data-map-control="locate"]').forEach(el=>el.disabled=list);
 }else if(action==='zoom'){
  const zoom=root.classList.toggle('map-zoomed');b.textContent=zoom?'缩小地图':'放大地图';b.setAttribute('aria-pressed',String(zoom));
 }else if(action==='locate'){
  const target=root.querySelector('.active-position')||root.querySelector('.occupied'),scroller=root.querySelector('.map-scroll');
  if(target&&scroller){const t=target.getBoundingClientRect(),v=scroller.getBoundingClientRect();scroller.scrollTo({left:scroller.scrollLeft+t.left-v.left-v.width/2+t.width/2,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});target.focus({preventScroll:true});}
 }
});}
