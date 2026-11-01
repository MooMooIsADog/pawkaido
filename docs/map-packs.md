# 地图内容包

地图与玩法独立：开局选择「日本 · 东海道」或「美国 · 东海岸漫游」，再选择经典版或狗狗心愿。日本地图是旧存档的默认显示。两套地图共用 55 个地点、同样的类型/容量/顺序、14/27/41/54 号必停驿站、AI、计分与心愿条件。

## 路径与边界

- `dist/map-packs/east-coast/`：美国地图的独立内容包，含 `index.js` 配置和四张 WebP。
- `dist/map-packs/japan/`：从原有 `map.js` 提取的日本地图、坐标和介绍。
- `dist/map-packs/catalog.js`：安装列表。增加地图只需添加目录并注册入口。
- `dist/map-content.js`：加载、结构校验、地图选择、可见文案主题化。它不注册规则事件，不改变核心卡牌数据。
- `dist/map.js`、`dist/walk.js`：静态地图与狗狗行走共享密集路线；站点是路线上的索引，跨站路径使用完整曲线相同的控制点。
- `dist/app.js`：保存地图选择并显示地图、路书、规则、事件、收藏和终局说明。`presentation.mapPack/mapVersion` 只是显示信息，游戏引擎原样携带；没有旧字段的存档使用日本地图。缺失地图包时用日本背景显示原进度，并提示；不丢弃或重写原地图标记。

`engine.js`、`data.js`、`scores.js` 和狗狗心愿规则不因地图包变化。地点、餐食、角色能力等仅在显示时替换主题名称，ID、价格、分数与存档卡牌保持原样。地图包可选 `music:{src,title,description,durationSeconds}`，路径相对于游戏根目录；未配置时使用原日本曲目。东海岸包 1.2.0 已包含两分钟原创合成试听曲。音乐默认开启，浏览器拦截时等待首次游戏点击；开启时随地图切换，关闭偏好和音量独立保存。

## 原图保护

当前东海岸包沿用 1.1.0 的弯道修订版，位于 `artifacts/east-coast-maps-v2/`，运行副本位于 `dist/map-packs/east-coast/assets/v2/`。v1 原图仍原样保存；修订没有改变站点顺序和存档 ID。v2 的路线、提示词和排版验证随该目录归档。

四张原图永久保存在 `artifacts/east-coast-maps-v1/`。它们是用户要求保留的原始版本，文件设为只读；`AGENTS.md` 禁止覆盖，`ORIGINALS.sha256.json` 锁定原始字节。将来修图只能在新的版本目录中进行。

```sh
node scripts/check-map-originals.mjs
```

游戏的 WebP 是由原图生成的独立副本；打包发布只使用副本，不包含原图归档和生成提示词。原图已知的艺术化地理压缩保留，未擅自重画。

## 新增地图

每包导出 `id/version/name`、5 个 `innNames`、4 个 `legNames` 与 4 个 `regions`。区域包含图片路径、图片裁切参数、地标、MooMoo 第一人称介绍、百分比坐标 `route` 和 `stops` 索引。四段必须分别对应 15/14/15/14 个站点，起止索引必须覆盖完整路线。`replacements` 只映射可见文案，不应用到 HTML 源码、ID 或游戏状态。

完整地图模块动态加载失败不会阻止日本地图启动；格式错误的包不注册。新图需要与当前支持地图包的本体版本搭配，不能直接装到尚无地图接口的 v1.0.0。

## 本地独立打包

```sh
python3 scripts/package-map-pack.py east-coast /tmp/pawkaido-east-coast-v1.zip
```

脚本仅打包该地图目录，拒绝覆盖已有 ZIP。解压至兼容本体的 `dist/map-packs/`，在 `catalog.js` 注册 `{id:'east-coast',entry:'./east-coast/index.js'}`。这是本地安装机制，不含自动下载或在线更新服务。

## 验证

`npm test` 包含原图哈希、资源存在、站点/子路线一致性、旧存档与缺失包回退、文案映射、100 组完整同种子经典/心愿对局比较。地图元数据不能改变任意一步 AI 行动、规则状态或最终分数。

## 3 MiB 平台导出

AIWANNA 原有本体导出已接近 3 MiB，四张地图运行副本另约 2.4 MB，新配乐再增加约 1.8 MB。因此 `npm run build:aiwanna` 默认只导出日本地图本体（在产物中清空可选地图 catalog），不动本地游戏和 DLC。地图包用上面的 ZIP 命令独立交付。`npm run build:aiwanna -- --include-map-packs` 可尝试合并导出，但仍严格检查平台 3 MiB 上限；当前整包会超过限制，不可上传该平台。未执行任何在线发布。
