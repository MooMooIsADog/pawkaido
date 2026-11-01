import {extensions} from './extensions.js';
import {DOGS,BOARD,INNS,LIMITS,ROLES,ROLE,GIFTS,FOODS,ENCOUNTERS,TYPES} from './data.js';
export const VERSION=1;
export function random(s){s.rng=(Math.imul(s.rng,1664525)+1013904223)>>>0;return s.rng/4294967296;}
function shuffle(s,a){a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(random(s)*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
export function giftScore(cards){const counts=[0,0,0,0];for(const c of cards)counts[c.family]++;let score=0;for(let i=1;i<=Math.max(...counts);i++)score+=counts.filter(n=>n>=i).length**2;return score;}
export function newGame(seed=Date.now(),mode='solo',edition='classic'){
 extensions.references(edition);
 const s={edition,version:VERSION,rng:seed>>>0,mode,phase:'draft',current:0,leg:0,queue:[],pending:null,notes:[],log:[],turn:0,menu:null,panoramaAwards:{},ended:false};
 const roles=shuffle(s,ROLES.map(r=>r.id)),order=shuffle(s,[0,1,2,3]);
 s.players=DOGS.map((d,id)=>({id,human:mode==='table'||id===0,role:null,draft:roles.slice(id*2,id*2+2),cash:0,score:0,pos:0,lane:order.indexOf(id),gifts:[],meals:[],springs:[],encounters:[],pano:{paddy:0,mountain:0,sea:0},donations:0,awards:[],ledger:{}}));
 extensions.initialize(s);
 s.decks={gifts:shuffle(s,GIFTS),meals:shuffle(s,FOODS.flatMap(f=>Array.from({length:f.price===1?3:f.price===2?2:1},(_,i)=>({...f,uid:`${f.id}-${i}`})))),springs:shuffle(s,Array.from({length:12},(_,i)=>({id:`s${i}`,points:i<6?2:3}))),encounters:shuffle(s,Object.keys(ENCOUNTERS).flatMap(type=>[0,1].map(i=>({id:`e-${type}-${i}`,type}))))};
 return s;
}
export const current=s=>s.players[s.current];
function add(s,n,category){const p=current(s);p.score+=n;p.ledger[category]=(p.ledger[category]||0)+n;}
function note(s,text){s.notes.push(text);}
function award(s,p,id){if(p.awards.includes(id))return; p.awards.push(id);const n=3+(p.role==='elder'?1:0);p.score+=n;p.ledger.awards=(p.ledger.awards||0)+n;}
function pano(s,type){const p=current(s);if(p.pano[type]>=LIMITS[type])return;const n=++p.pano[type];extensions.emit(s,{type:'panoramaGained',playerId:p.id,panorama:type});add(s,n,'pano');note(s,`我收集了「${TYPES[type].name}」第 ${n} 片，获得 ${n} 分。`);if(n===LIMITS[type]&&s.panoramaAwards[type]===undefined){s.panoramaAwards[type]=p.id;award(s,p,type);note(s,`我第一个拼好这幅画卷！获得风景成就 +${p.role==='elder'?4:3} 分。`);}}
function receiveGift(s,c){if(!c){note(s,'小铺的伴手礼已经送完啦。');return;}const p=current(s),before=giftScore(p.gifts);p.gifts.push(c);const n=giftScore(p.gifts)-before;add(s,n,'gifts');note(s,`我把「${c.name}」装进背包，收藏 +${n} 分。`);}
export function legalReason(s,id){const p=current(s),b=BOARD[id];if(s.phase!=='move')return '先完成眼前的事情哦';if(!b)return '没有这个地点';if(id<=p.pos)return '只能向前散步，不能回头哦';if(id>INNS[s.leg+1])return '先在下一座驿站和伙伴集合';if(b.type!=='inn'&&s.players.filter(q=>q.pos===id).length>=b.capacity)return '停靠位已经坐满啦';if((b.type==='village'||b.type==='temple')&&p.cash<1)return '至少需要 1 枚爪爪币';if(LIMITS[b.type]&&p.pano[b.type]>=LIMITS[b.type])return '这幅风景已经收齐啦';return '';}
export function legalMoves(s){return BOARD.filter(b=>!legalReason(s,b.id)).map(b=>b.id);}
function prompt(s,type,extra={}){s.phase='choice';s.pending={type,...extra};}
function pushFront(s,...tasks){s.queue.unshift(...tasks);}
function encounter(s,card){if(!card){note(s,'朋友们已经结束今天的旅程啦。');return;}const p=current(s);p.encounters.push(card);note(s,ENCOUNTERS[card.type].text);switch(card.type){case'merchant':receiveGift(s,s.decks.gifts.shift());break;case'samurai':add(s,3,'encounters');break;case'noble':p.cash+=3;break;case'priest':p.donations++;add(s,1,'donations');break;default:pushFront(s,{kind:'panorama',preferred:card.type});}}
function run(s){while(s.queue.length){const task=s.queue.shift(),p=current(s);switch(task.kind){
 case'finish':s.phase='notice';s.pending=null;return;
 case'farm':extensions.emit(s,{type:'farmHelped',playerId:p.id,space:p.pos});p.cash+=3;note(s,'我帮农庄照顾了小菜苗，赚到 3 枚爪爪币。');break;
 case'panorama':{const choices=Object.keys(LIMITS).filter(t=>p.pano[t]<LIMITS[t]);if(!choices.length){note(s,'我的三幅画卷都已经收齐，真是满满的回忆呀。');break;}if(task.preferred&&choices.includes(task.preferred)){pano(s,task.preferred);break;}prompt(s,'panorama',{choices});return;}
 case'paddy':case'mountain':case'sea':pano(s,task.kind);if(task.space)extensions.emit(s,{type:'panoramaVisited',playerId:p.id,panorama:task.kind});break;
 case'spring':{const c=s.decks.springs.shift();if(c){extensions.emit(s,{type:'springEnjoyed',playerId:p.id,space:p.pos});p.springs.push(c);const n=c.points+(p.role==='elder'?1:0);add(s,n,'springs');note(s,`我把小肉垫泡得暖暖的，获得 ${n} 分${p.role==='elder'?'（含行家奖励）':''}。`);}else note(s,'今天的汤屋体验卡已经发完啦。');break;}
 case'village':prompt(s,'gifts',{cards:s.decks.gifts.splice(0,3)});return;
 case'temple':prompt(s,'temple');return;
 case'encounter':{
  if(task.space&&p.role==='entertainer'){p.cash++;add(s,1,'talent');note(s,'我摇着尾巴表演了一小段，先获得 1 币和 1 分。');}
  const cards=s.decks.encounters.splice(0,task.space&&p.role==='official'?2:1);
  if(cards.length>1){prompt(s,'encounter',{cards});return;}encounter(s,cards[0]);break;}
 case'inn':{
  if(!s.menu)s.menu=s.decks.meals.splice(0,5);
  const before=[];
  if(p.pos!==54&&p.role==='artist')before.push({kind:'panorama'});
  if(p.pos!==54&&p.role==='courier')before.push({kind:'encounter',space:false});
  pushFront(s,...before,{kind:'meal'});break;}
 case'meal':prompt(s,'meal',{free:p.role==='orphan'&&s.menu.length?s.menu[Math.floor(random(s)*s.menu.length)].uid:null});return;
 default:throw Error(`Unknown task ${task.kind}`);
 }}}
export function giftPurchase(p,cards){const gross=cards.reduce((a,c)=>a+c.price,0);let cost=gross;if(cards.length){if(p.role==='merchant')cost-=Math.max(...cards.map(c=>c.price))-1;if(p.role==='geisha'&&cards.length>=2)cost-=Math.min(...cards.map(c=>c.price));}return {cost,required:p.role==='geisha'?gross:cost};}
export function mealCost(s,card){return s.pending?.free===card.uid?0:Math.max(0,card.price-(current(s).role==='ronin'?1:0));}
export function mealReason(s,card){const p=current(s);if(p.meals.some(m=>m.id===card.id))return '我已经吃过这份啦';if(p.cash<mealCost(s,card))return '我的爪爪币不够啦';return '';}
function nextTurn(s){s.log.unshift({turn:s.turn,dog:s.current,title:s.lastTitle,text:s.notes.join(' ')});s.log=s.log.slice(0,180);s.notes=[];
 if(s.players.every(p=>p.pos===INNS[s.leg+1])){
  s.decks.meals.push(...(s.menu||[]));s.menu=null;
  if(s.leg===3){finish(s);return;}s.leg++;s.log.unshift({turn:s.turn,dog:-1,title:'伙伴到齐，继续慢旅行',text:`大家从第 ${s.leg} 座驿站出发。最后抵达的小狗先走！`});
 }
 const end=INNS[s.leg+1];s.current=[...s.players].filter(p=>p.pos<end).sort((a,b)=>a.pos-b.pos||b.lane-a.lane)[0].id;s.phase='move';s.pending=null;s.turn++;
}
function finish(s){s.ended=true;s.phase='end';s.pending=null;
 const categories=[['gourmet',p=>p.meals.reduce((n,c)=>n+c.price,0)],['collector',p=>p.gifts.length],['bather',p=>p.springs.length],['chatter',p=>p.encounters.length]];
 for(const [id,metric]of categories){const max=Math.max(...s.players.map(metric));for(const p of s.players)if(metric(p)===max)award(s,p,id);}
 for(const p of s.players){const rank=s.players.filter(q=>q.donations>p.donations).length;const n=p.donations?([10,7,4][rank]??2):0;p.templeBonus=n;p.score+=n;p.ledger.templeFinal=n;}
 s.ranking=[...s.players].sort((a,b)=>b.score-a.score||b.awards.length-a.awards.length).map(p=>p.id);
 const best=s.players[s.ranking[0]];s.winners=s.players.filter(p=>p.score===best.score&&p.awards.length===best.awards.length).map(p=>p.id);
}
function requireRule(ok,msg){if(!ok)throw Error(msg);}
// Transactional: rejected actions never change the caller's state or random stream.
function applyAction(state,action){const s=structuredClone(state),p=current(s);
 if(s.phase==='draft'){
  requireRule(action.type==='role'&&p.draft.includes(action.id),'请选择发给我的一种旅行能力');p.role=action.id;p.cash=ROLE[action.id].cash;
  if(s.current<3)s.current++;else{s.current=[...s.players].sort((a,b)=>b.lane-a.lane)[0].id;s.phase='move';s.turn=1;}return s;
 }
 if(action.type==='ack'){requireRule(s.phase==='notice','还没有完成这次停靠');nextTurn(s);return s;}
 if(action.type==='move'){
  requireRule(!legalReason(s,action.id),legalReason(s,action.id));const b=BOARD[action.id];const others=s.players.filter(q=>q.id!==p.id&&q.pos===b.id);p.pos=b.id;p.lane=b.type==='inn'?others.length:([0,1].find(n=>!others.some(q=>q.lane===n))??0);
  s.notes=[];s.lastTitle=b.name;note(s,`我来到${b.name}啦。`);s.queue=[{kind:b.type,space:true},{kind:'finish'}];run(s);return s;
 }
 requireRule(s.phase==='choice','现在还不能这样做哦');const q=s.pending;
 if(q.type==='gifts'){
  requireRule(action.type==='buy'&&Array.isArray(action.ids),'选好想带走的伴手礼');requireRule(new Set(action.ids).size===action.ids.length,'同一件只能买一次');const picked=q.cards.filter(c=>action.ids.includes(c.id));requireRule(picked.length===action.ids.length,'小铺里没有这件东西');const price=giftPurchase(p,picked);requireRule(p.cash>=price.required,'我的爪爪币还不够');p.cash-=price.cost;for(const c of picked)receiveGift(s,c);s.decks.gifts.push(...q.cards.filter(c=>!action.ids.includes(c.id)));note(s,picked.length?`这次购物花了 ${price.cost} 币。`:'我只是闻闻香气，把金币留给下一站。');
 }else if(q.type==='temple'){
  requireRule(action.type==='donate'&&Number.isInteger(action.amount)&&action.amount>=1&&action.amount<=Math.min(3,p.cash),'需要捐出 1–3 枚自己拥有的金币');const extra=p.role==='priest'?1:0;p.cash-=action.amount;p.donations+=action.amount+extra;add(s,action.amount+extra,'donations');note(s,`我捐出 ${action.amount} 币${extra?'，钱庄再替我添 1 币':''}，获得 ${action.amount+extra} 分。`);
 }else if(q.type==='meal'){
  requireRule(action.type==='meal','请先选鲜食，或暂时不吃');if(action.id!==null){const c=s.menu.find(c=>c.uid===action.id);requireRule(c,'菜单里没有这份鲜食');requireRule(!mealReason(s,c),mealReason(s,c));const cost=mealCost(s,c);p.cash-=cost;p.meals.push(c);extensions.emit(s,{type:'mealEaten',playerId:p.id,space:p.pos});s.menu=s.menu.filter(m=>m.uid!==c.uid);add(s,6,'meals');note(s,`我花 ${cost} 币吃了「${c.name}」，肚皮暖暖，获得 6 分！`);}else note(s,'我这次不吃饭，先在驿站歇歇小爪子。');
 }else if(q.type==='panorama'){
  requireRule(action.type==='panorama'&&q.choices.includes(action.id),'选一幅还没收齐的风景');pano(s,action.id);
 }else if(q.type==='encounter'){
  requireRule(action.type==='encounter'&&q.cards.some(c=>c.id===action.id),'选择一位朋友');const chosen=q.cards.find(c=>c.id===action.id);s.decks.encounters.push(...q.cards.filter(c=>c.id!==action.id));encounter(s,chosen);
 }else throw Error('无法识别这件事');
 s.pending=null;run(s);return s;
}
// Award once after a successful action, before presenting/saving its result.
export function act(state,action){const error=extensions.compatibilityError(state);if(error)throw Error(error);const s=applyAction(state,action);extensions.settle(s);return s;}
function panoValue(s,p,t){const n=p.pano[t];return n>=LIMITS[t]?0:n+1+(n+1===LIMITS[t]&&s.panoramaAwards[t]===undefined?3:0);}
function encounterValue(s,p,c){return ({merchant:3,samurai:3,noble:p.cash<3?6:3,priest:2})[c.type]??panoValue(s,p,c.type);}
// A local heuristic opponent: sees public collections and its own revealed choices, never the decks.
export function aiAction(s,{useExtensions=true}={}){const p=current(s);
 if(s.phase==='draft'){const priorities={artist:8,courier:7,ronin:7,official:6,orphan:7,elder:8,geisha:6,priest:7,entertainer:8,merchant:7};return {type:'role',id:[...p.draft].sort((a,b)=>priorities[b]-priorities[a])[0]};}
 if(s.phase==='notice')return {type:'ack'};
 if(s.phase==='move'){
  const values=legalMoves(s).map(id=>{const b=BOARD[id],distance=id-p.pos;let v=0;
   if(LIMITS[b.type])v=panoValue(s,p,b.type)+1.2;
   else if(b.type==='farm')v=p.cash<2?8:p.cash<5?5:1.2;
   else if(b.type==='village')v=p.cash>=4?4.8:p.cash>=2?2.3:.3;
   else if(b.type==='spring')v=p.role==='elder'?4.4:3.2;
   else if(b.type==='temple')v=p.cash>4?4.3:p.cash>2?2:.1;
   else if(b.type==='encounter')v=3.5+(['official','entertainer'].includes(p.role)?1.3:0);
   else if(b.type==='inn')v=p.cash>=1?3.4:1;
   // Distinct personalities break close ties without looking at unrevealed cards.
   const preference=[{paddy:.3},{sea:.5,spring:.3},{village:.6,inn:.3},{temple:.5,mountain:.4}][p.id];
   return{id,value:(v+(useExtensions?extensions.moveValue(s,p,b.type):0)+(preference[b.type]||0))/(1+distance*.25)};
  }).sort((a,b)=>b.value-a.value||a.id-b.id);return {type:'move',id:values[0].id};
 }
 const q=s.pending;
 const reserve=useExtensions?extensions.reserve(s,p,2):2;
 if(q.type==='temple')return {type:'donate',amount:Math.max(1,Math.min(3,p.cash-reserve))};
 if(q.type==='meal'){const c=s.menu.filter(c=>!mealReason(s,c)).sort((a,b)=>mealCost(s,a)-mealCost(s,b)||b.price-a.price)[0];return {type:'meal',id:c?.uid??null};}
 if(q.type==='panorama')return {type:'panorama',id:[...q.choices].sort((a,b)=>panoValue(s,p,b)-panoValue(s,p,a))[0]};
 if(q.type==='encounter')return {type:'encounter',id:[...q.cards].sort((a,b)=>encounterValue(s,p,b)-encounterValue(s,p,a))[0].id};
 if(q.type==='gifts'){
  let best=[],value=0;
  for(let mask=1;mask<2**q.cards.length;mask++){const cards=q.cards.filter((c,i)=>mask&(1<<i)),price=giftPurchase(p,cards);if(price.required>p.cash)continue;const v=giftScore([...p.gifts,...cards])-giftScore(p.gifts)-price.cost*(p.cash-price.cost<reserve?2.3:.85);if(v>value){value=v;best=cards;}}
  return {type:'buy',ids:best.map(c=>c.id)};
 }
 throw Error('No AI action');
}
export const saveCompatibilityError=s=>extensions.compatibilityError(s);
export function validateSave(s){
 try{return validateSaveData(s);}catch{return false;}
}
function validateSaveData(s){
 if(!s||s.version!==VERSION||!['draft','move','choice','notice','end'].includes(s.phase)||!Number.isInteger(s.rng)||!Number.isInteger(s.leg)||s.leg<0||s.leg>3||!Array.isArray(s.players)||s.players.length!==4||!Number.isInteger(s.current)||s.current<0||s.current>3||!Array.isArray(s.queue)||!Array.isArray(s.log)||!Array.isArray(s.notes)||!s.panoramaAwards)return false;
 if(!extensions.validate(s))return false;
 if(!s.decks||!['gifts','meals','springs','encounters'].every(k=>Array.isArray(s.decks[k])))return false;
 if(s.phase==='choice'&&(!s.pending||!['gifts','temple','meal','panorama','encounter'].includes(s.pending.type)))return false;
 return s.players.every((p,i)=>p.id===i&&Number.isInteger(p.cash)&&p.cash>=0&&Number.isInteger(p.score)&&p.score>=0&&Number.isInteger(p.pos)&&p.pos>=0&&p.pos<=54&&Number.isInteger(p.lane)&&p.lane>=0&&p.lane<4&&['gifts','meals','springs','encounters','awards','draft'].every(k=>Array.isArray(p[k]))&&p.pano&&Object.keys(LIMITS).every(t=>Number.isInteger(p.pano[t])&&p.pano[t]>=0&&p.pano[t]<=LIMITS[t])&&(p.role===null||ROLE[p.role]));
}
