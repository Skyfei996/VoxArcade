# VoxArcade · 声控街机

一款通过流程编排操作的方块游戏。选形后立即显示出生形状，动作加入草稿；点击“落地并提交”自动运行整份流程，也可用“结束并运行流程”在当前位置结束。

## 运行原型

在项目目录执行 `node prototype/serve.mjs`，访问 `http://localhost:4173/`。手机与电脑连接同一局域网后，用电脑 WLAN IPv4 地址替换 localhost。

Windows 已配置当前用户登录后自动在后台启动，入口为 `prototype/start-preview.ps1`，启动项为 Startup 目录中的 `VoxArcade Preview.lnk`。也可右键该脚本并使用 PowerShell 运行，重复启动会复用已有服务。

后续游戏修改均更新本项目 `prototype/` 源文件，固定在 `http://localhost:4173/` 验收。HTML、CSS 和游戏脚本保存后刷新即可；修改 `serve.mjs` 后需重启服务。此服务直接读取源文件，无需构建。

## GitHub Pages 与 Codex Cloud

GitHub 仓库：<https://github.com/Skyfei996/VoxArcade>。按钮版游戏已发布至 <https://skyfei996.github.io/VoxArcade/>。`.github/workflows/pages.yml` 只在 GitHub Actions 中手动运行，发布 `main` 分支的游戏文件；推送代码本身不会自动更新网站。Pages 的 Source 已设为 GitHub Actions；后续每次公开发布前按 `AGENTS.md` 单独取得授权。

发布包只包含游戏入口、PC/手机视图、规则、音效和旋转演示。语音验证页、模型、测试脚本、预览服务和评审截图不会成为公开站点内容。大型语音模型和评审截图也由 `.gitignore` 排除在首版仓库之外，本地文件保留。

本机 GitHub 认证已通过 Git Credential Manager 的设备授权完成，不把 token 放进聊天、文件或命令参数。Codex Cloud 尚需在 Work in → Cloud 中另行连接该 GitHub 仓库并创建环境；本机 Git 凭据不会自动同步到云端。云端环境使用本项目 `AGENTS.md`，运行 `node --test prototype/tests/engine.test.mjs prototype/tests/device-audio.test.mjs` 验证改动；审查云端提交或 PR 后再合并，公开发布仍手动触发。

入口自动识别设备，加载独立的 PC 或手机页面。PC 窄窗口仍保持 PC 视图；手机横屏沿用手机版。电脑浏览器按 F12 切换手机设备后刷新页面可查看手机版，也可访问 `http://localhost:4173/?view=mobile` 强制预览。两端共用游戏规则，分别提供布局及视图交互：PC 单列关卡/后续方块栏与大棋盘，手机首屏棋盘和操作区、可展开编辑的流程抽屉。暂存入口已隐藏。

默认打开第六关“七形拼图”。共有八关：五个基础关、三个六至八块的进阶关，分别采用自由排序和固定顺序。

## 当前规则

- 选形显示初始形状和直接下落影子；暂停按钮左侧可打开旋转预览，顺逆转按钮会临时转动棋盘上的方块，离开预览区后还原。草稿动作不提前执行，也不预演完整流程结果。PC 棋盘四边标出行列坐标。
- 选择格数并添加一次操作后，格数重置为 1。
- 一轮流程只操作一个方块；运行结束自动清空流程。
- 左右移动途中受阻则整步无效；接地时横移受阻，或下移实际受阻，才终止流程。刚好接地可横移，脱离障碍后可继续下移。
- 流程结束固定当前位置，悬空也保留为障碍，然后换下一块。
- 自由排序形状旁 ×N 表示剩余未用数量，包含当前待提交方块；固定顺序库存逐块排列。必须用完所有给定方块且棋盘为空才通关。
- 无尽支持手动和可调速度自动下落，编排时冻结，运行时才自动下降。
- 真实语音尚未接入；采用基础旋转与计分。公开站点只发布按钮版游戏，不包含语音验证页及模型。
- 落地连续下降，消行闪烁后上方行下移；当前步骤在方块旁显示。设置提供独立背景音乐/游戏音效开关，音效包含过关和失败。
- 设置 → 旋转演示：当前页面内弹窗，七种形状的空场、贴墙、障碍和受阻示例，支持顺逆转、逐步观看与重播。
- 网格按显示尺寸和屏幕像素密度绘制，音频增益为上一版的 2 倍；左右/下移、顺逆转、受阻、实际接地及悬空固定分别反馈。声音在对应事件发生时播放，不在渲染时重播。

## 文档

- [项目规范](AGENTS.md)
- [游戏设计](docs/GAME_DESIGN.md)
- [统一指令与运行规则](docs/COMMAND_SET.md)
- [八个关卡与解法](docs/LEVEL_DESIGN.md)
- [实施与验收](docs/IMPLEMENTATION_PLAN.md)
- [原型说明](prototype/README.md)
- [免费语音验证结果与微信验收范围](docs/VOICE_VALIDATION.md)
- [评审与验证记录](docs/PROTOTYPE_REVIEW.md)
- [交互、动画、声音与旋转演示方案](docs/INTERACTION_FEEDBACK_PLAN.md)
- [两端界面、音效与语音设计](docs/DEVICE_AUDIO_VOICE_PLAN.md)

