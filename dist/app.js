import{extensions,extensionLoadErrors}from'./extensions.js';
import{DOGS,BOARD,INNS,LIMITS,TYPES,ROLE,FAMILIES,ENCOUNTERS}from'./data.js';
import{newGame,current,act,legalReason,legalMoves,giftPurchase,giftScore,mealCost,mealReason,aiAction,validateSave,saveCompatibilityError}from'./engine.js';
import{initMusic}from'./music.js';
import{mapStoryHTML,mapPoints,mapMarkup,mapAtlasHTML,initMapControls}from'./map.js';
import{getMapPack,setMapPack,mapPacks,mapIdForSave,hasMapPack,mapLoadErrors,themeText,themeDOM}from'./map-content.js';
import{walkOnMap}from'./walk.js';
import{scoreBreakdown,SCORE_LABELS,AWARD_NAMES}from'./scores.js';
history.scrollRestoration='manual';
window.scrollTo(0,0);
const $=s=>document.querySelector(s),KEY='pawkaido-save-v1';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sprite=(id,row=0,cls='')=>`<div class="sprite ${cls}" data-dog="${id}" data-row="${row}" style="background-image:url(assets/${DOGS[id].file}.png)" role="img" aria-label="${DOGS[id].name}"></div>`;
const awardNames=AWARD_NAMES;
const ledgerNames=SCORE_LABELS;
let s=null,aux=null,selected=[],aiTimer=null,fast=false,toastTimer=null,dialogKey='',saveOK=true,lastFocus=null,moving=false;
try{const raw=localStorage.getItem(KEY);if(raw){const parsed=JSON.parse(raw);if(validateSave(parsed))s=parsed;else toast(saveCompatibilityError(parsed)||'旧旅行记录没能读懂，可以重新出发哦。');}}catch{toast('暂时无法读取存档，本次仍然可以旅行。');}
let INN_NAMES,LEG_NAMES;
function shownMapId(){for(let a=aux;a;a=a.back)if(['welcome','new'].includes(a.kind))return a.mapPack||mapIdForSave(s);return mapIdForSave(s);}
function syncMap(){const pack=setMapPack(shownMapId());INN_NAMES=pack.innNames;LEG_NAMES=pack.legNames;return pack;}
function mapPicker(){return `<fieldset class="map-pack-picker" data-map-literal><legend>这次去哪里散步？</legend><div class="map-pack-options">${mapPacks().map(p=>`<label class="map-pack-option ${p.id===shownMapId()?'selected':''}"><input type="radio" name="map-pack" data-ui="map-pack" data-id="${p.id}" value="${p.id}" ${p.id===shownMapId()?'checked':''}><span class="map-pack-thumb" style="background-image:url('${p.regions[0].image}');background-size:${p.regions[0].imageSize};background-position:${p.regions[0].imagePosition}"></span><strong>${esc(p.name)}</strong><small>${esc(p.description)}</small></label>`).join('')}</div><p class="empty">地图与玩法分别选择，可搭配经典版或狗狗心愿。</p></fieldset>`;}
if(!s)aux={kind:'welcome'};
syncMap();
if(s?.presentation?.mapPack&&!hasMapPack(s.presentation.mapPack))toast('这局的地图包暂时不可用，先用日本地图显示；旅行进度仍然保留。');
if(mapLoadErrors.length)toast(mapLoadErrors.join('；'));
if(extensionLoadErrors.length)toast(extensionLoadErrors.join('；'));
const music=initMusic();initMapControls();
function save(){if(!s)return;try{localStorage.setItem(KEY,JSON.stringify(s));saveOK=true;}catch{saveOK=false;}$('#save-status').textContent=saveOK?'本地旅行 · 已自动保存':'本次可玩 · 浏览器未允许存档';}
function toast(text){const el=$('#toast');el.textContent=text;el.classList.add('toast-visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('toast-visible'),3000);}
async function dispatch(action){
 if(moving)return;clearTimeout(aiTimer);
 let next;try{next=act(s,action);}catch(e){toast(e.message);scheduleAI();return;}
 const before=s;
 // Commit once before presentation. Refreshing mid-walk resumes the same arrival event.
 s=next;selected=[];save();
 if(action.type==='move'){
  const dog=current(before),destination=BOARD[action.id];moving=true;
  $('#modal').close();dialogKey='';$('#route').dataset.walking='true';$('#route').setAttribute('aria-busy','true');
  const locked=[...document.querySelectorAll('.top-actions,.sidebar,.collection,.map-toolbar,.map-stops')];locked.forEach(el=>el.inert=true);
  $('#turn-strip').innerHTML='<span class="turn-dot"></span><strong>'+DOGS[dog.id].name+' 正在散步</strong><span class="turn-hint">沿着小路，去'+esc(themeText(destination.name))+'…</span>';
  try{await walkOnMap({dog:dog.id,from:dog.pos,to:action.id,leg:before.leg,fast,sprite,animateSprites});}
  catch(error){console.warn('Walking presentation ended early',error);}
  finally{moving=false;delete $('#route').dataset.walking;$('#route').removeAttribute('aria-busy');locked.forEach(el=>el.inert=false);}
 }
 render();
}
function previewState(){const st=newGame(42);st.phase='move';return st;}
function render(){const pack=syncMap();music.setTrack(pack.music);document.body.dataset.mapPack=pack.id;document.title=pack.heading+' · '+pack.tagline;$('.brand h1').innerHTML=esc(pack.heading)+'<span>'+esc(pack.tagline)+'</span>';$('#map-pack-label').textContent=pack.name;$('footer>span').innerHTML='PAWKAIDO <b>·</b> '+esc(pack.heading);const state=s||previewState(),p=current(state),leg=state.leg;
 $('#chapter-label').textContent=`CHAPTER ${String(leg+1).padStart(2,'0')} / 04 · ${extensions.editionName(state.edition)}`;
 $('#chapter-title').textContent=LEG_NAMES[leg];
 $('#chapters').innerHTML=LEG_NAMES.map((n,i)=>`<div class="chapter ${i===leg?'active':i<leg?'done':''}"><b>${i+1}</b><span>${n}</span></div>`).join('');
 const hint=!s?'和 MooMoo 一起，慢慢走到江户。':s.ended?'旅行结束，回忆都装进小背包啦。':s.phase==='draft'?'每只狗狗从两种能力中选择一种。':p.human?'点一个前方地点，看看我能做什么。':'小伙伴正在挑选下一段风景…';
 $('#turn-strip').innerHTML=`<span class="turn-dot"></span><strong>${!s?'准备出发':s.ended?'江户到了！':s.phase==='draft'?`${DOGS[p.id].name} 挑选旅行能力`:`轮到 ${DOGS[p.id].name} ${p.human?'· 你来决定':'· AI'}`}</strong><span class="turn-hint">${hint}</span>${s?.phase==='draft'?'<button class="text-button" data-ui="resume-draft">继续选择能力 →</button>':''}${s&&!s.ended?`<button class="text-button" data-ui="speed" aria-label="切换 AI 行动速度">${fast?'AI 快速':'AI 慢速'}</button>`:''}`;
 const start=INNS[leg],end=INNS[leg+1],points=mapPoints(leg,end-start+1);
 const buttons=BOARD.slice(start,end+1).map((b,i)=>{const occupants=state.players.filter(q=>q.pos===b.id).sort((a,b)=>a.lane-b.lane),reason=s?legalReason(s,b.id):'',available=s?.phase==='move'&&p.human&&!reason;const t=TYPES[b.type];const reward={farm:'+3 币',temple:'捐 1–3 币',village:'四类组套',spring:'+2 / 3 分',encounter:'遇见好朋友',inn:'必停 · 鲜食 +6 分',paddy:'3 片画卷',mountain:'4 片画卷',sea:'5 片画卷'}[b.type];
 return `<button class="stop ${available?'available':''} ${b.type==='inn'?'inn':''} ${s&&b.id<p.pos?'past':''} ${occupants.length?'occupied':''} ${s&&p.pos===b.id?'active-position':''}" data-ui="stop" data-id="${b.id}" style="--stop-color:${t.color};--map-left:${points[i][0]}%;--map-top:${points[i][1]}%" aria-label="${b.id} 号 ${b.name}${available?'，可前往':reason?'，'+reason:''}" title="${reason||t.hint}"><span class="number">${String(b.id).padStart(2,'0')}</span><span class="capacity">${b.capacity===4?'⌂':b.capacity===2?'●○':'●'}</span><span class="stop-icon">${pack.stopIcons?.[b.type] ? `<img class="travel-road-sign" alt="" src="${esc(pack.stopIcons[b.type])}">` : t.icon}</span><strong class="stop-name">${b.type==='inn'?themeText(b.name).split(' · ')[1]:b.name}</strong><span class="stop-reward">${b.id===0?'起点 · 整理背包':reward}</span><span class="tokens">${occupants.map(q=>`<span class="token" data-lane="${q.lane===0?'●':'○'}" title="${DOGS[q.id].name} · ${q.lane===0?'路边位':'外侧位'}">${sprite(q.id,s&&q.id===p.id?0:6)}</span>`).join('')}</span></button>`;
 }).join('');
 const scroll=$('#route').dataset.leg===String(leg)?($('#route .map-scroll')?.scrollLeft||0):0;
 $('#route').dataset.leg=leg;
 $('#route').innerHTML=mapMarkup(leg,points,buttons,Math.max(0,Math.min(end-start,Math.min(...state.players.map(q=>q.pos))-start)));
 $('#route .map-scroll').scrollLeft=scroll;
 $('#players').innerHTML=state.players.map(q=>`<div class="traveller ${s&&q.id===p.id&&!s.ended?'current':''}" data-ui="player" data-id="${q.id}" role="button" tabindex="0" aria-label="查看 ${DOGS[q.id].name} 的旅行手账">${sprite(q.id)}<div class="info"><strong>${DOGS[q.id].name}</strong><small>${q.id===0?'你':s?.mode==='table'?'同屏':'AI'}</small><div class="role">${q.role?ROLE[q.role].name:DOGS[q.id].breed}</div><div class="money">◉ ${q.cash} 爪爪币</div>${extensions.render('mini',q)}</div><div class="score"><b>${q.score}</b><small>旅途分</small></div></div>`).join('');
 $('#log').innerHTML=state.log.length?state.log.slice(0,3).map(l=>`<li><b>${l.dog<0?'🐾':DOGS[l.dog].name+' · '}${esc(l.title)}</b><p>${esc(l.text.length>66?l.text.slice(0,65)+'…':l.text)}</p></li>`).join(''):'<li><b>一张空白的旅行手账</b><p>风景、鲜食、新朋友……<br>每次停靠，都会留下小小回忆。</p></li>';
 $('#collection').innerHTML=collectionSummary(state.players[0]);
 renderModal();for(const id of ['#route','#turn-strip','#players','#log','#collection'])themeDOM($(id));scheduleAI();animateSprites();
}
function extensionCards(p,score=false){return extensions.render('card',p,{score,ended:!!s?.ended});}
function collectionSummary(p){return `${extensionCards(p)}<div class="collection-grid">${Object.entries(LIMITS).map(([type,n])=>`<div class="pano-card ${type}"><div class="pano-label"><span>${TYPES[type].icon} ${TYPES[type].name}</span><span>${p.pano[type]} / ${n}</span></div><div class="pano-pieces">${Array.from({length:n},(_,i)=>`<span class="pano-piece ${i<p.pano[type]?'filled':''}" title="第 ${i+1} 片 · ${i+1} 分"></span>`).join('')}</div></div>`).join('')}<div class="pano-counts"><span>🎐 伴手礼 <b>${p.gifts.length}</b>　♨ 泡汤 <b>${p.springs.length}</b></span><span>🍱 鲜食 <b>${p.meals.length}</b>　⛩ 捐赠 <b>${p.donations}</b></span></div></div>`;}
function shell(title,sub,body,actions='',options={}){const id=options.dog??(s?current(s).id:0);return `<div class="dialog-inner"><div class="dialog-top"><span class="eyebrow">${options.label||'PAWKAIDO · LITTLE MOMENTS'}</span><div>${s&&!s.ended?`<button class="text-button" data-ui="speed">AI ${fast?'快速':'慢速'}</button>`:''}${aux?.kind==='rules'?'':'<button class="text-button" data-ui="rules">MooMoo 讲规则</button>'}${options.close?'<button class="close-button" data-ui="close" aria-label="关闭弹窗">×</button>':''}</div></div><div class="dialog-hero">${sprite(id,options.row??0)}<div><h2 id="dialog-title">${title}</h2><p>${sub}</p></div></div>${body}${actions?`<div class="dialog-actions">${actions}</div>`:''}</div>`;}
function renderModal(){if(moving)return;const pack=syncMap();let html='',key='';const p=s?current(s):null;
 if(aux){key=`aux-${aux.kind}-${aux.page??''}-${aux.id??''}`;
  if(aux.kind==='welcome'||aux.kind==='new'){
   html=shell(aux.kind==='new'?'再出发一次？':'和我去散步吧！',pack.welcome,`<div class="note-box">不用掷骰子，也不用抢着到终点。<br><b>走在最后的狗狗先行动，收集旅途中最多的快乐。</b></div>${aux.kind==='new'?'<p class="dialog-copy">开始新的旅行会替换当前这局的本地存档。</p>':''}${mapPicker()}<fieldset class="edition-picker"><legend>这次怎么玩？</legend>${extensions.editions().map(e=>`<label><input type="radio" name="edition" data-ui="edition" data-id="${esc(e.id)}" value="${esc(e.id)}" ${(aux.edition||'classic')===e.id?'checked':''}>${esc(e.name)}<small>${esc(e.description)}</small></label>`).join('')}</fieldset>${extensions.preview(aux.edition||'classic')}<div class="mode-choices"><button data-ui="start" data-mode="solo" class="primary">我和三位 AI 伙伴<small style="color:#e1e9d8">我来控制 MooMoo · 推荐</small></button><button data-ui="start" data-mode="table">四位朋友轮流玩<small>共用这个屏幕 · 四只狗狗都由人操作</small></button></div><p class="empty" style="margin-top:15px">保留东海道标准版玩法 · 四段旅程 · 10 种旅行能力<br>自动存档，无需登录。音乐可随时开关。</p>`,aux.kind==='new'?'<button data-ui="close">继续原来的旅行</button>':'',{dog:0,row:3,close:aux.kind==='new',label:pack.eyebrow});
  }else if(aux.kind==='rules')html=rulesHTML(aux.page||0);
  else if(aux.kind==='scenery'){const leg=aux.id;html=shell(`我在${getMapPack().regions[leg].name}看风景`, '汪！我是 MooMoo。歇歇小爪子，我来讲讲这幅画里的小美好～',mapStoryHTML(leg),'<button class="primary" data-ui="close">听完啦，跟我回去吧 🐾</button>',{dog:0,row:3,close:true,label:`卷 ${leg+1} / 4 · ${LEG_NAMES[leg]}`});}
  else if(aux.kind==='collection')html=collectionHTML(aux.id??0);
  else if(aux.kind==='map')html=shell('把一路的风景摊开','四段旅程，每座驿站都要等齐小伙伴。数字就是棋盘上的地点编号。',`${mapAtlasHTML()}<div class="map-list">${LEG_NAMES.map((n,i)=>`<section><h3>${i+1} · ${n}</h3><p>${INN_NAMES[i]} → ${INN_NAMES[i+1]}</p><div>${BOARD.slice(INNS[i]+1,INNS[i+1]+1).map(b=>`<span style="border-color:${TYPES[b.type].color}55">${b.id} ${TYPES[b.type].icon} ${b.type==='inn'?'驿站':b.name}${b.capacity===2?' ②':''}</span>`).join('')}</div></section>`).join('')}</div><p class="empty">② 表示双人停靠位。到了下一座驿站之前，我不能越过它。</p>`,'',{dog:0,close:true});
  else if(aux.kind==='journal')html=shell('一路的小小回忆','每次停靠，我都认真记在手账里啦。',`<div class="log-full">${s?.log.length?s.log.map(l=>`<article><strong>${l.dog<0?'伙伴集合':DOGS[l.dog].name} · ${esc(l.title)}</strong><p>${esc(l.text)}</p></article>`).join(''):'<p class="empty">还没有足迹，先去第一站看看吧。</p>'}</div>`,'',{dog:0,close:true});
  else if(aux.kind==='stop'){
   const b=BOARD[aux.id],reason=s?legalReason(s,b.id):'先开始旅行吧',can=s&&p.human&&!reason;
   html=shell(b.name,`第 ${b.id} 站 · ${b.capacity===4?'所有伙伴在这里集合':b.capacity===2?'可以停靠两只狗狗':'只能停靠一只狗狗'}`,`<div class="note-box">${TYPES[b.type].hint}</div>${LIMITS[b.type]&&s?`<p class="dialog-copy">我现在已经收集 ${p.pano[b.type]} / ${LIMITS[b.type]} 片。第一只拼完这幅风景的狗狗，还能获得 3 分成就奖励。</p>`:''}<p class="dialog-copy">${can?`我可以走到这里${b.id-p.pos>1?'，跳过前面的地点':''}。走过的风景就不能回头啦。`:esc(reason||'现在轮到 AI 小伙伴了')}</p>`,`<button data-ui="close">再看看</button>${can?`<button class="primary" data-ui="go" data-id="${b.id}">带我去这里 →</button>`:''}`,{close:true});
  }
 }else if(s?.phase==='draft'){
  key=`draft-${p.id}`;
  if(p.human)html=shell('今天，我是什么小旅人？',`我是 ${DOGS[p.id].name}。挑一种旅行能力，会陪我走完整段旅程哦。`,`所选版本：<b>${extensions.editionName(s.edition)}</b>${extensionCards(p)}<div class="choice-grid">${p.draft.map(id=>{const r=ROLE[id];return`<button class="choice" data-ui="role" data-id="${id}"><span class="choice-icon">${r.icon}</span><strong>${r.name}</strong><p>${r.text}</p><small>出发盘缠 ◉ ${r.cash} 币</small></button>`;}).join('')}</div>`,'<button data-ui="peek-map">先看看地图</button>',{row:3});
  else html=shell('小伙伴在整理背包',`${DOGS[p.id].name} 正在选择自己的旅行能力。`,'<div class="ai-progress"></div>');
 }else if(s?.phase==='choice'){
  key=`choice-${s.turn}-${p.id}-${s.pending.type}`;
  if(p.human)html=choiceHTML();else html=shell(`${DOGS[p.id].name} 在${themeText(s.lastTitle).split(' · ').pop()}`,s.notes.at(-1)||'我想想，选哪个比较好呢？','<div class="ai-progress"></div>');
 }else if(s?.phase==='notice'){
  key=`notice-${s.turn}`;
  html=shell(s.lastTitle,`${DOGS[p.id].name} 的小小收获`,`<div class="dialog-copy">${s.notes.map(n=>`<p>${esc(n)}</p>`).join('')}</div><div class="stat-line"><span>我有 <b>◉ ${p.cash} 币</b></span><span>旅途分 <b>${p.score}</b></span>${BOARD[p.pos].type==='inn'?'<span>到齐后，最后抵达的狗狗先出发</span>':''}</div>${p.human?'':'<div class="ai-progress"></div>'}`,p.human?'<button class="primary" data-ui="ack">记进手账，继续旅行 →</button>':'',{row:BOARD[p.pos].type==='inn'?7:8});
 }else if(s?.phase==='end'){key='end';html=endHTML();}
 const dialog=$('#modal');
 if(html){const active=document.activeElement;const focusId=active?.dataset?.id,focusUi=active?.dataset?.ui;$('#modal-content').innerHTML=html;if(!dialog.open){lastFocus=document.activeElement;const savedScroll=window.scrollY;dialog.showModal();window.scrollTo(0,savedScroll);}if(key!==dialogKey){dialog.scrollTop=0;dialogKey=key;}else if(focusUi){[...dialog.querySelectorAll('[data-ui]')].find(el=>el.dataset.ui===focusUi&&el.dataset.id===focusId)?.focus({preventScroll:true});}
 }else{if(dialog.open)dialog.close();dialogKey='';}
 themeDOM($('#modal-content'));updatePurchase();positionDialog();animateSprites();
}
function positionDialog(){const d=$('#modal');if(!d.open)return;const b=$('.journey').getBoundingClientRect(),w=document.documentElement.clientWidth,h=window.innerHeight;d.style.margin='0';d.style.position='fixed';const r=d.getBoundingClientRect();d.style.left=`${Math.max(14,Math.min(w-r.width-14,b.left+b.width/2-r.width/2))}px`;d.style.top=`${Math.max(18,Math.min(h-r.height-18,(Math.max(0,b.top)+Math.min(h,b.bottom)-r.height)/2))}px`;}
window.addEventListener('resize',positionDialog);
$('#modal').addEventListener('toggle',e=>{if(e.target.matches('.end-score-card'))positionDialog();},true);
function cardIllustration(card, fallbackIcon) {
 const pack=getMapPack();
 if (!pack.cards?.[card.name] || !pack.cardArt) return '<span class="choice-icon">'+fallbackIcon+'</span>';
 return `<svg class="travel-card-art" viewBox="0 0 80 48" aria-hidden="true"><use href="${esc(pack.cardArt)}#${esc(card.id)}"/></svg>`;
}
function cardDetails(card) {
 const pack=getMapPack(), detail=pack.cards?.[card.name];
 if (!detail) return '';
 const edible=card.family===1 || card.uid!==undefined;
 const stamp=edible && pack.kitchenStamp ? `<span class="kitchen-stamp">${esc(pack.kitchenStamp)}</span>` : '';
 return `<span class="travel-card-detail" data-map-literal>${stamp}<span>${esc(detail.story)}</span></span>`;
}
function firstMealGreeting(player) {
 const message=getMapPack().firstMeal;
 if (!message || player.id!==0 || player.pos!==INNS[1]) return '';
 return `<div class="moomoo-tip" data-map-literal><span>🐾 MooMoo 开饭啦</span><p>${esc(message)}</p></div>`;
}
function choiceHTML(){const p=current(s),q=s.pending;const intro=s.notes.join(' ');let body='',actions='',title=s.lastTitle;
 if(q.type==='gifts'){
  title='带哪件小宝贝回家？';body=`<p class="dialog-copy">我有 <b>◉ ${p.cash} 币</b>。不同类别放在同一套里，依次获得 1、3、5、7 分。</p><div class="choice-grid" style="margin-top:14px">${q.cards.map(c=>`<label class="choice ${selected.includes(c.id)?'selected':''}"><input type="checkbox" data-ui="gift" data-id="${c.id}" ${selected.includes(c.id)?'checked':''}>${cardIllustration(c,FAMILIES[c.family].icon)}<strong>${esc(c.name)}</strong><p>${FAMILIES[c.family].name}</p>${cardDetails(c)}<small>◉ ${c.price} 币</small></label>`).join('')}</div><div id="purchase-summary" class="purchase-summary"></div>${['merchant','geisha'].includes(p.role)?`<div class="note-box">${ROLE[p.role].text}</div>`:''}`;actions='<button data-ui="skip-gifts">只看看，不买啦</button><button id="buy-button" data-ui="buy" class="primary">装进小背包</button>';
 }else if(q.type==='temple'){
  title='给旅途许个小愿望';body=`<p class="dialog-copy">我有 <b>◉ ${p.cash} 币</b>，这次要捐出 1–3 币。每枚都值 1 分，最后还会按捐赠总数排名加分。</p><div class="note-box">${p.role==='priest'?ROLE[p.role].text:'我已经捐过 '+p.donations+' 币啦。也要留点盘缠吃晚饭呀。'}</div>`;actions=Array.from({length:Math.min(3,p.cash)},(_,i)=>`<button data-ui="donate" data-id="${i+1}" class="primary">捐 ${i+1} 币 · +${i+1+(p.role==='priest'?1:0)} 分</button>`).join('');
 }else if(q.type==='meal'){
  title='小肚皮的驿站时间';body=`${firstMealGreeting(p)}${intro?`<div class="note-box">${esc(intro)}</div>`:''}<p class="dialog-copy">我有 <b>◉ ${p.cash} 币</b>。每份都值 <b>6 分</b>，一路上不能重复吃同一种哦。${q.free?'掌柜随机请我吃其中一份，标着「免费招待」的就是啦！':''}</p><div class="choice-grid" style="margin-top:14px">${s.menu.map(c=>{const reason=mealReason(s,c),cost=mealCost(s,c);return`<button class="choice" data-ui="meal" data-id="${c.uid}" ${reason?'disabled':''}>${cardIllustration(c,'🍱')}<strong>${esc(c.name)}</strong><p>吃饱得 6 分</p>${cardDetails(c)}<small class="${cost===0?'free':''}">${reason||`${q.free===c.uid?'免费招待':`◉ ${cost} 币`}${cost!==c.price?' · 标价 '+c.price+' 币':''}`}</small></button>`;}).join('')}</div>`;actions='<button data-ui="skip-meal">这次不吃，歇歇小爪子</button>';
 }else if(q.type==='panorama'){
  title='把哪片风景留在心里？';body=`<div class="note-box">${esc(intro)} 我可以免费收集一片还没完成的风景。</div><div class="choice-grid">${q.choices.map(t=>`<button class="choice" data-ui="panorama" data-id="${t}"><span class="choice-icon">${TYPES[t].icon}</span><strong>${TYPES[t].name}</strong><p>现在 ${p.pano[t]} / ${LIMITS[t]} 片</p><small>收下一片 +${p.pano[t]+1} 分</small></button>`).join('')}</div>`;
 }else if(q.type==='encounter'){
  title='和哪位汪友打招呼？';body=`<p class="dialog-copy">我的小队长能力让我遇见两位朋友，选其中一位就好。另一位会回到相遇牌堆底部。</p><div class="choice-grid" style="margin-top:14px">${q.cards.map(c=>{const e=ENCOUNTERS[c.type];return`<button class="choice" data-ui="encounter" data-id="${c.id}"><span class="choice-icon">${e.icon}</span><strong>${e.name}</strong><p>${e.text}</p></button>`;}).join('')}</div>`;
 }
 if ((q.type==='gifts' || q.type==='encounter') && getMapPack().replacements[s.notes[0]]) {
  body=`<p class="dialog-copy">${esc(s.notes[0])}</p>`+body;
 }
 return shell(title,`${DOGS[p.id].name} 说：这次我来选！`,body,actions,{row:q.type==='meal'?7:q.type==='gifts'?9:0});
}
function updatePurchase(){if(!s||s.phase!=='choice'||s.pending.type!=='gifts'||aux)return;const p=current(s),cards=s.pending.cards.filter(c=>selected.includes(c.id)),price=giftPurchase(p,cards),gain=giftScore([...p.gifts,...cards])-giftScore(p.gifts);const el=$('#purchase-summary');if(!el)return;el.textContent=`选了 ${cards.length} 件 · 支付 ${price.cost} 币 · 收藏 +${gain} 分${price.required>p.cash?' · 盘缠不够啦':''}${price.required!==price.cost?'（需先持有 '+price.required+' 币）':''}`;el.classList.toggle('error',price.required>p.cash);$('#buy-button').disabled=!cards.length||price.required>p.cash;}
const rulePages=[
 ...extensions.rulePages(),
 {name:'小爪子怎么走',title:'汪！跟我一起慢慢走',row:3,tip:'我的第一步：选好旅行能力，点一个前方地点，再点「带我去这里」。',body:'<p>你好呀，我是 <b>MooMoo</b>！我的小背包收拾好啦，要和 Yuki、Biscuit、Rex 从京都散步到江户。我要把风景、好吃的和新朋友，都变成闪闪的<b>旅途分</b>。</p><p><b>我走在最后面的时候，就轮到我啦。</b>我不用掷骰子，可以走到前方任何一个有空位的地点，也可以跳过几站。不过我不能回头，也不能越过下一座驿站哦。</p><p>如果我只往前挪了一小步，还是队伍的小尾巴，那我就能再走一次！双人地点有路边位和外侧位；如果我站在外侧，就比同站的伙伴更靠后，轮到我先走。</p><p>我会把能去的地点圈成<b>绿色虚线圈</b>。先点一下看看，再决定要不要带我过去吧。</p>'},
 {name:'沿途小惊喜',title:'我的小鼻子闻到惊喜啦',row:9,tip:'我会留一点爪爪币吃饭；小肚皮咕噜噜的时候，可不想只看伙伴吃呀。',body:'<p>到了 <b>柴柴农庄</b>，我会帮忙照顾小菜苗，赚到 <b>3 枚爪爪币</b>。到了 <b>肉垫汤屋</b>，我会把小爪子泡得暖暖的，抽一张值 <b>2 或 3 分</b>的泡汤卡。</p><p>在 <b>汪友相遇</b>，我会遇见新朋友！我可能收到 3 币、3 分、一件免费伴手礼、一片风景，或者朋友替我捐的 1 币；这枚捐赠也会让我得到 1 分。</p><p>到了 <b>犬守神社</b>，我会从自己的小钱袋里捐出 <b>1–3 币</b>，每币得 1 分。旅程结束时，我还会按捐赠排名再领奖：第 1 / 2 / 3 / 4 名分别加 <b>10 / 7 / 4 / 2 分</b>。如果我一枚也没捐，就没有这份奖励啦。</p><p>如果我和伙伴并列，我们会拿相同名次的奖励。比如我和 Yuki 并列第一，各得 10 分；下一位就是第三名，得 4 分。我至少带着 1 币，才能进神社或小铺哦。</p>'},
 {name:'风景装进背包',title:'小背包，装下大大的世界',row:8,tip:'我买一件玩具，再买一条小领巾，会得 1 + 3 = 4 分；买两件玩具则是 1 + 1 = 2 分。',body:'<p>我会拼好三幅旅行画卷：<b>稻田 3 片、山景 4 片、海景 5 片</b>。每次经过对应风景，我就拿下一片：第 1 片得 1 分，第 2 片得 2 分……越收越开心！</p><p>如果我是第一只拼完某幅画卷的狗狗，我还会拿到 <b>3 分成就奖励</b>。这一幅收齐以后，我就不能再停在同类风景地点啦，得去闻闻别处的新鲜空气。</p><p>逛 <b>爪爪小铺</b>时，我会翻开 3 件伴手礼，按标价买喜欢的几件，也可以只是看看。我的宝贝有四类：<b>小玩具、小零食、小衣饰、爪爪艺品</b>。</p><p>我会把不同类别放成一套，依次得到 <b>1、3、5、7 分</b>，凑齐四类就是 16 分！如果拿到重复类别，我会另开一套。手账会帮我整理，放心把小宝贝交给我吧。</p>'},
 {name:'驿站开饭啦',title:'我的小肚皮在叫啦',row:7,tip:'早到，我能先挑饭；晚到，我可能先出发。我要在好吃的和沿途风景之间想一想。',body:'<p>路上的<b>四座驿站，我都必须停下来</b>，最后的江户也算哦。京都出发时不吃饭，我要先迈开小爪子去旅行。</p><p>如果我是第一个到驿站的，我会翻开 <b>5 张鲜食卡</b>，先挑一份。其他伙伴到达后，会从剩下的菜单里选。所以我晚到时，菜单可能没那么丰富啦。</p><p>我每站最多吃一份鲜食，通常花 <b>1–3 币</b>，吃完就得 <b>6 分</b>！同一种鲜食，我整段旅程只能吃一次。如果钱不够，或者想留着盘缠，我可以点「这次不吃」。</p><p>我吃完以后，会乖乖等所有伙伴到齐、选完饭，才继续下一段。<b>最后抵达驿站的狗狗先出发</b>——如果那只小狗是我，我就可以先挑下一站啦！</p>'},
 {name:'我的旅行本领',title:'今天，我是哪种厉害小狗？',row:3,tip:'我想不起自己的能力时，点我的头像就能翻开旅行手账，再看一次。',body:'<p>出发时，我会收到随机的两张能力牌，从里面选一张陪我走完全程。总共有 <b>10 种旅行能力</b>，起始盘缠也跟着能力走，不是每只狗狗都一样多哦。</p><p>如果我是<b>爪印画师</b>，我会在中途三座驿站先免费收一片自选风景；如果我是<b>汪汪邮差</b>，我会先遇见一位新朋友。这两个驿站奖励都不在江户触发。</p><p>如果我是<b>饭团浪客</b>，我的每份饭便宜 1 币，最低免费；如果我是<b>人气小团子</b>，我会收到菜单里随机一份免费招待，也可以自己花钱点别的。我仍然不能吃重复的鲜食。</p><p>如果我是<b>樱花小掌柜</b>，我同次买至少两件伴手礼，最便宜的一件免费，但得先带够全部原价；如果我是<b>寻宝小商犬</b>，我每次购物能把一件宝贝的价格变成 1 币。</p><p>如果我是<b>巡路小队长</b>，我在相遇地点能从两张卡里挑一张；如果我是<b>摇尾艺人</b>，我会先收 1 币、得 1 分，再认识朋友。</p><p>如果我是<b>犬守小神官</b>，我到神社自己捐 1–3 币后，钱庄会替我再捐 1 币，也算我的分数；如果我是<b>泡汤老行家</b>，我每获得一张泡汤卡或成就卡，都会额外开心 1 分。</p>'},
 {name:'抱着回忆领奖',title:'我的快乐，要认真数一数',row:8,tip:'我不用第一个到江户。多留下一点美好的回忆，才是我的旅行小目标呀！',body:'<p>我和伙伴们都到江户、完成最后一次用餐选择后，就可以摊开手账领奖啦。一路上拿到的分数已经记好了，不会在这里再加一遍哦。</p><p>如果我的<b>鲜食标价总和</b>最高、伴手礼最多、泡汤卡最多，或相遇卡最多，我就能拿到对应的 <b>3 分成就</b>。我吃过的免费饭，也按卡面标价比较；如果我和伙伴并列最多，我们都会领奖。</p><p>接着，我会拿到神社捐赠排名奖励。最后，<b>我的总分最高，我就获胜啦！</b>如果分数打平，我会比一比成就卡数量；还一样，就和伙伴爪碰爪，一起庆祝。</p><p>一个人玩时，我听你的安排，另外三位伙伴自己思考下一站。我们遵守同样的规则，伙伴不会偷看没翻开的牌，也没有额外金币。四人同屏时，就能轮流带我们旅行啦。</p>'}
];
function rulesHTML(page){const r=rulePages[page];return shell(r.title,'MooMoo 的旅行小课堂 · 我摇着尾巴讲给你听！',`<div class="rule-tabs" aria-label="规则章节">${rulePages.map((r,i)=>`<button data-ui="rule-page" data-id="${i}" aria-current="${i===page?'step':'false'}" class="${i===page?'active':''}">${r.name}</button>`).join('')}</div><div class="rules-body">${r.body}</div><div class="moomoo-tip"><span>🐾 我的小提醒</span><p>${r.tip}</p></div>`,`<button data-ui="close">懂啦，带我去旅行</button>${page>0?`<button data-ui="rule-page" data-id="${page-1}">← 上一页</button>`:''}${page<rulePages.length-1?`<button class="primary" data-ui="rule-page" data-id="${page+1}">继续听我讲 →</button>`:''}`,{dog:0,row:r.row,close:true,label:`MOOMOO'S GUIDE / ${page+1} OF ${rulePages.length}`});}
function collectionHTML(id){const p=(s||previewState()).players[id];const chips=(cards,fn)=>cards.length?cards.map(c=>`<span class="collection-chip">${fn(c)}</span>`).join(''):'<span class="empty">小背包在等路上的惊喜。</span>';
 return shell(`${DOGS[id].name} 的旅行手账`,`${p.score} 旅途分 · ◉ ${p.cash} 币 · 累计捐赠 ${p.donations} 币`,`${p.role?`<div class="note-box"><b>${ROLE[p.role].icon} ${ROLE[p.role].name}</b><br>${ROLE[p.role].text}</div>`:''}${collectionSummary(p)}<h3 class="section-subhead">伴手礼 · 当前组套 ${giftScore(p.gifts)} 分</h3><div class="collection-list">${chips(p.gifts,c=>FAMILIES[c.family].icon+' '+esc(c.name)+cardDetails(c))}</div><h3 class="section-subhead">鲜食 · 标价总和 ${p.meals.reduce((n,c)=>n+c.price,0)} 币</h3><div class="collection-list">${chips(p.meals,c=>'🍱 '+esc(c.name)+' · '+c.price+' 币'+cardDetails(c))}</div><h3 class="section-subhead">泡汤与新朋友</h3><div class="collection-list">${chips(p.springs,c=>'♨ '+c.points+' 分')}${chips(p.encounters,c=>ENCOUNTERS[c.type].icon+' '+ENCOUNTERS[c.type].name)}</div><h3 class="section-subhead">我的小成就</h3><div class="collection-list">${chips(p.awards,c=>'✦ '+awardNames[c])}</div><h3 class="section-subhead">分数从哪里来</h3><div class="collection-list">${Object.entries(p.ledger).map(([k,v])=>`<span class="collection-chip">${ledgerNames[k]} ${v}</span>`).join('')||'<span class="empty">还没出发，先不着急！</span>'}</div>`,'',{dog:id,close:true});
}
function endHTML(){return shell('江户到了，爪爪抱一个！',`${s.winners.map(i=>DOGS[i].name).join(' 和 ')} ${s.winners.length>1?'共享本次旅行的胜利':'赢得了本次旅行'}。`,`<table class="score-table"><thead><tr><th>旅人</th><th>总分</th><th>成就数</th></tr></thead><tbody>${s.ranking.map(id=>{const p=s.players[id];return`<tr class="${s.winners.includes(id)?'winner':''}"><td><button class="text-button" data-ui="score-detail" data-id="${id}">${s.winners.includes(id)?'✦ ':''}${DOGS[id].name} · 分解 ↘</button></td><td><b>${p.score}</b></td><td>${p.awards.length}</td></tr>`;}).join('')}
</tbody></table><h3 class="section-subhead">让每只小狗讲讲，分数从哪里来</h3><p class="empty">点开名字，展开逐项账单。总分已经包含以下项目，不会再加一次哦。</p><div class="end-breakdowns">${s.players.map(p=>endScoreCard(p)).join('')}
</div><p class="dialog-copy">分数相同时，成就卡更多的狗狗获胜；再相同，就一起庆祝。</p>`, '<button data-ui="journal">回看旅行手账</button><button data-ui="new" class="primary">再去散步一次 →</button>',{dog:s.winners[0],row:8,label:'EDO / A JOURNEY TO REMEMBER'});}
function endScoreCard(p){const detail=scoreBreakdown(p,s.players),awards=detail.rows.find(r=>r.key==='awards');return `<details class="end-score-card" data-score-dog="${p.id}" ${p.id===0?'open':''}><summary>${sprite(p.id,8)}<span><strong>${DOGS[p.id].name} 的旅行账单</strong><small>${ROLE[p.role]?.name||'小旅人'}</small></span><b>${p.score}<small> 分</small></b><span class="score-chevron">⌄</span></summary><div class="score-card-body"><section class="score-achievements" aria-label="我的小成就" data-score-key="awards" data-score-value="${awards.value}"><h3>✦ 我获得的小成就 <b>${awards.value} 分</b></h3>${p.awards.length?`<div class="collection-list">${p.awards.map(a=>`<span class="collection-chip">${awardNames[a]} · +${p.role==='elder'?4:3} 分</span>`).join('')}</div><p>汪！我抱回了 ${p.awards.length} 张成就卡${p.role==='elder'?'，每张已包含老行家额外的 1 分':''}，奖励都算进总分啦。</p>`:`<p>${awards.explanation}</p>`}</section>${extensionCards(p,true)}<p class="score-story">${detail.story}</p><dl class="score-rows">${detail.rows.filter(r=>r.key!=='awards'&&!r.featured).map(r=>`<div class="score-row ${r.value?'':'zero'}" data-score-key="${r.key}" data-score-value="${r.value}"><dt>${r.label}<b>${r.value} 分</b></dt><dd>${r.explanation}</dd></div>`).join('')}
</dl><div class="score-total"><span>把每一份快乐加起来</span><strong>${detail.total} 分</strong></div><button class="text-button" data-ui="player" data-id="${p.id}">翻开我的收藏明细 ↗</button></div></details>`;}
function scheduleAI(){clearTimeout(aiTimer);if(moving||!s||aux||s.ended||current(s).human)return;aiTimer=setTimeout(()=>{if(moving||!s||aux||current(s).human||s.ended)return;dispatch(aiAction(s));},fast?260:s.phase==='notice'?1600:1050);}
function openAux(next){clearTimeout(aiTimer);if(aux?.kind==='rules'&&next.kind==='rules')return;next.back=aux;aux=next;renderModal();}
function closeAux(){aux=aux?.back||null;render();if(!$('#modal').open)lastFocus?.focus?.({preventScroll:true});}
$('#modal').addEventListener('cancel',e=>{e.preventDefault();if(aux&&aux.kind!=='welcome')closeAux();});
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.matches('[role="button"][data-ui="player"]'))e.target.click();});
document.addEventListener('change',e=>{if(e.target.dataset.ui==='map-pack'){aux.mapPack=e.target.value;render();return;}if(e.target.dataset.ui==='edition'){aux.edition=e.target.value;renderModal();return;}if(e.target.dataset.ui==='gift'){const id=e.target.dataset.id;selected=e.target.checked?[...selected,id]:selected.filter(v=>v!==id);e.target.closest('.choice').classList.toggle('selected',e.target.checked);updatePurchase();}});
document.addEventListener('click',e=>{const el=e.target.closest('[data-ui]');if(!el||moving)return;const ui=el.dataset.ui,id=el.dataset.id;
 switch(ui){
 case'rules':openAux({kind:'rules',page:0});break;
 case'rule-page':aux.page=Number(id);renderModal();break;
 case'new':openAux({kind:'new'});break;
 case'close':closeAux();break;
 case'start':{const chosenMap=shownMapId();clearTimeout(aiTimer);window.scrollTo(0,0);s=newGame(Date.now(),el.dataset.mode,aux?.edition||'classic');s.presentation={mapPack:chosenMap,mapVersion:getMapPack(chosenMap).version};aux=null;selected=[];save();render();break;}
 case'speed':fast=!fast;render();break;
 case'collection':openAux({kind:'collection',id:0});break;
 case'score-detail':{const card=$('.end-score-card[data-score-dog="'+id+'"]');if(card){document.querySelectorAll('.end-score-card').forEach(el=>el.open=el===card);positionDialog();card.scrollIntoView({block:'start',behavior:'instant'});}break;}
 case'player':openAux({kind:'collection',id:Number(id)});break;
 case'map':openAux({kind:'map'});break;
 case'scenery':openAux({kind:'scenery',id:id===undefined?(s?.leg??0):Number(id)});break;
 case'journal':openAux({kind:'journal'});break;
 case'stop':if(!s){openAux({kind:'welcome'});return;}openAux({kind:'stop',id:Number(id)});break;
 case'go':aux=null;dispatch({type:'move',id:Number(id)});break;
 case'peek-map':openAux({kind:'peek'});break;
 case'resume-draft':aux=null;render();break;
 case'role':dispatch({type:'role',id});break;
 case'ack':dispatch({type:'ack'});break;
 case'buy':dispatch({type:'buy',ids:selected});break;
 case'skip-gifts':dispatch({type:'buy',ids:[]});break;
 case'donate':dispatch({type:'donate',amount:Number(id)});break;
 case'meal':dispatch({type:'meal',id});break;
 case'skip-meal':dispatch({type:'meal',id:null});break;
 case'panorama':dispatch({type:'panorama',id});break;
 case'encounter':dispatch({type:'encounter',id});break;
 }
});
const FRAMES=[6,8,8,4,5,8,6,6,6,8,8];
const ROWS={husky:[[0,145],[145,137],[282,137],[419,155],[574,128],[702,144],[846,114],[960,129],[1089,142],[1231,146],[1377,154]],corgi:[[0,139],[139,139],[278,143],[421,145],[566,131],[697,145],[842,137],[979,127],[1106,145],[1251,140],[1391,140]],shepherd:[[0,139],[139,142],[281,139],[420,144],[564,112],[676,154],[830,114],[944,109],[1053,142],[1195,140],[1335,196]]};
let frame=0;const reduced=matchMedia('(prefers-reduced-motion: reduce)');
function animateSprites(){document.querySelectorAll('.sprite').forEach(el=>{const id=Number(el.dataset.dog),row=Number(el.dataset.row)||0,source=id===3&&row===2?1:row,col=reduced.matches?0:frame%FRAMES[row];let sy=source/10*100,sh=1100;if(id){const[top,h]=ROWS[DOGS[id].file][source];sh=1531/h*100;sy=top/(1531-h)*100;}el.style.backgroundSize=`800% ${sh}%`;el.style.backgroundPosition=`${col/7*100}% ${sy}%`;el.style.transform=id===3&&row===2?'scaleX(-1)':'';});}
setInterval(()=>{if(document.hidden)return;frame++;animateSprites();},150);
render();
requestAnimationFrame(()=>{window.scrollTo(0,0);positionDialog();});
