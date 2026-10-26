export const DOGS=[
 {name:'MooMoo',breed:'卷毛小旅人',file:'moomoo',color:'#b9754e'},
 {name:'Yuki',breed:'哈士奇',file:'husky',color:'#608ca2'},
 {name:'Biscuit',breed:'柯基',file:'corgi',color:'#ba9141'},
 {name:'Rex',breed:'德牧',file:'shepherd',color:'#6d8367'}
];
export const TYPES={
 village:{name:'爪爪小铺',icon:'🎐',color:'#a67b59',hint:'翻开 3 件伴手礼，挑选购买；四种类别组成套装。'},
 temple:{name:'犬守神社',icon:'⛩',color:'#bb6258',hint:'捐出 1–3 枚爪爪币，每枚得 1 分；终局另按捐赠排名加分。'},
 encounter:{name:'汪友相遇',icon:'✉',color:'#aa7b99',hint:'遇见旅行中的新朋友，获得随机馈赠。'},
 paddy:{name:'稻田嗅嗅',icon:'🌾',color:'#8b9a59',hint:'收集稻田画卷第 1–3 片，分别得 1、2、3 分。'},
 mountain:{name:'山间留影',icon:'山',color:'#7a8c91',hint:'收集山景画卷第 1–4 片，分别得 1、2、3、4 分。'},
 sea:{name:'海风追浪',icon:'≈',color:'#6b9da9',hint:'收集海景画卷第 1–5 片，分别得 1、2、3、4、5 分。'},
 spring:{name:'肉垫汤屋',icon:'♨',color:'#78aaa2',hint:'抽一张泡汤卡，获得 2 或 3 分。'},
 farm:{name:'柴柴农庄',icon:'🥕',color:'#b79c50',hint:'帮忙照料农庄，赚取 3 枚爪爪币。'},
 inn:{name:'狗狗驿站',icon:'⌂',color:'#bf725d',hint:'必须停靠；选一份没吃过的鲜食，获得 6 分。等齐伙伴再出发。'}
};
export const LIMITS={paddy:3,mountain:4,sea:5};
export const INNS=[0,14,27,41,54];
export const INN_NAMES=['京都 · 小爪出发屋','樱坂 · 花见驿','汐见 · 海风驿','松原 · 月见驿','江户 · 团圆屋'];
export const LEG_NAMES=['樱风启程','山海之间','松影慢行','江户灯火'];
// Standard board location order and capacities; original artwork is not used.
const route=[
 ['inn',4],['village',2],['temple',1],['encounter',1],['paddy',1],['spring',2],['mountain',2],['farm',2],['village',1],['temple',2],['encounter',1],['sea',2],['mountain',1],['spring',1],['inn',4],
 ['sea',1],['temple',1],['farm',2],['paddy',2],['mountain',2],['encounter',2],['temple',1],['spring',2],['mountain',1],['sea',2],['village',1],['farm',1],['inn',4],
 ['paddy',1],['village',1],['encounter',2],['farm',1],['mountain',2],['spring',1],['sea',2],['paddy',1],['temple',2],['farm',2],['encounter',1],['sea',1],['village',2],['inn',4],
 ['spring',1],['temple',2],['encounter',1],['village',2],['sea',1],['farm',2],['spring',2],['encounter',1],['mountain',1],['paddy',2],['sea',2],['village',1],['inn',4]
];
export const BOARD=route.map(([type,capacity],id)=>({id,type,capacity,name:type==='inn'?INN_NAMES[INNS.indexOf(id)]:TYPES[type].name}));
export const ROLES=[
 {id:'artist',original:'Hiroshige',name:'爪印画师',cash:3,icon:'🖌',text:'我到达中途的三座驿站时，会先免费收集一片自选风景，再吃饭。'},
 {id:'courier',original:'Chuubei',name:'汪汪邮差',cash:4,icon:'✉',text:'我到达中途的三座驿站时，会先遇见一位新朋友，再吃饭。'},
 {id:'ronin',original:'Kinko',name:'饭团浪客',cash:7,icon:'🍙',text:'我的每份驿站鲜食都便宜 1 币，最低可以免费！'},
 {id:'official',original:'Yoshiyasu',name:'巡路小队长',cash:9,icon:'📜',text:'我在相遇地点翻开两张相遇卡，挑一位朋友见面。'},
 {id:'orphan',original:'Satsuki',name:'人气小团子',cash:2,icon:'🌸',text:'每座驿站都会随机请我吃菜单里的一份鲜食。我可以免费接受，也可以自己点别的。'},
 {id:'elder',original:'Mitsukuni',name:'泡汤老行家',cash:6,icon:'♨',text:'每获得一张泡汤卡或成就卡，我都额外开心 1 分。'},
 {id:'geisha',original:'Sasayakko',name:'樱花小掌柜',cash:5,icon:'🎐',text:'同次购物买至少两件伴手礼，最便宜的一件免费！但我得先带够全部原价。'},
 {id:'priest',original:'Hirotada',name:'犬守小神官',cash:8,icon:'⛩',text:'每次到神社，我自己捐 1–3 币后，钱庄会再替我捐 1 币，也算我的分数。'},
 {id:'entertainer',original:'Umegae',name:'摇尾艺人',cash:5,icon:'🎵',text:'每次停在相遇地点，我先赚 1 币和 1 分，再和新朋友打招呼。'},
 {id:'merchant',original:'Zen-emon',name:'寻宝小商犬',cash:6,icon:'👛',text:'每次逛小铺，我可以把买到的一件伴手礼的价格变成 1 币。'}
];
export const ROLE=Object.fromEntries(ROLES.map(r=>[r.id,r]));
export const FAMILIES=[{name:'小玩具',icon:'🎾'},{name:'小零食',icon:'🦴'},{name:'小衣饰',icon:'🧣'},{name:'爪爪艺品',icon:'🎨'}];
const giftNames=[['樱花响响球','柴犬小风铃','竹编飞盘','绳结小骨头','爪印小木牌','纸鸢小尾巴'],['南瓜小饼','冻干鸡肉粒','鳕鱼小方块','胡萝卜脆片','苹果小圆片','红薯小软条'],['樱花小领巾','蓝染小披风','竹叶小斗笠','月白小围兜','爪印小背包','祭典小浴衣'],['爪印木版画','柴犬小泥偶','波浪储物盒','漆绘小食碗','富士爪印画','月下四犬图']];
const prices=[[1,1,1,1,1,1],[1,2,2,1,1,1],[2,2,2,2,2,2],[3,2,2,2,3,3]];
export const GIFTS=giftNames.flatMap((names,family)=>names.map((name,i)=>({id:`g${family}-${i}`,name,family,price:prices[family][i]})));
const foodNames=['南瓜饭团','鸡肉米饭','胡萝卜暖汤','豆腐鸡肉碗','鳕鱼小饭盒','三文鱼饭团','荞麦鸡肉碗','火鸡鲜食','鸭肉山药碗','牛肉暖面','白鱼蒸南瓜','鲷鱼鲜食','鹿肉杂蔬碗','团圆豪华饭'];
export const FOODS=foodNames.map((name,i)=>({id:`f${i}`,name,price:i<3?1:i<8?2:3}));
export const ENCOUNTERS={
 merchant:{name:'背包商犬',icon:'🎐',text:'新朋友送我一件随机伴手礼，尾巴都摇起来啦！'},
 paddy:{name:'稻田向导',icon:'🌾',text:'我跟着向导收集一片稻田风景；收齐了就换另一幅。'},
 mountain:{name:'山间向导',icon:'山',text:'我跟着向导收集一片山间风景；收齐了就换另一幅。'},
 sea:{name:'海边向导',icon:'≈',text:'我跟着向导收集一片海边风景；收齐了就换另一幅。'},
 samurai:{name:'护路柴武士',icon:'⚑',text:'我听了一路勇敢的故事，获得 3 分！'},
 noble:{name:'热心大狗狗',icon:'👛',text:'新朋友给我 3 枚爪爪币，让我去找更多小惊喜。'},
 priest:{name:'神社守护犬',icon:'⛩',text:'守护犬替我捐出 1 币，算进我的捐赠，还送我 1 分。'}
};
