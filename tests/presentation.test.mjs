import test from 'node:test';
import assert from 'node:assert/strict';
import {mapPoints,pathFor} from '../dist/map.js';
import {INNS} from '../dist/data.js';
import {scoreBreakdown} from '../dist/scores.js';
import {newGame,act,aiAction} from '../dist/engine.js';

test('walking subpaths use the identical cubic segments of the visible full road',()=>{
 for(let leg=0;leg<4;leg++){
  const points=mapPoints(leg,INNS[leg+1]-INNS[leg]+1),segments=pathFor(points).split(' C').slice(1);
  for(let start=0;start<points.length-1;start++)for(let end=start+1;end<points.length;end++){
   assert.deepEqual(pathFor(points,start,end).split(' C').slice(1),segments.slice(start,end));
  }
 }
});

test('all four final breakdowns reconcile with the actual scores across complete games',()=>{
 const seen=new Set();
 for(let seed=1;seed<=40;seed++){
  let s=newGame(seed*104729);for(let step=0;!s.ended&&step<1000;step++)s=act(s,s.phase==='draft'?{type:'role',id:s.players[s.current].draft[(seed+s.current)%2]}:aiAction(s));assert.ok(s.ended);
  for(const p of s.players){seen.add(p.role);const detail=scoreBreakdown(p,s.players);assert.equal(detail.total,p.score);assert.equal(detail.rows.length,9);
   assert.equal(detail.rows.find(r=>r.key==='pano').value,Object.values(p.pano).reduce((n,v)=>n+v*(v+1)/2,0));
   assert.equal(detail.rows.find(r=>r.key==='springs').value,p.springs.reduce((n,c)=>n+c.points+(p.role==='elder'?1:0),0));
   assert.equal(detail.rows.find(r=>r.key==='awards').value,p.awards.length*(p.role==='elder'?4:3));
   assert.equal(detail.rows.find(r=>r.key==='templeFinal').value,p.templeBonus);
   assert.ok(detail.rows.every(r=>r.explanation&&!/undefined|NaN/.test(r.explanation)));
  }
 }
 assert.equal(seen.size,10);
});
