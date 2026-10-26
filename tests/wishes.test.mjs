import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,act,aiAction,validateSave} from '../dist/engine.js';
import {FOODS} from '../dist/data.js';
import {wishProgress} from '../dist/wishes.js';
import {scoreBreakdown} from '../dist/scores.js';
function ready(id=0){let s=newGame(12,'table','wishes');while(s.phase==='draft')s=act(s,aiAction(s));s.current=id;s.players.forEach(p=>{p.pos=0;p.cash=20;p.role='elder';});return s;}
function readyDouble(){const s=ready(1);s.players[1].wish.sceneryTarget=2;s.players[1].wish.points=4;return s;}
function visit(s,id){s.phase='move';s.leg=id<=14?0:id<=27?1:id<=41?2:3;return act(s,{type:'move',id});}
function meal(s,pos,i,free=false){s.players[s.current].pos=pos;s.phase='choice';s.pending={type:'meal',...(free?{free:'test'}:{})};s.menu=[{...FOODS[i],uid:'test'}];s.queue=[{kind:'finish'}];return act(s,{type:'meal',id:'test'});}
test('classic is default, legacy saves remain classic; invalid editions rejected',()=>{const s=newGame(42);assert.equal(s.edition,'classic');assert(!s.players[0].wish);delete s.edition;assert(validateSave(s));assert.throws(()=>newGame(1,'solo','wrong'));});
test('MooMoo needs all three intermediate inns; free meal counts; only one award, no elder extra',()=>{let s=ready();s=meal(s,14,0,true);s=meal(s,27,1);assert.equal(s.players[0].ledger.wishes,undefined);s=meal(s,41,2);assert.equal(s.players[0].ledger.wishes,6);assert.equal(s.players[0].score,24);assert.deepEqual(s.players[0].awards,[]);assert(validateSave(s));s=meal(JSON.parse(JSON.stringify(s)),54,3);assert.equal(s.players[0].ledger.wishes,6);assert.equal(s.players[0].score,30);s=ready();s=meal(s,14,0);s=meal(s,41,1);s=meal(s,54,2);assert(!wishProgress(s.players[0]).complete);assert(wishProgress(s.players[0]).missed);});
test('legacy Yuki needs two pieces per scenery type, capped separately; talent gifts count',()=>{
 let s=readyDouble();s.players[1].role='artist';s=visit(s,14);s=act(s,{type:'panorama',id:'sea'});assert.equal(wishProgress(s.players[1]).count,1);
 s=readyDouble();for(const id of [4,6,11])s=visit(s,id);
 assert.equal(wishProgress(s.players[1]).count,3);assert(!wishProgress(s.players[1]).complete);assert.equal(s.players[1].ledger.wishes,undefined);
 for(const id of [12,15,19])s=visit(s,id);
 assert.equal(wishProgress(s.players[1]).count,5);assert.deepEqual(wishProgress(s.players[1]).scenery.map(c=>c.count),[1,2,2]);assert.equal(s.players[1].ledger.wishes,undefined);
 const corrupt=structuredClone(s);corrupt.players[1].wish.scenery.push('mountain');assert(!validateSave(corrupt));
 s=visit(JSON.parse(JSON.stringify(s)),28);assert.equal(s.players[1].ledger.wishes,4);assert(validateSave(s));assert.equal(wishProgress(s.players[1]).target,6);assert(wishProgress(s.players[1]).complete);
 const score=s.players[1].score;s=visit(s,34);assert.equal(s.players[1].ledger.wishes,4);assert.equal(s.players[1].score,score+3);assert(validateSave(s));
});
test('Biscuit needs three successful springs; exhausted deck cannot complete it',()=>{let s=ready(2);s=visit(s,5);s=visit(s,13);const empty=structuredClone(s);empty.decks.springs=[];const failed=visit(empty,22);assert.equal(wishProgress(failed.players[2]).count,2);s=visit(s,22);assert.equal(s.players[2].ledger.wishes,6);assert.equal(s.players[2].score,s.players[2].springs.reduce((n,c)=>n+c.points+1,0)+6);});
test('Rex helps at two farms for four points; extra farms do not pay again',()=>{let s=ready(3);s=visit(s,7);assert.equal(s.players[3].ledger.wishes,undefined);s=visit(s,17);assert.equal(s.players[3].ledger.wishes,4);assert.equal(s.players[3].cash,26);s=visit(s,26);assert.equal(s.players[3].ledger.wishes,4);assert.equal(s.players[3].score,4);});
test('wish state and accounting survive restore; corrupt progress is rejected',()=>{let s=visit(ready(3),7);assert(validateSave(s));const clone=JSON.parse(JSON.stringify(s));assert.deepEqual(visit(s,17),visit(clone,17));clone.players[3].wish.farms.push(7);assert(!validateSave(clone));s.players[3].wish.claimed=true;assert(!validateSave(s));});
test('endgame ranks wish points but does not count wishes as achievement cards',()=>{let s=ready(3);s=visit(s,7);s=visit(s,17);s.players.forEach(p=>{p.pos=54;p.score=p.id===3?4:0;p.ledger=p.id===3?{wishes:4}:{};});s.leg=3;s.phase='notice';s=act(s,{type:'ack'});assert.deepEqual(s.winners,[3]);assert(s.players.every(p=>p.awards.length===4));for(const p of s.players)assert.equal(scoreBreakdown(p,s.players).total,p.score);});
test('100 seeded expansion games terminate with valid accounting and restore determinism',()=>{for(let seed=1;seed<=100;seed++){let s=newGame(Math.imul(seed,2654435761),'solo','wishes');let n=0;while(!s.ended&&n++<650){s=act(s,aiAction(s));assert(validateSave(s),`invalid seed ${seed}, action ${n}`);if(n%19===0)s=JSON.parse(JSON.stringify(s));}assert(s.ended);for(const p of s.players){assert.equal(scoreBreakdown(p,s.players).total,p.score);assert.equal(p.ledger.wishes||0,wishProgress(p).complete?[6,6,6,4][p.id]:0);}}});

