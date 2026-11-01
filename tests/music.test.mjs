import test from 'node:test';
import assert from 'node:assert/strict';
import {initMusic} from '../dist/music.js';
const east={src:'map-packs/east-coast/assets/music/moomoo-east-coast-holiday-v1.mp4',title:'东岸试听',description:'轻爵士',durationSeconds:120};
const flush=()=>new Promise(resolve=>setImmediate(resolve));
function fixture(saved=new Map()){
 const prior={document:globalThis.document,localStorage:globalThis.localStorage};
 const make=()=>({listeners:{},textContent:'',value:'20',classList:{toggle(){}},setAttribute(k,v){this[k]=v;},addEventListener(k,fn){(this.listeners[k]??=[]).push(fn);},emit(k,event={}){for(const fn of this.listeners[k]||[])fn(event);}});
 const selectors=['#background-music','#music-toggle','#music-volume','#music-volume-value','#music-status','.music-player','.music-copy strong'];
 const nodes=Object.fromEntries(selectors.map(s=>[s,make()]));const a=nodes['#background-music'];
 Object.assign(a,{paused:true,ended:false,currentTime:0,duration:60,volume:.2,src:'assets/sakura-pawprints.wav',calls:[],blocked:false,
  play(){this.calls.push(this.src);if(this.blocked)return Promise.reject(Object.assign(new Error('blocked'),{name:'NotAllowedError'}));this.paused=false;this.emit('play');return Promise.resolve();},pause(){this.paused=true;this.emit('pause');},load(){this.currentTime=0;this.duration=NaN;}});
 const doc=make();doc.querySelector=s=>nodes[s];globalThis.document=doc;globalThis.localStorage={getItem:k=>saved.get(k)??null,setItem:(k,v)=>saved.set(k,v)};
 return {a,doc,nodes,saved,close(){globalThis.document=prior.document;globalThis.localStorage=prior.localStorage;}};
}
test('default plays the selected map; manual off survives interactions, map changes and reload',async()=>{
 const f=fixture();try{
  const music=initMusic();music.setTrack(east);await flush();assert.deepEqual(f.a.calls,[east.src]);assert.equal(f.a.paused,false);
  f.nodes['#music-toggle'].emit('click');assert.equal(f.a.paused,true);assert.equal(f.saved.get('pawkaido-music-enabled'),'false');
  music.setTrack();f.doc.emit('click',{isTrusted:true,target:{closest:()=>null}});await flush();assert.equal(f.a.calls.length,1);
 }finally{f.close();}
 const reopened=fixture(f.saved);try{initMusic().setTrack(east);await flush();assert.equal(reopened.a.calls.length,0);assert.equal(reopened.nodes['#music-toggle']['aria-pressed'],'false');}finally{reopened.close();}
});
test('blocked autoplay waits for trusted game input and does not unlock when clicking off',async()=>{
 const f=fixture();try{
  f.a.blocked=true;initMusic();await flush();assert.match(f.nodes['#music-status'].textContent,/点击游戏/);
  f.doc.emit('click',{isTrusted:false,target:{closest:()=>null}});assert.equal(f.a.calls.length,1);
  f.a.blocked=false;f.doc.emit('keydown',{isTrusted:true,key:'Enter',target:{closest:()=>null}});await flush();assert.equal(f.a.paused,false);assert.equal(f.a.calls.length,2);
 }finally{f.close();}
 const off=fixture();try{
  off.a.blocked=true;initMusic();await flush();off.doc.emit('click',{isTrusted:true,target:{closest:()=>off.nodes['#music-toggle']}});off.nodes['#music-toggle'].emit('click');await flush();assert.equal(off.a.calls.length,1);assert.equal(off.a.paused,true);assert.equal(off.nodes['#music-toggle']['aria-pressed'],'false');
 }finally{off.close();}
});
test('closing music during a pending autoplay prevents a late rejection from rearming playback',async()=>{
 const f=fixture();try{
  let reject;f.a.play=function(){this.calls.push(this.src);return new Promise((_,r)=>{reject=r;});};initMusic();await flush();
  assert.equal(f.nodes['#music-toggle'].disabled,false);f.nodes['#music-toggle'].emit('click');
  reject(Object.assign(new Error('late'),{name:'NotAllowedError'}));await flush();f.doc.emit('click',{isTrusted:true,target:{closest:()=>null}});await flush();
  assert.equal(f.a.calls.length,1);assert.equal(f.nodes['#music-toggle']['aria-pressed'],'false');assert.match(f.nodes['#music-status'].textContent,/已关闭/);
 }finally{f.close();}
});
