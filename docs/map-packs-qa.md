# 美国东海岸地图接入验证

验证日期：2026-11-01。本地接入，未发布。

- Node.js 24.22.2：`node --test tests/*.test.mjs`，52 项全部通过。
- 100 组同种子完整对照对局（经典版 50 组、狗狗心愿 50 组）：逐步 AI 行为、除显示元数据外的状态、读档结果、最终计分相同。
- `engine.js`、`data.js`、`scores.js`、`extension-host.js`、`extensions/dog-wishes/` 相对当前 Git 版本无修改。
- 原图校验脚本验证四张 PNG 的 SHA-256 与锁定清单一致，四张均设置只读权限。
- 浏览器在隔离的 4185 端口测试四人同屏完整旅行：四章切换、农庄事件、沿路移动、三顿饭心愿、最终得分分解均可用；成就在账单最前。
- 四幅地图的路径逐幅对照画面校准；桌面与窄屏检查通过，窄屏无页面横向溢出。刷新恢复地图和旅程进度。
- 新旅行预览改选日本后取消，恢复美国地图和原进度。浏览器无 error/warn 日志。
- 本地独立地图 ZIP 2,366,972 字节。仅含运行用地图模块与 WebP 副本。
- AIWANNA 默认本体导出成功：30 个文件，3,076,490 字节，小于 3 MiB。系统 AAC 转换需要在沙箱外执行；本地游戏继续包含两套地图，平台默认导出仅含日本地图。

截图保存在 `artifacts/east-coast-gameplay-desktop.jpg`、`east-coast-chapter-2.jpg`、`east-coast-chapter-3.jpg`、`east-coast-chapter-4.jpg`、`east-coast-gameplay-mobile.jpg`、`east-coast-game-end.jpg`。

边界：音乐仍沿用现有曲目；原图中的艺术化地理压缩原样保留。地图包适用于本次加入地图接口的本体，不直接兼容旧 v1.0.0。
