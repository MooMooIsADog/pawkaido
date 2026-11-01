# 路线编译与接入验收

## 1. 沿最终图像描中心线

先看本地位图，再记录路面中心的像素点，按行走顺序排列。宽缓直段少放点，弯道和桥头多放点；必须描真实路面，不能拿提示词要求的坐标当成实际生成结果。原图宽高使用真实尺寸。

输入格式（四个 chapter，下面只展开一章字段）：

```json
{
  "imageSize": [1536, 1024],
  "chapters": [
    {"stopCount": 15, "controlPoints": [[1280, 180], [1000, 240], [600, 230], [220, 340], [600, 460], [1200, 600], [700, 760], [220, 870]]}
  ]
}
```

该片段展示结构；使用时提供四章，标准版 `stopCount` 依次为 15/14/15/14。坐标是像素，不是百分比。图像和当前渲染平面均为 3:2；其他比例需先改渲染契约，不能直接拉伸应付。

```sh
SKILL_DIR=.agents/skills/pawkaido-travel-maps
node "$SKILL_DIR/scripts/compile-routes.mjs" artifacts/my-route-maps-v1/road-centres.json dist/map-packs/my-route/geometry.js --reference-width 1000 --min-gap 70
```

输出目录先创建。脚本拒绝覆盖输出；迭代时先写 `geometry-v2.js` 并检查，再明确更新引用。它不自动选择地图包、不修改 catalog、不保存图片。

编译器沿用 `map.js/pathFor` 的 Catmull-Rom 转 cubic 公式，以每段 8 份采样计算长度，再选最接近等弧长的索引。输出模块默认导出四个 `{route,stops}`；把它们放入对应 `regions`。脚本报告原图上的道路长度和平均沿路距离，以及目标显示宽度下**任意两站的最小直线距离**。`--min-gap 70` 是东海岸桌面验收示例，按实际标签长度、狗狗尺寸和画布调整，不能照搬为所有窗口的可读性保证。

坐标越界、曲线采样越界、重复控制点、重复站点索引或输出已存在会报错。改输入后重跑，不通过删除检查解决。脚本不识别图中道路、不证明没有交叉、不检测建筑或文字遮挡。

## 2. 一条路的四种用途

当前渲染把百分比映射到 SVG `viewBox="0 0 1000 666.667"`：`x*10`、`y*6.66667`。地图背景、SVG、按钮在同一 3:2 平面。

- 全路线：`roadPath(leg,count)`。
- 按钮：`mapPoints` 返回 `route[stops[i]]`。
- 进度：`roadPath(leg,count,0,progress)`。
- 移动：`walk.js` 使用同一函数生成子路径，再 `getPointAtLength` 取位置。

不要先裁切 `route` 再调用拟合函数。端点附近的相邻点会改变控制点，造成动画离开画中道路；现有函数在完整点集上使用起止索引，避免这个问题。路线左右折返时沿用现有朝向切换，不强制狗狗一路向左。

道路画进背景后用 `paintedRoad:true`，矢量主路保持透明，仅叠加细引导/进度线；别铺一条厚白线遮住美术来伪装误差。如果线走出路面，先检查比例、点序、坐标归一化、转弯过冲，再修点。

## 3. 停靠点与标签

等弧长只是初始分配。看实际画面后可把站点索引向邻近路面移动，留出桥、建筑和彩蛋；保持索引严格递增、首末锚点和站点数量不变。一个地点从左向右行走是正常的，“向前”由编号决定，不是 x 坐标单调。

默认完整显示名称。放大节点/字号前先保证路线长度和间距。移动后的标签不能遮住邻站按钮；驿站还要容纳最多四只狗。标题框、地标文字、路线说明也有占用面积：东海岸第三章的末站曾与左下角说明冲突，窄屏标题也曾压住左侧弯道；修法是挪动说明和收缩标题信息，而非把地点名隐藏。

## 4. 验证顺序

1. **静态与规则**：校验包 schema、资源存在、15/14/15/14 站、首末索引、任意子路线 cubic 段与全路段相同。运行当前项目相关测试。新增包时更新“总共两个包”这类固定假设，不删测试。
2. **原图**：对旧原图使用既有校验脚本；对新归档运行 `artwork-manifest.py check`。哈希不得随修图更新旧值。
3. **视觉**：每章至少一张带真实节点和文字的截图；先桌面，再窄屏。逐幅查看路面吻合、水陆边界、地标、起终点、文字以及狗狗，不只检查 DOM。
4. **交互**：每章试走包含两个大弯的长路径；正常到站、左右动作、地图放大后的跟随、列表切回、减少动态效果。只改地图时无需改动画实现。
5. **应用状态**：旧日本局、当前主题局读档；缺失地图回退但不丢进度；地图与经典/心愿选择独立；新旅行预览换图后取消恢复原局；规则、事件、路书、收藏、终局文案无旧主题泄漏。只读介绍不应推进 AI。
6. **行为对照**：接入新表现层逻辑时，用相同 seed/edition 的状态，仅一份增加 `presentation`。逐步比较 `aiAction`、去除显示元数据后的状态、JSON 读档与最终分数；现有测试采用经典/心愿各 50 组。新增包需让该测试覆盖新 ID，不能只运行东海岸测试就声称新包已验证。
7. **打包**：先本地导出并核查 ZIP 条目、导入资源、尺寸；不自动发布。检查默认平台导出是否排除了可选地图，避免把“构建成功”误报成“包含所有 DLC”。

## DOM 辅助检查

在允许的浏览器工具中只读执行。下面返回名称/按钮/标题碰撞和溢出，不能代替视觉验收。测试页需使用游戏真实组件或等价 DOM 类；不要检查一个与游戏布局不同的漂亮 mockup。

```js
() => {
  const root = document.querySelector('.map-canvas');
  const stops = [...root.querySelectorAll('.stop')];
  const names = stops.map(s => s.querySelector('.stop-name'));
  const overlaps = (a,b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
  const collisions = [];
  for (let i=0;i<stops.length;i++) {
    const label = names[i].getBoundingClientRect();
    for (let j=0;j<stops.length;j++) if(i!==j) {
      if(overlaps(label,stops[j].getBoundingClientRect())) collisions.push(['label/button',i,j]);
      if(j>i && overlaps(label,names[j].getBoundingClientRect())) collisions.push(['label/label',i,j]);
    }
    const title = root.querySelector('.map-cartouche');
    if(title && overlaps(stops[i].getBoundingClientRect(),title.getBoundingClientRect())) collisions.push(['title/button',i]);
  }
  return {canvasWidth:root.clientWidth,visibleNames:names.filter(n=>getComputedStyle(n).display!=='none').length,
    pageWidth:document.documentElement.scrollWidth,viewport:innerWidth,collisions};
}
```

测试使用独立 localhost 端口/来源，不清空或覆盖用户正在使用的 localStorage。通过 UI 开新测试局；不要为方便用浏览器注入隐藏状态。可另建不读写存档的本地美术检查页，调用生产地图模块和 `walkOnMap`；该检查页不属于发布资源。

工具调用超时不必然意味着动画失败：重新观察按钮、状态文本和日志。不要反复点击或立即改动画时长。代码改变后重新加载非热更新页面。收尾恢复临时视口、关掉临时检查服务，保留用户的游戏服务。