test('legacy single-stop saves keep their conditions and 2/3/4-point rewards',()=>{
 for(const points of [undefined,2,3,4]){
  let old=ready(1);delete old.players[1].wish.sceneryTarget;delete old.players[1].wish.sceneryIncludesGifts;
  if(points===undefined)delete old.players[1].wish.points;else old.players[1].wish.points=points;
  assert(validateSave(old));assert.equal(wishProgress(old.players[1]).target,3);
  for(const id of [4,6,11])old=visit(old,id);
  assert.equal(old.players[1].ledger.wishes,points??4);assert(validateSave(old));
  assert.equal(scoreBreakdown(old.players[1],old.players).total,old.players[1].score);
  old.players[1].wish.points=99;assert(!validateSave(old));
 }
 const current=ready(1);assert.equal(wishProgress(current.players[1]).points,6);assert.equal(wishProgress(current.players[1]).target,12);
 current.players[1].wish.sceneryTarget=3;assert(!validateSave(current));
});

test('legacy two gifted paddies cannot lock Yuki out; gifts and stops never double count',()=>{
 let s=readyDouble();s.players[1].role='artist';
 for(const id of [14,27]){s=visit(s,id);s=act(s,{type:'panorama',id:'paddy'});}
 assert.equal(s.players[1].pano.paddy,2);assert.deepEqual(wishProgress(s.players[1]).scenery.map(c=>c.count),[2,0,0]);
 s=visit(s,28);assert.equal(s.players[1].pano.paddy,3);assert.equal(wishProgress(s.players[1]).count,2);
 for(const id of [32,34,46,50])s=visit(s,id);
 assert.equal(s.players[1].ledger.wishes,4);assert(validateSave(s));assert(wishProgress(s.players[1]).complete);
 s=act(JSON.parse(JSON.stringify(s)),{type:'ack'});assert.equal(s.players[1].ledger.wishes,4);assert(validateSave(s));
});
test('encounter gift counts for Yuki, and completed panorama fallback counts the actual gift type',()=>{
 let s=ready(1);s.decks.encounters=[{id:'test-paddy',type:'paddy'}];s=visit(s,3);
 assert.deepEqual(wishProgress(s.players[1]).scenery.map(c=>c.count),[1,0,0]);
 s.players[1].pano.paddy=3;s.decks.encounters=[{id:'test-fallback',type:'paddy'}];s=visit(s,10);assert.equal(s.pending.type,'panorama');
 s=act(s,{type:'panorama',id:'sea'});assert.deepEqual(wishProgress(s.players[1]).scenery.map(c=>c.count),[1,0,1]);
});
test('previous two-stop save retains physical-only rule when gift flag is absent',()=>{
 let s=readyDouble();delete s.players[1].wish.sceneryIncludesGifts;s.players[1].role='artist';s=visit(s,14);s=act(s,{type:'panorama',id:'paddy'});
 assert.equal(wishProgress(s.players[1]).count,0);assert(validateSave(s));assert.match(wishProgress(s.players[1]).text,/亲自停靠两次/);
});

test('Yuki must complete all three panoramas for six points; legacy full saves keep four',()=>{
 for(const reward of [4,6]){
 let s=ready(1);s.players[1].wish.points=reward;s.players[1].role='artist';assert.match(wishProgress(s.players[1]).text,new RegExp(`获得 ${reward} 分`));
 for(const id of [14,27]){s=visit(s,id);s=act(s,{type:'panorama',id:'paddy'});}
 s=visit(s,28);assert.deepEqual(wishProgress(s.players[1]).scenery.map(c=>[c.count,c.target]),[[3,3],[0,4],[0,5]]);
 const give=type=>{s.phase='choice';s.pending={type:'panorama',choices:[type]};s.queue=[{kind:'finish'}];s=act(s,{type:'panorama',id:type});};
 for(let n=0;n<4;n++)give('mountain');for(let n=0;n<4;n++)give('sea');
 assert.equal(wishProgress(s.players[1]).count,11);assert.equal(wishProgress(s.players[1]).target,12);assert.equal(s.players[1].ledger.wishes,undefined);assert(validateSave(s));
 s=JSON.parse(JSON.stringify(s));give('sea');assert.equal(s.players[1].ledger.wishes,reward);assert(wishProgress(s.players[1]).complete);assert(validateSave(s));
 assert.deepEqual(s.players[1].pano,{paddy:3,mountain:4,sea:5});assert.equal(scoreBreakdown(s.players[1],s.players).total,s.players[1].score);
 s=act(JSON.parse(JSON.stringify(s)),{type:'ack'});assert.equal(s.players[1].ledger.wishes,reward);assert(validateSave(s));
 }
});
