import {extensions} from './extensions.js';
import {DOGS,LIMITS} from './data.js';
const BASE_SCORE_LABELS={pano:'风景画卷',gifts:'伴手礼',meals:'驿站鲜食',springs:'泡汤',donations:'旅途捐赠',encounters:'相遇直接得分',talent:'能力直接得分',awards:'成就卡',templeFinal:'捐赠排名'};
export const SCORE_LABELS={...BASE_SCORE_LABELS,...extensions.scoreLabels()};
export const AWARD_NAMES={paddy:'稻田画卷首位完成',mountain:'山景画卷首位完成',sea:'海景画卷首位完成',gourmet:'鲜食鉴赏家',collector:'伴手礼收藏家',bather:'肉垫泡汤王',chatter:'交友小能手'};
const triangular=n=>n*(n+1)/2;
export function scoreBreakdown(p,players){
 const rank=1+players.filter(q=>q.donations>p.donations).length,elder=p.role==='elder';
 const explanations={
  pano:`我收集了稻田 ${p.pano.paddy}/${LIMITS.paddy} 片（${triangular(p.pano.paddy)} 分）、山景 ${p.pano.mountain}/${LIMITS.mountain} 片（${triangular(p.pano.mountain)} 分）和海景 ${p.pano.sea}/${LIMITS.sea} 片（${triangular(p.pano.sea)} 分）。首位拼完的奖励记在成就卡里。`,
  gifts:`我的 ${p.gifts.length} 件小宝贝按不同类别组套，每套第 1 / 2 / 3 / 4 件分别值 1 / 3 / 5 / 7 分。朋友送的礼物也一起算。`,
  meals:`我吃了 ${p.meals.length} 份鲜食，每份都是 6 分。打折或免费，也不会少一分呀！`,
  springs:`我泡了 ${p.springs.length} 次汤，卡面合计 ${p.springs.reduce((n,c)=>n+c.points,0)} 分。${elder?`我的泡汤老行家能力再加 ${p.springs.length} 分，已包含在这一项。`:'暖暖的小肉垫，也留下了快乐分数。'}`,
  donations:`我的捐赠记录一共 ${p.donations} 币，每币 1 分；朋友或钱庄替我捐的也算在这里。`,
  encounters:`护路柴武士每次送我 3 分。相遇得到的礼物、风景和捐赠分别记进对应项目；收到金币本身不加分。`,
  talent:p.role==='entertainer'?'我的摇尾艺人能力，每次在相遇地点先送我 1 分。朋友接着给的奖励另记到对应项目。':'我没有额外的直接能力分。能力带来的风景、捐赠、泡汤或成就奖励，都已经记在对应项目里啦。',
  awards:p.awards.length?`我拿到 ${p.awards.length} 张成就：${p.awards.map(a=>AWARD_NAMES[a]).join('、')}。每张 ${elder?4:3} 分${elder?'，已含老行家每张额外 1 分':''}。`:'这次我没有拿到成就卡，但背包里的回忆也很珍贵呀。',
  templeFinal:p.donations?`我的捐赠是 ${p.donations} 币，排第 ${rank} 名${players.some(q=>q.id!==p.id&&q.donations===p.donations)?'（与伙伴并列）':''}。这份终局奖励和每币 1 分的旅途捐赠分开算。`:'我的捐赠是 0 币，所以这次没有神社排名奖励。'
 };
 const rows=Object.entries(BASE_SCORE_LABELS).map(([key,label])=>({key,label,value:p.ledger?.[key]||0,explanation:explanations[key]}));
 rows.splice(rows.findIndex(r=>r.key==='templeFinal'),0,...extensions.scoreRows(p,players));
 const total=rows.reduce((n,r)=>n+r.value,0),best=rows.reduce((a,b)=>b.value>a.value?b:a,rows[0]);
 return {rows,total,story:`汪！我是 ${DOGS[p.id].name}，这趟旅行攒下了 ${p.score} 分！${best.value?`我的「${best.label}」贡献最多，带来了 ${best.value} 分。`:'我把一路的风景都记在心里啦。'}小钱袋还剩 ${p.cash} 币，留作纪念，不换成分数哦。`};
}
