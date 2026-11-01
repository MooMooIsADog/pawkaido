# 从真实旅行到可玩的插画

## 规划依据

每章至少记录：起终点、途中城镇、少量可辨认地标、地标参考来源、风景类型、光线/季节、道路走向、用户指定彩蛋。确认真实外形后再卡通化，例如金顶与白顶的区别、桥塔轮廓、宫殿与城堡屋顶的区别。风格一致不等于建筑可以互换。

章节是规则中的驿站之间，不要求和真实每日驾驶里程一致。可以压缩距离、迁移次要风景和留白，但不要无意暗示错误的地理关系：岛屿不能与岸边粘连，桥要跨水，倒影池不能看起来是河道，步道不能穿过建筑。MooMoo 的介绍应说明“旅行手账式压缩，不是导航地图”。

## 道路优先的构图

当前画布是 3:2；标准地图每章有 14–15 个可点击地点。先确定：

- 单一连续道路，没有岔路、闭环或交叉捷径；起终点有容纳驿站标签和四只狗的余地。
- 路线经过画布的大部分有效陆地。转弯是明显绕行，而不是围绕一条短对角线抖动。
- 两条相邻路段之间保留景观带和文字带；直线间距也要检查，不能只看沿路距离。
- 地标在道路之间成组摆放，不挡路；海面可以留在画面一侧作为景观，不必每块面积都放节点。
- 背景不绘制节点、数字、箭头、地名、按钮或狗狗。交互元素由游戏叠加，否则会出现两套错位的地点。

对角方向可用大 S 弯作为起点方案；不必所有地区都相同。东海岸案例的约束示例是：右上出发 → 向左横穿上部陆地 → 左侧大弯 → 向右横穿中部 → 右侧大弯 → 左下终点。用画面百分比描述宽弯和留白，比只说“蜿蜒”“向西南走”可靠。生成结果不会严格服从坐标，最终仍要描线校准。

## 提示词模板

按当前用户选择填入具体内容，不照搬美国地标或文学彩蛋。

```text
Asset: one full-bleed 3:2 illustrated map background for a dog travel board game.
Style: [agreed visual style, line work, palette, season and lighting].
Reference roles: [image 1 = style reference / edit target; image 2 = landmark reference].
Chapter: [start] → [intermediate places] → [destination].
Composition: [endpoint positions and broad route sweep].
Exactly one continuous unbranched walking trail across dry land or sensible bridges.
Use broad bends across usable land, not tiny wiggles on a short diagonal.
Leave generous open margins around the trail for 14–15 game stops and readable labels.
Landmarks: [identifying silhouettes, relative placement, invariant features].
Keep landmark clusters between road runs, clear of the trail.
No UI, nodes, numbers, arrows, text, tokens, dog characters or watermark.
Geographic distances are compressed for gameplay; preserve coherent land/water relationships.
```

跨章重复出现的城市/地标要保持外观连续。第一张可以先统一线条、轮廓、配色，再作为其余图的风格参考。不要把“风格参考”含糊写成“照着这张画”，否则容易复制无关地标和彩蛋。

## 修图的两种尺度

**局部修图**：错误建筑、肖像不够可辨认、水陆边界含糊。写出唯一目标和明确保留项。例如“只把大宅改成低红瓦屋顶、浅石墙、双层柱廊；保持道路走向和其他地标”。重新检查是否误改了道路。

**构图修图**：站点挤、路太短、大片陆地闲置。不要要求保留原来的道路位置。明确删除旧路、画一条新的宽弯路线，允许迁移中途景物；同时锁定起终点、主要地标身份、画风和彩蛋。检查有无旧路残影、两条路线或新增岔路。仅把弯曲矢量线画在旧直路图上，会让狗狗穿树林和楼房。

每轮看全图，再放大检查关键地标和彩蛋；把问题写成下一轮的具体改动。若已满足需求就停止，不为“再精致一点”无限生成。用户指定保留的原图即使有错误也不覆盖，修改版另存。

## 非破坏保存

生成工具返回的临时/默认输出先复制到项目的新版本目录，再引用。保存完整最终提示词、参考资料链接、实际工具和人工检查结论，不保存 token、账号配置或作者电脑的绝对路径到可分享文档。

新目录示例（`SKILL_DIR=.agents/skills/pawkaido-travel-maps`）：

```sh
python3 "$SKILL_DIR/scripts/artwork-manifest.py" seal artifacts/my-route-maps-v1 01.png 02.png 03.png 04.png
python3 "$SKILL_DIR/scripts/artwork-manifest.py" check artifacts/my-route-maps-v1
```

`seal` 只创建不存在的清单；已有清单用 `check`。它不会替换项目早先使用的 `ORIGINALS.sha256.json`，旧清单继续用其原校验脚本。文件只读不是异地备份。

运行素材单独压缩，例如在目标文件不存在时使用：

```sh
cwebp -q 86 -m 6 -metadata none artifacts/my-route-maps-v1/01.png -o dist/map-packs/my-route/assets/v1/01.webp
```

q86 是东海岸案例的起点，不是标准。根据边线、肖像、包体积选择参数，压缩后重新看图。无需把未使用的旧 WebP 都塞进当前 DLC，归档旧版用于回退即可。
