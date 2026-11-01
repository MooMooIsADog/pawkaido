import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,copyFile,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createExtensionHost} from '../dist/extension-host.js';
import {extensions,extensionLoadErrors} from '../dist/extensions.js';
import wishes from '../dist/extensions/dog-wishes/index.js';
import {newGame,act,aiAction,validateSave,saveCompatibilityError} from '../dist/engine.js';
import {scoreBreakdown} from '../dist/scores.js';

test('installed pack registers edition, descriptions, AI and versioned save references',()=>{
  assert.deepEqual(extensionLoadErrors,[]);
  assert.deepEqual(extensions.editions().map(e=>e.id),['classic','wishes']);
  const s=newGame(42,'solo','wishes');
  assert.deepEqual(s.extensions,[{id:'dog-wishes',version:'1.0.0'}]);
  assert.deepEqual(newGame(42).extensions,[]);
  assert.match(extensions.preview('wishes'),/大馋丫头/);
  assert.equal(extensions.preview('classic'),'');
  assert.equal(extensions.rulePages().length,1);
  assert.equal(extensions.render('card',newGame(42).players[0]),'');
});

test('missing, changed or conflicting pack references block saves and actions without mutation',()=>{
  const original=newGame(12,'solo','wishes');
  for(const value of [[],null,[{id:'missing',version:'1.0.0'}],[{id:'dog-wishes',version:'2.0.0'}],[{id:'dog-wishes'}]]) {
    const s={...original,extensions:value},before=structuredClone(s);
    assert.equal(validateSave(s),false);
    assert(saveCompatibilityError(s));
    assert.throws(()=>act(s,aiAction(original)));
    assert.deepEqual(s,before);
  }
  const host=createExtensionHost();
  assert.match(host.compatibilityError(original),/安装对应扩展/);
  const legacy=structuredClone(original);delete legacy.extensions;
  assert.match(host.compatibilityError(legacy),/安装对应扩展/);
  assert.equal(host.compatibilityError(newGame(42)),null);
  assert.throws(()=>createExtensionHost([wishes,wishes]),/重复/);
  assert.throws(()=>createExtensionHost([{...wishes,manifest:{...wishes.manifest,coreApi:99}}]),/接口版本/);
});

test('classic rejects leaked wish state; malformed extension saves return false instead of throwing',()=>{
  const s=newGame(12);s.players[0].wish={};assert.equal(validateSave(s),false);
  for(const wish of [null,{}, {scenery:null}, {points:6,sceneryTarget:'full',sceneryIncludesGifts:true,claimed:false,meals:[],scenery:[null],springs:[],farms:[]}]) {
    const s=newGame(12,'solo','wishes');s.players[1].wish=wish;assert.equal(validateSave(s),false);
  }
});

test('AI can explicitly ignore extension incentives without changing the active rules or save',()=>{
  let s=newGame(42,'table','wishes');while(s.phase==='draft')s=act(s,aiAction(s));
  s.current=0;s.players[0].cash=4;s.phase='choice';s.pending={type:'temple'};s.queue=[];
  const before=structuredClone(s);
  assert.deepEqual(aiAction(s),{type:'donate',amount:1});
  assert.deepEqual(aiAction(s,{useExtensions:false}),{type:'donate',amount:2});
  assert.deepEqual(s,before);assert(validateSave(s));
});

test('old saves without extension metadata restore in every phase and keep their pinned wish rules',()=>{
  for(const edition of ['classic','wishes']) {
    let s=newGame(19,'solo',edition);const phases=new Set();
    while(!s.ended) {
      phases.add(s.phase);
      const legacy=JSON.parse(JSON.stringify(s));delete legacy.extensions;
      assert(validateSave(legacy));
      const action=aiAction(s),next=act(s,action),old=act(legacy,action);
      const {extensions:metadata,...withoutMetadata}=next;
      assert.deepEqual(old,withoutMetadata);
      s=next;
    }
    assert.deepEqual([...phases].sort(),['choice','draft','move','notice']);
    const legacy=structuredClone(s);delete legacy.extensions;assert(validateSave(legacy));
    for(const p of s.players)assert.equal(scoreBreakdown(p,s.players).total,p.score);
  }
});

