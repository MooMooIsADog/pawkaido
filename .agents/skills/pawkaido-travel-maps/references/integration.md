# 地图包接口与当前代码边界

以当前 checkout 为准。以下对应引入地图内容包后的 Pawkaido，本 skill 不适用于未经适配的旧 v1.0.0。

## 读哪些文件

| 文件 | 职责与注意点 |
|---|---|
| `dist/data.js` | `BOARD/INNS`、地点顺序/容量、卡牌/角色 ID；内容换皮不修改 |
| `dist/map-content.js` | 包加载、结构校验、活动地图、文案映射、缺失包回退 |
| `dist/map-packs/catalog.js` | 可选包安装列表；日本包单独内置 |
| `dist/map-packs/japan/index.js` | 旧图集裁切配置与旧地图 |
| `dist/map-packs/east-coast/index.js` | 四张独立图、密集路线、主题文案的已运行范例 |
| `dist/map.js` / `dist/walk.js` | 地图渲染、共享曲线、沿路动画 |
| `dist/app.js` / `dist/map.css` | 地图选择、标签、弹窗、存档元数据、主题样式 |
| `tests/map-content.test.mjs` | 包校验、道路子段、原图、旧存档、规则对照 |
| `scripts/package-map-pack.py` / `scripts/build-aiwanna.mjs` | 独立包与特定平台本体导出；检查固定列表和大小边界 |

## 完整配置，不只满足 validator

当前校验器只覆盖一部分字段。即使校验通过，缺少界面消费的字段也可能显示 `undefined` 或抛错；例如 `replacements` 没有映射时仍须提供 `{}`。

```js
import geometry from './geometry.js';
const pack = {
  id: 'my-route', version: '1.0.0',
  name: '地区名 · 旅程名', description: '地图选择卡上的短介绍',
  style: '画风名称', heading: '游戏主题标题', tagline: 'MooMoo 的旅行副标题',
  eyebrow: 'START → FINISH / FOUR PAIRS OF PAWS',
  cartouche: '地图小标题', caption: '符合该地图朝向的路线说明', seal: 'PAW<br>TRIP',
  paintedRoad: true,
  innNames: ['起点 · 小屋', '驿站一 · 小屋', '驿站二 · 小屋', '驿站三 · 小屋', '终点 · 小屋'],
  legNames: ['第一章', '第二章', '第三章', '第四章'],
  welcome: '汪！我是 MooMoo。这次我想带大家去……',
  storyNote: '这是压缩距离的旅行手账，不是现实导航地图。',
  regions: chapterContent.map((r, i) => ({
    name: r.name, sub: r.sub,
    // 路径相对于游戏文档根 dist/，不是相对于这个 JS 模块。
    image: `map-packs/my-route/assets/v1/${r.file}.webp`,
    imageSize: '100% 100%', imagePosition: 'center',
    landmarks: r.landmarks, // [['短地名', x百分比, y百分比], ...]
    route: geometry[i].route, stops: geometry[i].stops,
    story: {title: r.storyTitle, paragraphs: r.paragraphs}
  })),
  replacements: {}
};
export default pack;
```

`chapterContent` 是作者需要提供的四章实际内容，上面是结构示例，不是无需填写即可运行的模板。四段 `stops` 长度应从当前 `INNS` 推导；现为 15/14/15/14。索引严格递增，首末对应路线首末。地标标签不是可交互地点；不要按地标数量生成游戏站点。

将 `{id:'my-route',entry:'./my-route/index.js'}` **追加**到 catalog，不能覆盖其他已安装包。

## 必须处理的固定假设

- 当前 `tests/map-content.test.mjs` 断言包总数为 2。新增第三包时改成核验必需包 ID 的存在与唯一性，保留对所有包的循环验证；不能为通过测试删除原有断言覆盖。
- 当前主题色、画卷背景样式有 `body[data-map-pack="east-coast"]` 选择器。新地区按自己的 ID 添加局部样式，或做有明确用途的共享类；不要把所有地区强制套成美国颜色。
- `.painted-road` 大部分通用，但存在 `data-leg="3"` 的末站编号/狗狗位置微调，这是旧美国末站贴边形成的特例。新地图确认是否适用，不盲抄。
- 当前独立打包脚本的 `pack` 参数只允许 `east-coast`。新增包必须扩展白名单或泛化为经验证的包目录；只写一个新包命令而不改脚本不能完成交付。
- 当前平台导出默认只保留日本地图，清空可选 catalog。`--include-map-packs` 才尝试全部打包，并仍受 3 MiB 限制。按目标平台实时要求检查，不把某平台限制当作本地游戏限制。
- 音乐播放器在 `music.js/index.html`。当前地图包支持可选 `music:{src,title,description,durationSeconds}`，`src` 相对于游戏根目录；缺省用日本曲目。`app.js` 渲染时调用 `setTrack`，相同曲目不重启，保留音量；默认尝试播放，浏览器拦截时等待首次真实游戏交互；手动关闭会保存偏好并阻止切图或后续点击重新开启。音频应放入对应地图包，并计入打包体积。旧 checkout 可能没有此字段，接入前确认。

## 文案与状态

`replacements` 用于可见文本、`aria-label`、`title`，不修改规则数据和卡牌 ID。映射是按长键优先的单次替换；映射应互不再命中，避免同一文本被手动 `themeText` 后又经 `themeDOM` 重复翻译。完整驿站名称应先替换再截取短名，不能把旧地点名切碎以后期待映射成功。

检查：欢迎语、地图/路书、旅人能力、事件弹窗、手账、餐食/伴手礼、成就、心愿、终局九项账单与无障碍标签。MooMoo 讲自己用“我会……”，但其他狗的真实行动记录保留该狗名字，不把所有玩家混称为 MooMoo。

当前 `presentation.mapPack/mapVersion` 只是显示元数据：旧存档没有字段时用日本；包缺失时用日本显示、提示并保留原标记/进度。`mapVersion` **不锁定旧美术，也没有语义版本迁移机制**。同 ID 更新图像后旧局会看到新图，这是当前行为；玩法扩展的缺失/版本校验更严格，二者不要混用。

地图预览可以临时改变活动表现，但取消新旅行必须恢复当前存档地图，不写入新选择。存档不应因换图重抽能力、重置心愿或重新结算事件。

## 交付边界

运行资源留在仓库内，不引用生成工具私有缓存绝对路径。独立 ZIP 只含该包可用的模块与资源，检查导入的 `geometry.js` 也被带上；不要混入原图、旧运行副本、提示词、用户路径或凭据。安装包后需注册 catalog，目前没有自动下载/更新系统。

打包体积不合格时，优先调整运行副本或拆分地图 DLC；不能通过删除旧原图、降低规则完整性或绕过平台检查解决。是否发布由用户授权决定。
