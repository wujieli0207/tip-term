# TipTerm 终端内核重构进度总结

更新时间: 2026-02-05

## 已完成

### 架构与模块
- 新增 `src/terminal-core/` 作为终端核心目录, 将 xterm 相关逻辑从 `src/utils/terminalRegistry.ts` 迁移并重构为独立内核.
- 提供统一终端 API 入口 `src/terminal-core/api/terminalApi.ts` 供 UI 调用.
- 建立终端配置数据源 `src/stores/terminalConfigStore.ts`.

### 配置系统 (JSON + 热加载)
- 默认配置生成: `src/terminal-core/config/defaults.ts`.
- 配置 schema: `src/terminal-core/config/schema.ts`.
- 配置加载/合并/应用: `src/terminal-core/config/loader.ts`.
- 热加载监听: `src/terminal-core/config/watcher.ts`.
- 后端 watcher 实现: `src-tauri/src/config.rs` (notify).
- App 启动时加载配置, 并在主题切换时重载.
- 跨平台路径: `appConfigDir()/tipterm/config.json`.
- 首次启动自动生成默认配置文件.
- 轻量校验 + 错误提示 (console + 通知).

### I/O 性能优化
- 后端 PTY 输出批处理 (16ms/200KB -> 已优化为 4ms/64KB 并对小输出直发): `src-tauri/src/main.rs`.
- 前端输出批处理 + 小输出直写: `src/terminal-core/session/ioBatcher.ts`.

### xterm 功能对齐 (Phase 1 已落地)
- Renderer: WebGL -> Canvas -> DOM fallback.
- Unicode11Addon.
- SerializeAddon.
- LigaturesAddon (WebGL 禁用).
- ImageAddon (sixel/iTerm2).
- WebLinksAddon + 激活键.
- SearchAddon + 结果计数/全词/正则 UI.
- 光标样式/颜色/闪烁.
- 主题 16 色, selection 背景.
- scrollback.
- 透明背景支持.
- fontWeight/fontWeightBold/letterSpacing/padding.
- screenReaderMode.
- quickEdit/copyOnSelect.
- bell: sound/visual/both.

### UI 侧对接
- 入口切换为 `terminal-core` API:
  - `src/components/XTerminal.tsx`
  - `src/components/terminal/TerminalContainer.tsx`
  - `src/components/terminal/TerminalSearch.tsx`
  - `src/App.tsx`
- 删除 `src/utils/terminalRegistry.ts` (已迁移).

### Terminal 设置面板
- `TerminalSection` 已落地完整配置 UI.
- UI 与配置文件双向同步, 修改即时生效并写回.

### 搜索 UI 细节
- 搜索相关快捷键加入 Hotkeys 系统, 可自定义.
- 搜索 UI 展示快捷键提示.
- 搜索结果显示当前/总数 (x/y).

### 渐进迁移收尾
- 移除旧逻辑引用, 清理 `settingsStore.terminal` 与相关 API.
- 终端配置仅由 `terminalConfigStore` 驱动.

## 待继续实现/完善

### 搜索 UI (可选)
- 更细粒度统计 (如匹配数量文本或更详细统计).

### 性能进一步验证
- 高频输出压测 (yes, 大文件 cat).
- 多分屏场景 FPS 稳定性.
- WebGL 关闭时 Canvas/DOM 是否仍满足性能要求.

## 重要文件索引

- 终端核心: `src/terminal-core/terminalRegistry.ts`
- 终端 API: `src/terminal-core/api/terminalApi.ts`
- 配置加载: `src/terminal-core/config/loader.ts`
- 配置 watcher: `src/terminal-core/config/watcher.ts`
- 后端 watcher: `src-tauri/src/config.rs`
- 后端批处理: `src-tauri/src/main.rs`