// Install a tiny test-only pack into a fresh copy: no core-file modifications allowed.
const fixturePack=`export default {
 manifest:{id:'farm-test',name:'Farm fixture',version:'1.0.0',coreApi:1,
 edition:{id:'farm-test',name:'Farm fixture',description:'Test'},playerKeys:['farmTest'],scoreCategories:['farmTest']},
 initializePlayer(p){p.farmTest={visits:0,paid:0};},
 onEvent(s,e){if(e.type==='farmHelped')s.players[e.playerId].farmTest.visits++;},
 afterAction(s){return s.players.filter(p=>p.farmTest.visits>p.farmTest.paid).map(p=>{p.farmTest.paid++;return {type:'score',playerId:p.id,category:'farmTest',points:1};});},
 validate(s){return s.players.every(p=>p.farmTest.paid===p.farmTest.visits);},
 ai:{moveValue(s,p,type){return type==='farm'?1:0;}},
 scoreLabels:{farmTest:'Farm bonus'},
 scoreRows(p){return p.farmTest?[{key:'farmTest',label:'Farm bonus',value:p.ledger.farmTest||0,explanation:'One point per farm.'}]:[];},
 ui:{preview(){return 'Farm fixture';},rulePages:[{name:'Farm fixture'}]}
};`;

async function isolatedRuntime(catalog,fixture=false) {
  const dir=await mkdtemp(path.join(tmpdir(),'pawkaido-pack-test-'));
  await mkdir(path.join(dir,'extensions/farm-test'),{recursive:true});
  await writeFile(path.join(dir,'package.json'),' {"type":"module"}');
  for(const name of ['engine.js','data.js','extensions.js','extension-host.js','scores.js'])await copyFile(new URL(`../dist/${name}`,import.meta.url),path.join(dir,name));
  await writeFile(path.join(dir,'extensions/catalog.js'),`export default ${JSON.stringify(catalog)};`);
  if(fixture)await writeFile(path.join(dir,'extensions/farm-test/index.js'),fixturePack);
  return {dir,engine:await import(pathToFileURL(path.join(dir,'engine.js'))),registry:await import(pathToFileURL(path.join(dir,'extensions.js'))),scores:await import(pathToFileURL(path.join(dir,'scores.js')))};
}

test('classic game runs to completion with the wish package physically absent',async()=>{
  const runtime=await isolatedRuntime([]);
  try {
    const {engine:e,registry:r,scores}=runtime;
    assert.deepEqual(r.extensions.editions().map(e=>e.id),['classic']);
    assert.deepEqual(r.extensionLoadErrors,[]);
    let s=e.newGame(41);for(let step=0;!s.ended&&step<700;step++)s=e.act(s,e.aiAction(s));
    assert(s.ended);assert(e.validateSave(s));
    for(const p of s.players)assert.equal(scores.scoreBreakdown(p,s.players).total,p.score);
    assert.throws(()=>e.newGame(1,'solo','wishes'),/安装对应扩展/);
  } finally {await rm(runtime.dir,{recursive:true,force:true});}
});

test('missing listed module reports a load error while keeping classic playable',async()=>{
  const runtime=await isolatedRuntime([{id:'dog-wishes',entry:'./dog-wishes/index.js'}]);
  try {
    assert.equal(runtime.registry.extensionLoadErrors.length,1);
    assert(runtime.engine.validateSave(runtime.engine.newGame(7)));
    assert.match(runtime.engine.saveCompatibilityError(newGame(7,'solo','wishes')),/安装对应扩展/);
  } finally {await rm(runtime.dir,{recursive:true,force:true});}
});

test('a separately installed pack adds rules, scoring, AI and UI without changing core code',async()=>{
  const runtime=await isolatedRuntime([{id:'farm-test',entry:'./farm-test/index.js'}],true);
  try {
    const {engine:e,registry:r,scores}=runtime;
    let s=e.newGame(42,'table','farm-test');while(s.phase==='draft')s=e.act(s,e.aiAction(s));
    s.current=0;s=e.act(s,{type:'move',id:7});
    assert.equal(s.players[0].ledger.farmTest,1);assert.equal(s.players[0].score,1);
    assert(e.validateSave(s));assert.equal(scores.scoreBreakdown(s.players[0],s.players).total,1);
    assert.equal(r.extensions.preview('farm-test'),'Farm fixture');
    assert.equal(r.extensions.moveValue(s,s.players[0],'farm'),1);
    assert.equal(r.extensions.rulePages()[0].name,'Farm fixture');
  } finally {await rm(runtime.dir,{recursive:true,force:true});}
});
