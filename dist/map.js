// Illustrated regional maps. Positions are game-space coordinates, not a geographic scale.
export const REGIONS=[
 {name:'京都 · 近江',sub:'樱桥出发，穿过湖畔与青山',x:0,y:0,landmarks:[['琵琶湖',38,14],['铃鹿山麓',83,13]]},
 {name:'伊势 · 三河',sub:'松风吹过海湾，帆影慢慢远去',x:100,y:0,landmarks:[['伊势湾',82,82],['三河海岸',81,13]]},
 {name:'骏河 · 富士',sub:'把雪顶与海浪，装进小小画卷',x:0,y:100,landmarks:[['富士山',52,10],['骏河湾',83,86]]},
 {name:'箱根 · 江户',sub:'翻过青山，去灯火里团圆',x:100,y:100,landmarks:[['芦之湖',21,17],['江户',88,12]]}
];
const MAP_STORIES=[
 {title:'樱花开啦，我的小爪子要出发咯！',paragraphs:[
  '我从左边热热闹闹的京都出发啦！屋顶、寺塔和粉粉的樱花挤在一起，我还要踩过小桥，闻一闻春天的味道。',
  '我抬头能望见蓝蓝的琵琶湖，往前是方方的田地，远处还有铃鹿山麓的青山。我想把城里的热闹慢慢留在身后，把湖风和青草香装进小背包。',
  '这一卷是我的「开始旅行」：从熟悉的街巷走向宽宽的乡野。我的尾巴已经摇起来啦，不过我不着急赶路，出发路上的小美好也要认真看看！']},
 {title:'海风来啦，我的耳朵要飘起来啦！',paragraphs:[
  '我走到伊势、三河的海边啦！右边和下方铺着蓝蓝的海湾，小帆船在水上慢慢走，岸边的松树像在朝我挥爪。',
  '我沿着海岸看过去，还能找到小村子和一块块稻田。宽宽的浅色陆地挨着深蓝的海，我觉得连呼吸都变得舒舒服服了。',
  '这一卷是我的「沿海慢行」：我想听听浪花，看看远处的帆影，让海风把赶路的小着急吹走。海这么大，我的小快乐也要装得满满的！']},
 {title:'哇，富士山戴着白白的小帽子！',paragraphs:[
  '我一抬头，就看见上方雪顶白白的富士山啦！它是这幅画里最醒目的大风景，我要仰起小脑袋，多看两眼。',
  '我身边有层层叠叠的茶田、松林和田地，还有溪流上的小桥；右下方是蓝蓝的骏河湾。我把山、田和海一起看进眼睛里，感觉自己的旅行手账都要装不下啦。',
  '这一卷是我的「留下大风景」：我已经走了好一段路，想停一停，把眼前的雪顶和浪花好好记住。我的小爪子在赶路，我的小眼睛也在收集回忆呀！']},
 {title:'翻过青山，我就快到江户啦！',paragraphs:[
  '我先望见左上方箱根的青山、轻轻的云雾，还有藏在山里的芦之湖。山路走得我小爪子有点酸，不过我还想再看看这片安静的风景。',
  '我把目光往右上方挪，就能看见江户密密的屋顶、河道和桥梁啦！中间的平原把山野与城镇连起来，像在告诉我：团圆的地方已经不远了。',
  '这一卷是我的「抵达与团圆」。虽然画里还是白天，我已经开始期待江户的灯火和热乎乎的饭啦。我想和伙伴一起摊开手账，数数这一路收集了多少摇尾巴的理由！']}
];
export function mapStoryHTML(leg){const r=REGIONS[leg],story=MAP_STORIES[leg];return `<figure class="map-story-picture"><div class="atlas-scene" style="--map-x:${r.x}%;--map-y:${r.y}%" role="img" aria-label="${r.name}浮世绘地图"></div><figcaption>${r.sub}</figcaption></figure><div class="dialog-copy map-story-copy"><h3>${story.title}</h3>${story.paragraphs.map(p=>`<p>${p}</p>`).join('')}</div><div class="note-box map-story-note">我把这一路画成了浮世绘风格的旅行绘卷，山、水和小屋围在旁边，中间给我的小爪子和地点路标留了位置。它是我的风景手账，距离和方位不按真实地图量哦。<br><br>我看见背景里的山海不会自动拿到画卷；我还要在风景地点停靠，或收到朋友、旅行能力送来的画卷，才能把它们收进背包啦。</div>`;}
// Each path is fitted to dry land in its illustration, with room for labels and dog tokens.
const POINTS=[
 [[16,72],[29,69],[42,73],[56,69],[70,65],[83,56],[71,47],[57,48],[43,48],[29,49],[17,39],[31,30],[46,29],[61,29],[76,34]],
 [[14,72],[27,66],[40,61],[55,56],[68,49],[82,39],[72,28],[58,30],[44,34],[30,40],[17,30],[32,20],[49,17],[65,18],[81,18]],
 [[19,71],[32,70],[46,68],[59,61],[73,54],[85,43],[72,34],[59,36],[46,44],[32,48],[20,38],[33,29],[47,27],[61,23],[77,23]],
 [[17,72],[31,69],[45,67],[59,61],[72,54],[84,43],[73,34],[59,37],[45,45],[31,48],[18,40],[35,28],[49,25],[63,22],[77,22]]
];
export function mapPoints(leg,count){const points=POINTS[leg];return count===15?points:points.filter((_,i)=>i!==2);}
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
export function mapMarkup(leg,points,buttons,progress){const r=REGIONS[leg],path=pathFor(points),done=points.slice(0,Math.max(1,progress+1));return `<div class="map-scroll" tabindex="0" role="region" aria-label="可横向滚动的旅行地图"><div class="map-canvas" style="--map-x:${r.x}%;--map-y:${r.y}%"><div class="map-art" role="img" aria-label="浮世绘风格的${r.name}山海地图"></div><div class="map-cartouche"><span>東海道 犬旅絵図</span><strong>${r.name}</strong><small>${r.sub}</small></div>${r.landmarks.map(([n,x,y])=>`<span class="map-landmark" style="left:${x}%;top:${y}%">${n}</span>`).join('')}<svg class="map-path" viewBox="0 0 1000 666.667" aria-hidden="true"><path class="road-edge" d="${path}"/><path class="road-paper" d="${path}"/><path class="road-guide" d="${path}"/>${done.length>1?`<path class="road-done" d="${pathFor(points,0,done.length-1)}"/>`:''}</svg><div class="route map-stops">${buttons}</div><div class="map-seal">四犬<br>道中</div><span class="map-caption">随爪印向前 · 山海慢行</span></div></div>`;}
export function mapAtlasHTML(){return `<div class="map-atlas">${REGIONS.map((r,i)=>`<figure><div class="atlas-scene" style="--map-x:${r.x}%;--map-y:${r.y}%" role="img" aria-label="${r.name}浮世绘地图"></div><figcaption>卷 ${['一','二','三','四'][i]} · ${r.name}<button class="text-button" data-ui="scenery" data-id="${i}" aria-label="MooMoo 介绍${r.name}">听我讲风景 ↗</button></figcaption></figure>`).join('')}</div>`;}
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
