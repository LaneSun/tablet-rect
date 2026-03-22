import St from "gi://St";
import Clutter from "gi://Clutter";
import GLib from "gi://GLib";
import Gio from "gi://Gio";
import Cairo from "gi://cairo";
import GObject from "gi://GObject";

import { Extension } from "resource:///org/gnome/shell/extensions/extension.js";
import * as Main from "resource:///org/gnome/shell/ui/main.js";
import * as PanelMenu from "resource:///org/gnome/shell/ui/panelMenu.js";
import * as PopupMenu from "resource:///org/gnome/shell/ui/popupMenu.js";

const SHOW_NEVER = 0;
const SHOW_ALWAYS = 1;
const SHOW_FOCUS = 2;

// 不可拾取的容器层
const RectContainer = GObject.registerClass(
  { GTypeName: "TabletRectContainer" },
  class RectContainer extends Clutter.Actor {
    vfunc_pick(_pickContext) {}
  },
);

// 矩形绘图层
const RectLayer = GObject.registerClass(
  { GTypeName: "TabletRectLayer" },
  class RectLayer extends St.DrawingArea {
    _init(extension) {
      this._extension = extension;
      super._init({ reactive: false });
      this.set_track_hover(false);
      this.set_reactive(false);
      this.set_size(global.stage.width, global.stage.height);
    }

    vfunc_parent_set() {
      this.clear_constraints();
      const parent = this.get_parent();
      if (parent) {
        this.add_constraint(
          new Clutter.BindConstraint({
            coordinate: Clutter.BindCoordinate.SIZE,
            source: parent,
          }),
        );
      }
    }

    vfunc_pick(_pickContext) {}

    vfunc_repaint() {
      const cr = this.get_context();
      try {
        this._extension._onRepaint(cr);
      } catch (_) {}
      cr.$dispose();
    }
  },
);

export default class TabletRectExtension extends Extension {
  enable() {
    this._settings = this.getSettings();

    // 矩形区域（屏幕坐标）
    this._rect = null;
    this._shouldShow = false;

    this._loadSettings();
    this._loadOTDConfig();
    this._loadSettings(); // OTD 写入设置后重新读取以构建 _rect

    // 创建绘图层
    this._cont = new RectContainer({ opacity: 0 });
    this._layer = new RectLayer(this);

    this._cont.add_constraint(
      new Clutter.BindConstraint({
        coordinate: Clutter.BindCoordinate.SIZE,
        source: global.stage,
      }),
    );

    this._cont.add_child(this._layer);
    global.stage.add_child(this._cont);

    this._overviewShowingId = Main.overview.connect("showing", () => {
      global.stage.set_child_above_sibling(this._cont, null);
    });

    // 创建面板按钮
    this._indicator = new PanelMenu.Button(0.0, this.metadata.name, false);

    const icon = new St.Icon({
      icon_name: "input-tablet-symbolic",
      style_class: "system-status-icon",
    });
    this._indicator.add_child(icon);

    const _ = this.gettext.bind(this);

    // 菜单项：刷新配置
    const refreshItem = new PopupMenu.PopupMenuItem(_("Refresh from OTD"));
    refreshItem.connect("activate", () => {
      this._loadOTDConfig();
      this._layer.queue_repaint();
    });
    this._indicator.menu.addMenuItem(refreshItem);

    // 菜单项：显示模式子菜单
    this._modeSection = new PopupMenu.PopupSubMenuMenuItem(
      _("Show Mode"),
    );
    const modeLabels = [_("Never"), _("Always"), _("On Focus")];
    for (let i = 0; i < 3; i++) {
      const modeItem = new PopupMenu.PopupMenuItem(modeLabels[i]);
      const modeValue = i;
      modeItem.connect("activate", () => {
        this._settings.set_enum("show-mode", modeValue);
      });
      this._modeSection.menu.addMenuItem(modeItem);
    }
    this._indicator.menu.addMenuItem(this._modeSection);

    Main.panel.addToStatusArea(this.uuid, this._indicator);

    // 监听窗口焦点变化
    this._focusWindowId = global.display.connect(
      "notify::focus-window",
      () => this._updateVisibility(),
    );

    // 监听设置变化
    this._settingsConnections = [];
    const watch = (key, cb) => {
      this._settingsConnections.push(
        this._settings.connect(`changed::${key}`, cb),
      );
    };

    watch("border-width", () => this._reloadAndRepaint());
    watch("border-color", () => this._reloadAndRepaint());
    watch("fill-color", () => this._reloadAndRepaint());
    watch("border-alpha", () => this._reloadAndRepaint());
    watch("fill-alpha", () => this._reloadAndRepaint());
    watch("border-radius", () => this._reloadAndRepaint());
    watch("display-width", () => {
      this._reloadAndRepaint();
      this._saveOTDConfig();
    });
    watch("display-height", () => {
      this._reloadAndRepaint();
      this._saveOTDConfig();
    });
    watch("display-x", () => {
      this._reloadAndRepaint();
      this._saveOTDConfig();
    });
    watch("display-y", () => {
      this._reloadAndRepaint();
      this._saveOTDConfig();
    });
    watch("config-path", () => {
      this._loadSettings();
      this._loadOTDConfig();
      this._layer.queue_repaint();
    });
    watch("show-mode", () => {
      this._showMode = this._settings.get_enum("show-mode");
      this._updateVisibility();
    });
    watch("focus-wm-classes", () => {
      this._focusWmClasses = this._settings
        .get_strv("focus-wm-classes")
        .map((s) => s.toLowerCase());
      this._updateVisibility();
    });
    watch("fade-duration", () => {
      this._fadeDuration = this._settings.get_int("fade-duration");
    });
    watch("refresh-trigger", () => {
      this._loadOTDConfig();
      this._layer.queue_repaint();
    });

    // 初始可见性
    this._updateVisibility();
  }

