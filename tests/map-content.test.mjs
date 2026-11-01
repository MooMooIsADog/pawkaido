import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {mapPacks,getMapPack,setMapPack,mapIdForSave,validateMapPack,themeText,mapLoadErrors} from '../dist/map-content.js';
import {mapGeometry,roadPath,pathFor,mapPoints,mapStoryHTML,mapAtlasHTML} from '../dist/map.js';
import {INNS} from '../dist/data.js';
import {newGame,act,aiAction,validateSave} from '../dist/engine.js';

test('all content packs load; exact station counts and shared walking curves on every chapter',()=>{
 assert.deepEqual(mapLoadErrors,[]);assert.equal(mapPacks().length,2);
 for(const pack of mapPacks())for(let leg=0;leg<4;leg++){
  const count=INNS[leg+1]-INNS[leg]+1,{route,indices,points}=mapGeometry(leg,count,pack);
  assert.equal(points.length,count);
  const full=roadPath(leg,count,0,count-1,pack).split(' C').slice(1);
  for(let a=0;a<count-1;a++)for(let b=a+1;b<count;b++)assert.deepEqual(roadPath(leg,count,a,b,pack).split(' C').slice(1),full.slice(indices[a],indices[b]));
  assert.equal(pathFor(route),roadPath(leg,count,0,count-1,pack));
  if(pack.id==='east-coast'){assert.ok(points[0][0]>points.at(-1)[0]);assert.ok(points[0][1]<points.at(-1)[1]);}
 }
});
test('map schema rejects wrong station counts and unsafe coordinates',()=>{
 const bad=structuredClone(getMapPack('east-coast'));bad.regions[0].stops.pop();assert.throws(()=>validateMapPack(bad));
 const badPoint=structuredClone(getMapPack('east-coast'));badPoint.regions[0].route[0][0]=101;assert.throws(()=>validateMapPack(badPoint));
});
test('East Coast routes visit upper-left inland and leave room between every pair of stops',()=>{
 const pack=getMapPack('east-coast');
 for(let leg=0;leg<4;leg++){
  const {route,points}=mapGeometry(leg,INNS[leg+1]-INNS[leg]+1,pack);
  const distance=(a,b)=>Math.hypot((a[0]-b[0])*10,(a[1]-b[1])*6.66667);
  assert.ok(route.some(([x,y])=>x<25&&y<40),'route must use upper-left land');
  const length=route.slice(1).reduce((sum,p,i)=>sum+distance(p,route[i]),0);
  assert.ok(length>2*distance(route[0],route.at(-1)),'route must take substantial inland bends');
  for(let i=0;i<points.length;i++)for(let j=i+1;j<points.length;j++)assert.ok(distance(points[i],points[j])>70,`chapter ${leg+1}: stops ${i}/${j} too close`);
 }
});
test('original artwork matches pinned hashes and runtime derivatives are present',async()=>{
 const root=new URL('../artifacts/east-coast-maps-v1/',import.meta.url),manifest=JSON.parse(await readFile(new URL('ORIGINALS.sha256.json',root),'utf8'));
 assert.equal(Object.keys(manifest.files).length,4);
 for(const [file,hash] of Object.entries(manifest.files))assert.equal(createHash('sha256').update(await readFile(new URL(file,root))).digest('hex'),hash);
 for(const pack of mapPacks())for(const r of pack.regions)assert.ok((await readFile(new URL('../dist/'+r.image,import.meta.url))).length>0);
});
test('legacy saves use Japan and unavailable themes fall back without mutating state',()=>{
 const s=newGame(11);assert.equal(mapIdForSave(s),'japan');s.presentation={mapPack:'absent'};
 const before=JSON.stringify(s);assert.equal(mapIdForSave(s),'japan');assert.equal(JSON.stringify(s),before);assert.ok(validateSave(s));
});
test('theme prose covers events, cards, achievements and wishes without modifying source text',()=>{
 const p=getMapPack('east-coast'),text='京都 · 小爪出发屋：稻田嗅嗅，江户，犬守神社，稻田 3/3，富士爪印画';
 assert.equal(themeText(text,p),'波士顿 · 金顶出发屋：绿野明信片，华盛顿，汪汪爱心站，绿野 3/3，灯塔爪印画');
 assert.equal(themeText(text,getMapPack('japan')),text);
 setMapPack('east-coast');assert.match(mapStoryHTML(0),/洛夫克拉夫特/);assert.match(mapStoryHTML(3),/爱伦·坡/);assert.match(mapStoryHTML(3),/黑猫/);assert.match(mapAtlasHTML(),/04-philadelphia-washington.webp/);setMapPack('japan');
});
test('100 paired complete games: theme metadata never changes AI actions, rule state, scores or restore',()=>{
 const clean=s=>{const c=structuredClone(s);delete c.presentation;return c;};
 for(const edition of ['classic','wishes'])for(let seed=1;seed<=50;seed++){
  let a=newGame(seed*104729,'solo',edition),b=structuredClone(a);b.presentation={mapPack:'east-coast',mapVersion:'1.0.0'};
  for(let step=0;!a.ended&&step<1000;step++){
   const x=aiAction(a),y=aiAction(b);assert.deepEqual(y,x);a=act(a,x);b=act(b,y);assert.deepEqual(clean(b),a);
   if(step%37===0){b=JSON.parse(JSON.stringify(b));assert.ok(validateSave(b));assert.equal(mapIdForSave(b),'east-coast');}
  }
  assert.ok(a.ended);assert.deepEqual(b.winners,a.winners);assert.deepEqual(b.players.map(p=>p.score),a.players.map(p=>p.score));
 }
});
