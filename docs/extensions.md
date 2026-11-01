# 本地扩展接口 · API 1

这次重构以 Git `v1.0.0` 为基线。狗狗心愿仍随游戏附带，经典版与心愿版的规则、分值、AI 权重、文案及历史存档条件保持不变。

## 目录与加载

```text
dist/
  engine.js                 基础规则、行动事务、AI 基础估值
  extension-host.js         扩展接口、兼容检查、统一计分效果
  extensions.js             读取清单，加载本地模块；失败时保留经典版
  extensions/catalog.js     已安装扩展的入口清单
  extensions/dog-wishes/
    manifest.js             稳定编号、版本、接口版本、存档字段
    index.js                事件与奖励
    rules.js                心愿数据、进度及历史规则解释
    ai.js                   移动偏好与预留饭钱
    validation.js           历史条件及奖励的存档校验
    presentation.js         开局预览、规则页、进度卡
```

`app.js` 与 `scores.js` 使用通用展示接口，不再导入心愿规则。`dist/wishes.js` 只保留旧工具的兼容导出；网页启动不依赖它。新工具应直接引用包内规则或扩展接口。

浏览器不能自行扫描本地目录。安装时将包放到 `dist/extensions/<id>/`，在 `catalog.js` 增加 `{id:'<id>', entry:'./<id>/index.js'}`，然后刷新网页。清单只允许这个本地入口格式。当前在启动时加载已安装包的小型脚本；已有图片、动画和音乐继续共用，不复制到包里。

移除清单项即可从开局选项中移除扩展，再删除其目录。需要该扩展的旧存档会提示缺少扩展，不会按经典版读取或自动覆盖。重新安装后可继续；如果玩家明确开始新旅行，仍按原有行为替换存档。

## 包清单与版本

`index.js` 默认导出一个对象，至少含 `manifest`：

```js
{
  id: 'dog-wishes',             // 稳定编号；发布后不改
  name: '狗狗心愿',
  version: '1.0.0',
  coreApi: 1,                   // 必须与宿主接口版本一致
  edition: {id:'wishes', name:'狗狗能力扩展版', description:'…'},
  playerKeys: ['wish'],          // 此包拥有的玩家存档字段
  scoreCategories: ['wishes'],   // 此包拥有的计分类别
  compatibleSaveVersions: []    // 明确验证过可继续运行的旧包版本
}
```

包编号、旅行版本编号、存档字段和计分类别不能冲突。新包的字段和分数键应使用包专属前缀；心愿保留 `wish` / `wishes` 是为了兼容现有存档。

新对局记录 `extensions: [{id, version}]`；经典版记录空数组。旧 `v1.0.0` 存档没有该字段，继续按原 `edition` 识别。它们已经把具体奖励与条件放在 `player.wish` 中，读取时不会重新套用新开局默认值。因此 Yuki 各一次、各停两次、赠送计入、全收齐等历史条件，以及旧奖励，均继续有效。

包版本不一致时，默认阻止读档；只有明确加入 `compatibleSaveVersions` 并保留旧规则实现后才允许。该列表不是自动迁移工具，不能单靠把版本号加入列表就宣称兼容。升级游戏不会修改用户浏览器里的存档。

## 行动与计分接口

`act()` 先克隆状态；所有扩展进度更新和计分都在克隆上执行。非法行动或扩展异常不会部分写入调用者的原状态。

| 接口 | 用途 |
| --- | --- |
| `initializePlayer(p)` | 初始化此包声明的玩家字段 |
| `onEvent(s, event)` | 记录进度；只修改包自己的字段 |
| `afterAction(s)` | 成功行动结束后返回一次性的计分效果列表 |
| `validate(s)` | 校验包内状态及账目，返回布尔值 |
| `ai.moveValue(s,p,type)` | 在基础地点估值上增加偏好 |
| `ai.reserve(s,p)` | 建议保留金币数；宿主取它与基础预留值的较大值 |

当前发出的事件：