  disable() {
    if (this._focusWindowId) {
      global.display.disconnect(this._focusWindowId);
      this._focusWindowId = null;
    }

    if (this._overviewShowingId) {
      Main.overview.disconnect(this._overviewShowingId);
      this._overviewShowingId = null;
    }

    if (this._layer) {
      this._cont.remove_child(this._layer);
      global.stage.remove_child(this._cont);
      this._layer.destroy();
      this._cont.destroy();
      this._layer = null;
      this._cont = null;
    }

    if (this._indicator) {
      this._indicator.destroy();
      this._indicator = null;
    }

    if (this._settingsConnections) {
      this._settingsConnections.forEach((id) =>
        this._settings.disconnect(id),
      );
      this._settingsConnections = null;
    }

    this._settings = null;
    this._rect = null;
  }

  _loadSettings() {
    this._borderWidth = this._settings.get_int("border-width");
    this._borderColor = this._settings.get_value("border-color").deep_unpack();
    this._fillColor = this._settings.get_value("fill-color").deep_unpack();
    this._borderAlpha = this._settings.get_double("border-alpha");
    this._fillAlpha = this._settings.get_double("fill-alpha");
    this._showMode = this._settings.get_enum("show-mode");
    this._focusWmClasses = this._settings
      .get_strv("focus-wm-classes")
      .map((s) => s.toLowerCase());
    this._fadeDuration = this._settings.get_int("fade-duration");
    this._configPath = this._settings.get_string("config-path");
    this._borderRadius = this._settings.get_int("border-radius");

    // 从设置中构建矩形（X/Y 为中心坐标）
    const dw = this._settings.get_double("display-width");
    const dh = this._settings.get_double("display-height");
    const dx = this._settings.get_double("display-x");
    const dy = this._settings.get_double("display-y");
    if (dw > 0 && dh > 0) {
      this._rect = {
        x: dx - dw / 2,
        y: dy - dh / 2,
        width: dw,
        height: dh,
      };
    } else {
      this._rect = null;
    }
  }

  _updateVisibility() {
    let shouldShow = false;

    switch (this._showMode) {
      case SHOW_NEVER:
        shouldShow = false;
        break;
      case SHOW_ALWAYS:
        shouldShow = true;
        break;
      case SHOW_FOCUS:
        shouldShow = this._isFocusMatched();
        break;
    }

    if (this._shouldShow === shouldShow) return;
    this._shouldShow = shouldShow;

    this._cont.remove_all_transitions();
    this._cont.ease({
      opacity: shouldShow ? 255 : 0,
      duration: this._fadeDuration,
      mode: Clutter.AnimationMode.EASE_IN_OUT_QUAD,
    });
  }

