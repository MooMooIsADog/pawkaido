import {LIMITS} from './data.js';
export const WISHES=[
 {name:'大馋丫头',icon:'🍱',target:3,points:6,text:'我的小肚皮有时刻表！中途三座驿站，每站吃一份鲜食，一顿都不能落下！免费餐也算，江户那顿不补前面的空缺。'},
 {name:'好奇探险家',icon:'🌄',target:12,points:6,text:'稻田闻一闻，山上瞧一瞧，海边跑一跑！我要把三幅风景画卷全都拼完整：稻田 3 片、山景 4 片、海景 5 片！自己走到的、朋友送的、旅行能力带来的都算，三幅全齐就能额外获得 6 分啦。'},
 {name:'泡汤小享受家',icon:'♨',target:3,points:6,text:'我的小短腿走累啦！在三座不同的肉垫汤屋成功泡汤，小肉垫就又充满力气啦～'},
 {name:'勤劳小帮手',icon:'🥕',target:2,points:4,text:'我来帮忙啦！帮好两座不同的小农庄，我就是这条路上可靠的小帮手！'}
];
export const newWish=id=>({points:WISHES[id].points,...(id===1?{sceneryTarget:'full',sceneryIncludesGifts:true}:{}),meals:[],scenery:[],springs:[],farms:[],claimed:false});
const sceneryTypes=['paddy','mountain','sea'];
const sceneryNames={paddy:'稻田',mountain:'山景',sea:'海景'};
const sceneryGoal=(h,type)=>h.sceneryTarget==='full'?LIMITS[type]:(h.sceneryTarget??1);
export function wishProgress(p){
 const w=WISHES[p.id],h=p.wish;if(!h)return null;
 const sceneryTarget=h.sceneryTarget??1;
 const scenery=p.id===1?sceneryTypes.map(type=>({type,name:sceneryNames[type],count:Math.min(sceneryGoal(h,type),h.scenery.filter(t=>t===type).length),target:sceneryGoal(h,type)})):null;
 const target=scenery?scenery.reduce((n,c)=>n+c.target,0):w.target;
 const entries=[h.meals,h.scenery,h.springs,h.farms][p.id];
 const count=scenery?scenery.reduce((n,c)=>n+c.count,0):Math.min(target,entries.length);
 const text=p.id===1&&sceneryTarget===1?'稻田闻一闻，山上瞧一瞧，海边跑一跑！三种风景我都要亲自去一次，朋友送的画卷不算打卡哦。':p.id===1&&!h.sceneryIncludesGifts?'稻田闻一闻，山上瞧一瞧，海边跑一跑！三种风景我都要各亲自停靠两次，六个小爪印都集齐才算完成，朋友送的画卷不算打卡哦。':p.id===1&&sceneryTarget===2?'稻田、山景、海景，我每种都要收集两片！自己走到的、朋友送的、旅行能力带来的都算，六片小美好集齐就能额外获得 4 分啦。':p.id===1?w.text.replace('获得 6 分',`获得 ${h.points??4} 分`):w.text;
 return {...w,text,target,scenery,points:h.points??[6,4,6,4][p.id],count,complete:count===target,claimed:h.claimed,missed:p.id===0&&[14,27,41].some(id=>p.pos>id&&!h.meals.includes(id))};
}
export function recordWish(p,kind,value){
 if(!p.wish)return;
 const limit=kind==='scenery'&&p.id===1?sceneryGoal(p.wish,value):1;
 if(p.wish[kind].filter(v=>v===value).length<limit)p.wish[kind].push(value);
}
export function wishExplanation(p){const w=wishProgress(p);return w?`${w.text} 我的进度：${w.count}/${w.target}。${w.scenery?w.scenery.map(c=>`${c.name} ${c.count}/${c.target}`).join('、')+'。':''}${w.claimed?`心愿完成，额外 ${w.points} 分已经算进总分啦！`:w.missed?'这次落下一顿啦，下次我记得留饭钱。':'还没完成，继续收集喜欢的小快乐吧。'}`:'';}