| `event.type` | 额外字段 | 条件 |
| --- | --- | --- |
| `mealEaten` | `space` | 实际选择并吃到鲜食，免费也算；跳过不触发 |
| `farmHelped` | `space` | 执行农庄任务 |
| `springEnjoyed` | `space` | 实际抽到泡汤卡；牌堆空不触发 |
| `panoramaGained` | `panorama` | 实际增加一片画卷，包含相遇与能力赠送 |
| `panoramaVisited` | `panorama` | 执行对应风景地点任务，用于保留历史的亲自停靠条件 |

所有事件都有 `playerId`。事件发生在对应任务的处理过程中，不能把它当成整个行动已完成；需要读取完整结果时用 `afterAction`。画卷赠送只触发 `panoramaGained`；实际风景停靠还会触发 `panoramaVisited`。心愿包根据存档条件选择其中一种，避免重复计数。

奖励通过返回值提交，不能直接改 `p.score` 或 `p.ledger`：

```js
{type:'score', playerId:0, category:'wishes', points:6, note:'我的心愿完成啦！'}
```

宿主统一更新总分、账本和当前角色提示；扩展负责在自己的状态中记录已领取，避免重复奖励。这种奖励不会产生基础成就卡。API 1 主要面向旅途中立即结算的扩展；改变终局结算时序、新增玩家操作或新路线，需要先扩展并验证核心接口。

AI 可以用 `aiAction(s,{useExtensions:false})` 关闭扩展偏好，但对局仍按实际扩展规则计分。模拟脚本的 `unaware` 就使用这个选项；不要再伪造 `edition:'classic'`，那会与新的存档扩展清单冲突。

## 界面接口

包可提供 `ui.preview()`、`ui.mini(p)`、`ui.card(p,{score,ended})` 和 `ui.rulePages`。这些内容分别进入开局预览、侧栏、手账/结算卡和 MooMoo 规则说明。未参与的玩家返回空内容；无需直接访问 DOM 或全局游戏变量。

`scoreLabels` 提供账目名称，`scoreRows(p,players)` 返回 `{key,label,value,explanation}`。如果某行已经由 `ui.card(...,{score:true})` 展示，可设置 `featured:true`，避免在普通分项列表重复显示；它仍计入分数合计。基础成就卡保持在最前面。

这些模块是本项目提供的可执行代码，不是沙箱化的第三方插件平台。保持确定性：不要使用网络、当前时间或独立随机数改变规则；不要读取隐藏牌堆为 AI 决策。

## 单独打包

```sh
python3 scripts/package-extension.py dog-wishes /tmp/dog-wishes-1.0.0.zip
```

只包含这个扩展目录，不包含核心、Git、个人路径、共享图片、共享音乐或玩家存档；未来包自己的新增素材可以放在包内。ZIP 按项目根目录布局，解压后检查 `catalog.js` 中的入口；已有入口无需重复添加。打包只写本地文件，不上传、不发布。玩家首次从 `v1.0.0` 升到支持扩展接口的本体时，仍需要一次本体更新，之后才能单独安装这种包。

当前没有自动下载器、浏览器缓存升级系统或二进制差分更新，也没有同时启用多个规则包的界面。每局保持“经典版或一个扩展版”的现有选择。新地图布局及全新机制仍可能需要本体补丁；这次没有把整个标准版引擎改造成通用桌游引擎。

## 验证

```sh
npm test
npm run compare:refactor -- 1000 v1.0.0
```

对照脚本从本地 Git 标签提取参考代码到临时目录，不联网、不切换分支。使用 `Math.imul(seed,2654435761)`、种子 1…N；生产 AI / 不追求心愿 AI，各对比 N 局经典和 N 局心愿版，共 4N 组对局。

逐步比较两版 AI 行动、完整游戏状态、日志、随机流；每隔 37 次行动还把参考版本的实际存档交给新版继续执行。只忽略新增的扩展版本元数据，以及计分展示的 `featured` 标记；所有玩法字段、最终赢家、分数和账单文字都必须一致。结果写到 `artifacts/dlc-refactor-comparison.json`，任一差异立即报错。

测试另覆盖缺少包、错误版本、经典版无包完整对局，以及在不修改核心文件的临时安装中注册一个测试扩展。已有心愿测试继续覆盖历史 Yuki 条件和奖励、免费餐、牌堆耗尽与只领奖一次。