  _isFocusMatched() {
    const focusWindow = global.display.focus_window;
    if (!focusWindow) return false;

    const wmClass = (focusWindow.get_wm_class() || "").toLowerCase();
    const wmClassInstance = (
      focusWindow.get_wm_class_instance() || ""
    ).toLowerCase();

    return this._focusWmClasses.some(
      (cls) => cls === wmClass || cls === wmClassInstance,
    );
  }

  _reloadAndRepaint() {
    this._loadSettings();
    this._layer?.queue_repaint();
  }

  _loadOTDConfig() {
    try {
      let configPath = this._configPath;
      if (!configPath) {
        configPath = GLib.build_filenamev([
          GLib.get_home_dir(),
          ".config",
          "OpenTabletDriver",
          "settings.json",
        ]);
      }

      const file = Gio.File.new_for_path(configPath);
      const [ok, contents] = file.load_contents(null);
      if (!ok) return;

      const decoder = new TextDecoder("utf-8");
      const json = JSON.parse(decoder.decode(contents));

      // 读取第一个 Profile 的 Display 区域
      const display = json?.Profiles?.[0]?.AbsoluteModeSettings?.Display;
      if (!display) return;

      // 写入设置（X/Y 为中心坐标，与 OTD 一致），标记来源避免回写循环
      this._loadingFromOTD = true;
      this._settings.set_double("display-width", display.Width);
      this._settings.set_double("display-height", display.Height);
      this._settings.set_double("display-x", display.X);
      this._settings.set_double("display-y", display.Y);
      this._loadingFromOTD = false;
    } catch (e) {
      log(`[TabletRect] Failed to load OTD config: ${e.message}`);
      this._rect = null;
    }
  }

  _saveOTDConfig() {
    if (this._loadingFromOTD) return;

    try {
      let configPath = this._configPath;
      if (!configPath) {
        configPath = GLib.build_filenamev([
          GLib.get_home_dir(),
          ".config",
          "OpenTabletDriver",
          "settings.json",
        ]);
      }

      const file = Gio.File.new_for_path(configPath);
      const [ok, contents] = file.load_contents(null);
      if (!ok) return;

      const decoder = new TextDecoder("utf-8");
      const json = JSON.parse(decoder.decode(contents));

      const display = json?.Profiles?.[0]?.AbsoluteModeSettings?.Display;
      if (!display) return;

      display.Width = this._settings.get_double("display-width");
      display.Height = this._settings.get_double("display-height");
      display.X = this._settings.get_double("display-x");
      display.Y = this._settings.get_double("display-y");

      const encoder = new TextEncoder();
      const output = encoder.encode(JSON.stringify(json, null, "  "));
      file.replace_contents(
        output,
        null,
        false,
        Gio.FileCreateFlags.REPLACE_DESTINATION,
        null,
      );
    } catch (e) {
      log(`[TabletRect] Failed to save OTD config: ${e.message}`);
    }
  }

  /**
   * @param {Cairo.Context} cr
   */
  _onRepaint(cr) {
    if (!this._rect) return;

    const { x, y, width, height } = this._rect;
    const bw = this._borderWidth;

    const r = this._borderRadius;

    // 绘制填充
    if (this._fillAlpha > 0) {
      cr.setSourceRGBA(
        this._fillColor[0],
        this._fillColor[1],
        this._fillColor[2],
        this._fillAlpha,
      );
      this._roundedRect(cr, x, y, width, height, r);
      cr.fill();
    }

    // 绘制边框
    if (this._borderAlpha > 0) {
      cr.setLineWidth(bw);
      cr.setSourceRGBA(
        this._borderColor[0],
        this._borderColor[1],
        this._borderColor[2],
        this._borderAlpha,
      );
      const half = bw / 2;
      this._roundedRect(cr, x + half, y + half, width - bw, height - bw, r);
      cr.stroke();
    }
  }

  _roundedRect(cr, x, y, w, h, r) {
    cr.newPath();
    cr.arc(x + w - r, y + r, r, -Math.PI / 2, 0);
    cr.arc(x + w - r, y + h - r, r, 0, Math.PI / 2);
    cr.arc(x + r, y + h - r, r, Math.PI / 2, Math.PI);
    cr.arc(x + r, y + r, r, Math.PI, (3 * Math.PI) / 2);
    cr.closePath();
  }
}
