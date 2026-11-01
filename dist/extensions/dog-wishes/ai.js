import {wishProgress} from './rules.js';
export function moveValue(s,p,type){const w=wishProgress(p);if(!w||w.complete||w.missed)return 0;
 if(p.id===0)return type==='farm'&&p.cash<3?2:type==='inn'&&p.cash>=1?1:0;
 if(p.id===1)return w.scenery.some(c=>c.type===type&&c.count<c.target)?2:0;
 if(p.id===2)return type==='spring'?2:0;
 return type==='farm'?2:0;
}
export function reserve(s,p){const w=wishProgress(p);return p.id===0&&!w.complete&&!w.missed?3:2;}
