# Tablet Rect

A GNOME Shell extension that draws a semi-transparent rectangle overlay on screen to visualize the [OpenTabletDriver](https://opentabletdriver.net/) mapped display area.

![Screenshot](doc/screenshot.png)

## Features

- Reads display mapping (W, H, X, Y) from OpenTabletDriver config automatically
- One-click refresh from the panel menu or preferences
- Manual adjustment of the mapped area with bidirectional sync back to OTD config
- **Show modes**: Never / Always / On Focus (configurable WM_CLASS list)
- Fade in/out animation with configurable duration
- Customizable border color, opacity, width, corner radius, and fill
- i18n support (English, Simplified Chinese)

## Installation

1. Clone or copy this directory to `~/.local/share/gnome-shell/extensions/tablet-rect@lanesun.anlbrain.com/`
2. Compile the GSettings schema:
   ```bash
   glib-compile-schemas schemas/
   ```
3. Restart GNOME Shell (log out and back in on Wayland, or `Alt+F2` → `r` on X11)
4. Enable the extension:
   ```bash
   gnome-extensions enable tablet-rect@lanesun.anlbrain.com
   ```

## Usage

- Click the tablet icon in the top panel to access the menu
  - **Refresh from OTD** — reload the mapped area from OpenTabletDriver config
  - **Show Mode** — switch between Never / Always / On Focus
- Open extension preferences to adjust all settings

### Show Modes

| Mode | Behavior |
|------|----------|
| **Never** | Rectangle is always hidden |
| **Always** | Rectangle is always visible |
| **On Focus** | Rectangle appears only when a window matching the configured WM_CLASS list is focused |

Use `xprop WM_CLASS` to find the WM_CLASS of a window.

## Compatibility

- GNOME Shell 47 / 48 / 49
- OpenTabletDriver 0.6+

## License

Unlicense

---

# Tablet Rect（数位板映射区域）

一个 GNOME Shell 扩展，在屏幕上绘制半透明矩形框来显示 [OpenTabletDriver](https://opentabletdriver.net/) 的屏幕映射区域。

![截图](doc/screenshot.png)

## 功能

- 自动从 OpenTabletDriver 配置文件读取屏幕映射参数（W、H、X、Y）
- 在面板菜单或偏好设置中一键刷新
- 手动调整映射区域，双向同步回写 OTD 配置文件
- **显示模式**：从不 / 总是 / 聚焦时（可配置 WM_CLASS 列表）
- 淡入淡出动画，可配置动画时长
- 可自定义边框颜色、透明度、粗细、圆角和填充
- 多语言支持（英文、简体中文）

## 安装

1. 将本目录克隆或复制到 `~/.local/share/gnome-shell/extensions/tablet-rect@lanesun.anlbrain.com/`
2. 编译 GSettings schema：
   ```bash
   glib-compile-schemas schemas/
   ```
3. 重启 GNOME Shell（Wayland 下需注销重新登录，X11 下按 `Alt+F2` 输入 `r`）
4. 启用扩展：
   ```bash
   gnome-extensions enable tablet-rect@lanesun.anlbrain.com
   ```

## 使用方法

- 点击顶栏的数位板图标打开菜单
  - **从 OTD 刷新区域** — 重新读取 OpenTabletDriver 配置
  - **显示模式** — 在 从不 / 总是 / 聚焦时 之间切换
- 打开扩展偏好设置可调整所有参数

### 显示模式

| 模式 | 行为 |
|------|------|
| **从不** | 始终隐藏矩形框 |
| **总是** | 始终显示矩形框 |
| **聚焦时** | 仅当焦点窗口的 WM_CLASS 匹配配置列表时显示 |

使用 `xprop WM_CLASS` 可查看窗口的 WM_CLASS。

## 兼容性

- GNOME Shell 47 / 48 / 49
- OpenTabletDriver 0.6+

## 许可证

Unlicense
