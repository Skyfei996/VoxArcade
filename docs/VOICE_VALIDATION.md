# 免费网页语音可行性验证

日期：2026-10-21。范围：老板授权独立验证；不改游戏规则，不接入付费服务，不配置系统权限或证书，不公开发布。

## 当前结论

本机 Edge 已验证真实麦克风采集和释放。官方 sherpa-onnx WebAssembly 模型已在浏览器完成中文合成口令的离线识别。英文长口令存在误识别；Android 微信、iPhone 微信及真人口令均未验收。

测试入口：[本地验证页](http://localhost:4173/voice-check.html)。游戏仍使用原入口，语音尚未接入游戏执行器。

## 验证依据与实现边界

- [getUserMedia 官方文档](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia)：安全上下文、授权和真实音轨是采集前提。
- [腾讯官方微信 H5 采集说明](https://web.sdk.qcloud.com/trtc/webrtc/doc/en/tutorial-06-info-faq.html)：微信存在标准采集路径，也存在内核、版本及权限差异。此处仅参考标准采集兼容信息，未接入腾讯云 SDK 或服务。
- [sherpa-onnx 官方 WebAssembly 方案](https://k2-fsa.github.io/sherpa/onnx/wasm/index.html)、[Paraformer small 官方模型说明](https://k2-fsa.github.io/sherpa/onnx/pretrained_models/offline-paraformer/paraformer-models.html)：固定版本官方运行时与模型在 Web Worker 中推理，无云端鉴权。
- 下载、体积、许可溯源和 SHA-256 见 [SOURCE.md](../prototype/voice-model/SOURCE.md)。只使用同一官方发行包中的 JS、WASM、模型，不混用不同版本接口。
- 逐字段对比官方包 `app-vad-asr.js` 与 `sherpa-onnx-asr.js`：`OfflineRecognizer`、`modelConfig.tokens=./tokens.txt`、`modelConfig.paraformer.model=./paraformer.onnx`、单线程、`createStream()`、`acceptWaveform(sampleRate, Float32Array)`、`decode(stream)`、`getResult(stream).text`、`stream.free()`。
- 与官方演示的有意差异：不在页面载入时申请权限；不保存或回放录音；优先 AudioWorklet，缺少该能力时才使用 ScriptProcessor；采集沿用设备采样率，识别器内部重采样；停止后才推理；推理放到 Worker 中；异常明确停止，不切换云服务。
- 页面与资源使用相对路径，可部署在 GitHub Pages 仓库子路径下。此次桌面实际运行时 `crossOriginIsolated=false`，未设置 COOP/COEP、未启用浏览器安全绕过参数。
- 页面首次载入既不申请麦克风，也不下载模型。用户主动加载模型后才下载本站资源；识别声音仅在当前页内存中暂存，完成后丢弃。真实测试只记录采样数量、时长、峰值及 RMS，不保存声音和转写。

## 已完成的测试与证据

环境：Windows 11 上已安装的 Edge 155.0.0.0，独立 Playwright 测试上下文，`http://localhost:4173/`。测试上下文授权麦克风，不修改用户日常浏览器资料或系统隐私配置。

| 测试 | 结果 | 能说明的范围 |
| --- | --- | --- |
| 真实设备采集，无 fake-device / fake-audio 参数 | 48,000 Hz，3.0 秒，71 次回调，145,408 个采样；最大 RMS 0.16933；停止后所有音轨 ended | 本机真实采集链路可用；不能据此判断内容是否为人声或识别准确率 |
| 中文合成口令，经浏览器麦克风测试输入进入同一采集链路 | “右移两格，顺时针旋转，落地提交。” → “右移两格顺时针旋转落地提交”；首轮推理 516 ms，后续检查 484 ms | 中文合成单样本通过；不是用户真实口音验收，也不是速度基准 |
| 离线推理 | 模型加载后将浏览器测试上下文置为离线，仍完成中文转写 | 当前加载完成后的识别无需远端服务；未实现跨刷新离线缓存 |
| 英文合成口令 | “Move right two cells. Rotate clockwise. Drop.” → “move right two sounds rotate clocwise job”；严格关键词断言失败 | 英文验收未通过，不能直接执行指令；未加入模糊匹配掩盖误识别 |
| 页面实际离开 | iframe 中启动采集后导航至 about:blank，原音轨全部 ended | pagehide 会释放采集；手机切应用仍需另验 |
| 8 秒上限 | 不手动停止，到时自动结束且全部音轨 ended | 避免测试页无限采集 |
| 权限拒绝、超时后才授权、取消后旧请求晚到、音频初始化失败、系统打断、Worklet 加载时停止 | 6 项单元测试通过 | 失败和并发路径不会遗留当前或迟到音轨 |
| 游戏引擎回归 | 27 项通过；包含八关解法 | 独立验证未改变游戏规则 |
| 网络请求 | 测试中只请求本站静态资源，无上传请求；无页面 JS 错误 | 此实现的测试路径无音频上传 |
| 手机宽度布局 | 390×844 桌面浏览器视口无横向溢出，截图已人工查看 | 只验证排版，不冒充微信真机 |

截图：[真实采集后的页面](../prototype/review/voice-check-physical.png)、[中文合成测试页面](../prototype/review/voice-check-synthetic.png)。截图不含真实录音或真实转写。

## 验证命令

```powershell
node --test prototype/tests/voice-check.test.mjs prototype/tests/engine.test.mjs
node --check prototype/voice-capture.mjs
node --check prototype/voice-check.mjs
node --check prototype/voice-worklet.js
node --check prototype/voice-recognizer-worker.js
node --check prototype/serve.mjs
node prototype/tests/voice-check.mjs <path-to-playwright> --physical
node prototype/tests/voice-check.mjs <path-to-playwright> --audio=<synthetic-zh-wav> --expect=右移两格,顺时针旋转,落地提交
```

测试中文 WAV 使用本机已安装的 Microsoft Huihui Desktop 合成，英文使用 Microsoft Zira Desktop；文件留在临时目录，不加入源码。浏览器测试包含严格识别内容断言，不为通过测试添加容错别名。英文同样可使用 `--expect=right,two,clockwise,drop` 重现当前失败。

## 微信验收前仍需完成

1. 提供手机可以访问的可信 HTTPS 测试地址。现有 LAN HTTP 地址无法替代。公开发布到 GitHub Pages 需按 AGENTS.md 红线单独确认，当前没有发布。
2. Android 微信、iPhone 微信分别测试实际授权、音量变化、真人中文口令、模型下载、锁屏/切应用与重新开启。不将系统浏览器结果推定为微信结果。
3. 现模型和运行时约 94.2 MB，初始化后的 WASM heap 为 512 MiB，另有浏览器及推理开销。必须测量目标手机能否稳定运行和加载耗时；不能把这版候选直接认定为正式移动端资源方案。
4. 英文长口令在该候选上未通过，需要独立评估更合适的英文模型或正式限定支持范围；不通过猜测纠错来执行动作。
5. 真机可用后再确认接入游戏的实施方案，沿用唯一指令校验器和流程执行器，另验整句原子接收、重复结果、迟到结果、固定顺序选形限制和提交只运行一次。
