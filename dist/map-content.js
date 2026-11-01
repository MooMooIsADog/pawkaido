import japan from './map-packs/japan/index.js';
import catalog from './map-packs/catalog.js';
const counts=[15,14,15,14];
export function validateMapPack(pack){
 if(!pack||!/^[-a-z0-9]+$/.test(pack.id)||typeof pack.name!=='string'||typeof pack.version!=='string'||pack.regions?.length!==4||pack.innNames?.length!==5||pack.legNames?.length!==4)throw Error('地图包信息不完整');
 for(const [i,r] of pack.regions.entries()){
  if(!r.name||!r.image||!r.story?.title||!Array.isArray(r.story.paragraphs)||!r.route?.length)throw Error('地图图像或介绍缺失');
  if(r.route.some(p=>p.length!==2||p.some(v=>!Number.isFinite(v)||v<0||v>100)))throw Error('地图坐标越界');
  const stops=r.stops||r.route.map((_,j)=>j);
  if(stops.length!==counts[i]||stops[0]!==0||stops.at(-1)!==r.route.length-1||stops.some((v,j)=>!Number.isInteger(v)||v<0||v>=r.route.length||(j&&v<=stops[j-1])))throw Error('地图站点与棋盘不一致');
 }
 return pack;
}
const packs=new Map([[japan.id,validateMapPack(japan)]]);
export const mapLoadErrors=[];
for(const item of catalog){try{const pack=validateMapPack((await import(new URL(item.entry,new URL('./map-packs/catalog.js',import.meta.url)))).default);if(pack.id!==item.id||packs.has(pack.id))throw Error('地图编号重复或不匹配');packs.set(pack.id,pack);}catch{mapLoadErrors.push(`地图包 ${item.id} 暂时无法读取，日本地图仍可使用。`);}}
let active=japan;
export const mapPacks=()=>[...packs.values()];
export const getMapPack=(id=active.id)=>packs.get(id)||japan;
export const hasMapPack=id=>packs.has(id);
export function setMapPack(id){active=getMapPack(id);return active;}
export const mapIdForSave=s=>hasMapPack(s?.presentation?.mapPack)?s.presentation.mapPack:'japan';
const patterns=new WeakMap();
// Translate only visible prose. Never change card IDs, state, rule data or actions.
export function themeText(text,pack=active){
 if(!text||!Object.keys(pack.replacements).length)return text;
 if(!patterns.has(pack)){const keys=Object.keys(pack.replacements).sort((a,b)=>b.length-a.length);patterns.set(pack,new RegExp(keys.map(s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|'),'g'));}
 return String(text).replace(patterns.get(pack),m=>pack.replacements[m]);
}
export function themeDOM(root,pack=active){
 if(!root||pack.id==='japan')return;
 const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let n;
 while((n=walker.nextNode()))if(!n.parentElement.closest('[data-map-literal],script,style'))n.nodeValue=themeText(n.nodeValue,pack);
 for(const el of root.querySelectorAll('[aria-label],[title]'))if(!el.closest('[data-map-literal]'))for(const attr of ['aria-label','title'])if(el.hasAttribute(attr))el.setAttribute(attr,themeText(el.getAttribute(attr),pack));
}
