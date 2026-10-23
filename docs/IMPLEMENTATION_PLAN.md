# 实施与验收

日期：2026-10-21。流程专用玩法已进入原型，不部署。交互动画及旋转演示见 [INTERACTION_FEEDBACK_PLAN.md](INTERACTION_FEEDBACK_PLAN.md)，最新双端页面及音效改进见 [DEVICE_AUDIO_VOICE_PLAN.md](DEVICE_AUDIO_VOICE_PLAN.md)。语音仅设计。

## 本轮实现

1. 删除即时游戏入口、单步按钮、模拟预览与落点影子。
2. 使用独立的 startFlow / stepFlow / pauseFlow / resumeFlow 管理执行、游标和收尾。
3. 左右受阻整步跳过，下移受阻终止，自然结束悬空固定，完成后清空并换块。
4. 库存按形状聚合显示数量，明确固定或自由排序。
5. 保留五个基础关，新增三个六至八块的进阶关。
6. PC 与手机独立页面及视图模块，设备入口自动分流；手机首屏操作、流程编辑抽屉及棋盘暂停按钮，PC 单列侧栏与右侧流程。

## 验收要点

- 选择形状立即改变初始形状显示；追加移动或旋转时不执行草稿动作，动作数与库存不变。点击落地自动运行。
- 运行前只校验指令格式，不能告知碰撞、落点或清场结果。
- 一条左/右指令途中受阻时完全不移动，其后步骤正常执行。
- 一条下移指令受阻时停在最后合法位置，剩余步骤不执行。
- 流程结束后方块可悬空固定，成为下一块的障碍，新方块只生成一次。
- 明确落地不能顺带固定刚出生的新方块。
- 两模式均自动清空完成的流程，暂停保留进度，继续不重放。
- 库存按形状显示 ×N，重复形状聚合，执行提交后才扣减。
- 固定队列不能改序，自由排序可以选择；未用完时不能因中途空盘通关。
- 自动下落仅在流程运行时生效，暂停与编排冻结。
- 八个关卡都有实际指令重放解，进阶关经过 UI 连续试玩。

## 检查命令

在项目目录执行：

```powershell
node --check prototype/engine.mjs
node --check prototype/app.js
node --check prototype/serve.mjs
node --test prototype/tests/engine.test.mjs prototype/tests/device-audio.test.mjs
```

浏览器测试需已启动预览服务、已有 Edge 与 Playwright：

```powershell
node prototype/tests/browser-smoke.mjs <path-to-playwright>
```

不安装新全局依赖，不修改系统、密钥、CI/CD 或数据库。真实语音、完整旋转规则和进阶计分不进入本轮改动。

