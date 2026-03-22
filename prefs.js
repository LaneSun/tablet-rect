import Adw from "gi://Adw";
import Gtk from "gi://Gtk";
import Gdk from "gi://Gdk";
import GLib from "gi://GLib";

import {
  ExtensionPreferences,
  gettext as _,
} from "resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js";

export default class TabletRectPreferences extends ExtensionPreferences {
  fillPreferencesWindow(window) {
    const settings = this.getSettings(
      "org.gnome.shell.extensions.tablet-rect",
    );

    const page = new Adw.PreferencesPage({
      title: _("Settings"),
      icon_name: "preferences-system-symbolic",
    });
    window.add(page);

    // --- Actions ---
    const actionGroup = new Adw.PreferencesGroup({
      title: _("Actions"),
      description: _("Refresh mapped area from OpenTabletDriver config"),
    });
    page.add(actionGroup);

    const refreshRow = new Adw.ActionRow({
      title: _("Refresh Area"),
      subtitle: _("Re-read OpenTabletDriver config file"),
    });
    const refreshButton = new Gtk.Button({
      label: _("Refresh"),
      valign: Gtk.Align.CENTER,
      css_classes: ["suggested-action"],
    });
    refreshButton.connect("clicked", () => {
      const current = settings.get_int("refresh-trigger");
      settings.set_int("refresh-trigger", current + 1);
    });
    refreshRow.add_suffix(refreshButton);
    actionGroup.add(refreshRow);

    // --- Visibility ---
    const visibilityGroup = new Adw.PreferencesGroup({
      title: _("Visibility"),
      description: _("Control when the rectangle overlay is shown"),
    });
    page.add(visibilityGroup);

    // Show mode
    const showModeRow = new Adw.ComboRow({
      title: _("Show Mode"),
      subtitle: _("When to display the mapped area rectangle"),
      model: Gtk.StringList.new([_("Never"), _("Always"), _("On Focus")]),
    });
    showModeRow.set_selected(settings.get_enum("show-mode"));
    showModeRow.connect("notify::selected", () => {
      settings.set_enum("show-mode", showModeRow.get_selected());
    });
    visibilityGroup.add(showModeRow);

    // Fade duration
    const fadeDurationRow = new Adw.SpinRow({
      title: _("Fade Duration"),
      subtitle: _("Animation duration in milliseconds"),
      adjustment: new Gtk.Adjustment({
        lower: 0,
        upper: 2000,
        step_increment: 50,
        page_increment: 100,
      }),
    });
    fadeDurationRow.set_value(settings.get_int("fade-duration"));
    fadeDurationRow.connect("notify::value", () => {
      settings.set_int("fade-duration", fadeDurationRow.get_value());
    });
    visibilityGroup.add(fadeDurationRow);

    // WM class list
    const wmClassGroup = new Adw.PreferencesGroup({
      title: _("Focus Window Classes"),
      description: _(
        'WM_CLASS values that trigger display in "On Focus" mode (use `xprop WM_CLASS` to find)',
      ),
    });
    page.add(wmClassGroup);

    const currentClasses = settings.get_strv("focus-wm-classes");
    const wmClassRows = [];

    const addWmClassRow = (value) => {
      const row = new Adw.EntryRow({
        title: _("WM_CLASS"),
        text: value,
        show_apply_button: true,
      });
      const removeButton = new Gtk.Button({
        icon_name: "edit-delete-symbolic",
        valign: Gtk.Align.CENTER,
        css_classes: ["flat"],
      });
      removeButton.connect("clicked", () => {
        wmClassGroup.remove(row);
        const idx = wmClassRows.indexOf(row);
        if (idx >= 0) wmClassRows.splice(idx, 1);
        saveWmClasses();
      });
      row.add_suffix(removeButton);
      row.connect("apply", () => saveWmClasses());
      wmClassGroup.add(row);
      wmClassRows.push(row);
    };

    const saveWmClasses = () => {
      const classes = wmClassRows
        .map((r) => r.get_text().trim())
        .filter((s) => s.length > 0);
      settings.set_strv("focus-wm-classes", classes);
    };

    for (const cls of currentClasses) {
      addWmClassRow(cls);
    }

    const addRow = new Adw.ActionRow({
      title: _("Add WM_CLASS"),
    });
    const addButton = new Gtk.Button({
      icon_name: "list-add-symbolic",
      valign: Gtk.Align.CENTER,
      css_classes: ["flat"],
    });
    addButton.connect("clicked", () => {
      addWmClassRow("");
    });
    addRow.add_suffix(addButton);
    wmClassGroup.add(addRow);

    // --- Mapped Area ---
    const areaGroup = new Adw.PreferencesGroup({
      title: _("Mapped Area"),
      description: _(
        "OTD display mapping parameters (X/Y are center coordinates)",
      ),
    });
    page.add(areaGroup);

    const displayWidthRow = new Adw.SpinRow({
      title: _("Width (W)"),
      adjustment: new Gtk.Adjustment({
        lower: 0,
        upper: 10000,
        step_increment: 1,
        page_increment: 100,
      }),
      digits: 1,
    });
    displayWidthRow.set_value(settings.get_double("display-width"));
    displayWidthRow.connect("notify::value", () => {
      settings.set_double("display-width", displayWidthRow.get_value());
    });
    areaGroup.add(displayWidthRow);

    const displayHeightRow = new Adw.SpinRow({
      title: _("Height (H)"),
      adjustment: new Gtk.Adjustment({
        lower: 0,
        upper: 10000,
        step_increment: 1,
        page_increment: 100,
      }),
      digits: 1,
    });
    displayHeightRow.set_value(settings.get_double("display-height"));
    displayHeightRow.connect("notify::value", () => {
      settings.set_double("display-height", displayHeightRow.get_value());
    });
    areaGroup.add(displayHeightRow);

    const displayXRow = new Adw.SpinRow({
      title: _("Center X"),
      adjustment: new Gtk.Adjustment({
        lower: 0,
        upper: 10000,
        step_increment: 1,
        page_increment: 100,
      }),
      digits: 1,
    });
    displayXRow.set_value(settings.get_double("display-x"));
    displayXRow.connect("notify::value", () => {
      settings.set_double("display-x", displayXRow.get_value());
    });
    areaGroup.add(displayXRow);

    const displayYRow = new Adw.SpinRow({
      title: _("Center Y"),
      adjustment: new Gtk.Adjustment({
        lower: 0,
        upper: 10000,
        step_increment: 1,
        page_increment: 100,
      }),
      digits: 1,
    });
    displayYRow.set_value(settings.get_double("display-y"));
    displayYRow.connect("notify::value", () => {
      settings.set_double("display-y", displayYRow.get_value());
    });
    areaGroup.add(displayYRow);

    // --- Appearance ---
    const appearanceGroup = new Adw.PreferencesGroup({
      title: _("Appearance"),
      description: _("Configure the rectangle appearance"),
    });
    page.add(appearanceGroup);

    const borderWidthRow = new Adw.SpinRow({
      title: _("Border Width"),
      subtitle: _("Thickness of the border in pixels"),
      adjustment: new Gtk.Adjustment({
        lower: 1,
        upper: 10,
        step_increment: 1,
        page_increment: 2,
      }),
    });
    borderWidthRow.set_value(settings.get_int("border-width"));
    borderWidthRow.connect("notify::value", () => {
      settings.set_int("border-width", borderWidthRow.get_value());
    });
    appearanceGroup.add(borderWidthRow);

    const borderColorRow = new Adw.ActionRow({
      title: _("Border Color"),
    });
    const borderColorButton = new Gtk.ColorButton({
      valign: Gtk.Align.CENTER,
      use_alpha: false,
      rgba: this._arrayToRgba(
        settings.get_value("border-color").deep_unpack(),
      ),
    });
    borderColorButton.connect("color-set", () => {
      const rgba = borderColorButton.get_rgba();
      settings.set_value(
        "border-color",
        new GLib.Variant("ad", [rgba.red, rgba.green, rgba.blue]),
      );
    });
    borderColorRow.add_suffix(borderColorButton);
    appearanceGroup.add(borderColorRow);

    const borderAlphaRow = new Adw.ActionRow({
      title: _("Border Opacity"),
    });
    const borderAlphaScale = new Gtk.Scale({
      orientation: Gtk.Orientation.HORIZONTAL,
      valign: Gtk.Align.CENTER,
      hexpand: true,
      width_request: 200,
      adjustment: new Gtk.Adjustment({
        lower: 0.0,
        upper: 1.0,
        step_increment: 0.05,
        page_increment: 0.1,
      }),
    });
    borderAlphaScale.set_digits(2);
    borderAlphaScale.set_value(settings.get_double("border-alpha"));
    borderAlphaScale.connect("value-changed", () => {
      settings.set_double("border-alpha", borderAlphaScale.get_value());
    });
    borderAlphaRow.add_suffix(borderAlphaScale);
    appearanceGroup.add(borderAlphaRow);

    const borderRadiusRow = new Adw.SpinRow({
      title: _("Border Radius"),
      subtitle: _("Corner radius in pixels"),
      adjustment: new Gtk.Adjustment({
        lower: 0,
        upper: 100,
        step_increment: 1,
        page_increment: 5,
      }),
    });
    borderRadiusRow.set_value(settings.get_int("border-radius"));
    borderRadiusRow.connect("notify::value", () => {
      settings.set_int("border-radius", borderRadiusRow.get_value());
    });
    appearanceGroup.add(borderRadiusRow);

    const fillColorRow = new Adw.ActionRow({
      title: _("Fill Color"),
    });
    const fillColorButton = new Gtk.ColorButton({
      valign: Gtk.Align.CENTER,
      use_alpha: false,
      rgba: this._arrayToRgba(settings.get_value("fill-color").deep_unpack()),
    });
    fillColorButton.connect("color-set", () => {
      const rgba = fillColorButton.get_rgba();
      settings.set_value(
        "fill-color",
        new GLib.Variant("ad", [rgba.red, rgba.green, rgba.blue]),
      );
    });
    fillColorRow.add_suffix(fillColorButton);
    appearanceGroup.add(fillColorRow);

    const fillAlphaRow = new Adw.ActionRow({
      title: _("Fill Opacity"),
    });
    const fillAlphaScale = new Gtk.Scale({
      orientation: Gtk.Orientation.HORIZONTAL,
      valign: Gtk.Align.CENTER,
      hexpand: true,
      width_request: 200,
      adjustment: new Gtk.Adjustment({
        lower: 0.0,
        upper: 1.0,
        step_increment: 0.01,
        page_increment: 0.1,
      }),
    });
    fillAlphaScale.set_digits(2);
    fillAlphaScale.set_value(settings.get_double("fill-alpha"));
    fillAlphaScale.connect("value-changed", () => {
      settings.set_double("fill-alpha", fillAlphaScale.get_value());
    });
    fillAlphaRow.add_suffix(fillAlphaScale);
    appearanceGroup.add(fillAlphaRow);

    // --- Advanced ---
    const advancedGroup = new Adw.PreferencesGroup({
      title: _("Advanced"),
    });
    page.add(advancedGroup);

    const configPathRow = new Adw.EntryRow({
      title: _("OTD Config Path"),
      text: settings.get_string("config-path"),
      show_apply_button: true,
    });
    configPathRow.connect("apply", () => {
      settings.set_string("config-path", configPathRow.get_text());
    });
    advancedGroup.add(configPathRow);

    const resetRow = new Adw.ActionRow({
      title: _("Reset to Defaults"),
    });
    const resetButton = new Gtk.Button({
      label: _("Reset"),
      valign: Gtk.Align.CENTER,
      css_classes: ["destructive-action"],
    });
    resetButton.connect("clicked", () => {
      settings.set_int("border-width", 4);
      settings.set_value(
        "border-color",
        new GLib.Variant("ad", [1.0, 1.0, 1.0]),
      );
      settings.set_value(
        "fill-color",
        new GLib.Variant("ad", [1.0, 1.0, 1.0]),
      );
      settings.set_double("border-alpha", 0.05);
      settings.set_double("fill-alpha", 0.0);
      settings.set_int("border-radius", 20);
      settings.set_enum("show-mode", 1);
      settings.set_int("fade-duration", 200);
      settings.set_string("config-path", "");

      borderWidthRow.set_value(4);
      borderColorButton.set_rgba(this._arrayToRgba([1.0, 1.0, 1.0]));
      fillColorButton.set_rgba(this._arrayToRgba([1.0, 1.0, 1.0]));
      borderAlphaScale.set_value(0.05);
      fillAlphaScale.set_value(0.0);
      borderRadiusRow.set_value(20);
      showModeRow.set_selected(1);
      fadeDurationRow.set_value(200);
      configPathRow.set_text("");
    });
    resetRow.add_suffix(resetButton);
    advancedGroup.add(resetRow);
  }

  _arrayToRgba(colorArray) {
    const rgba = new Gdk.RGBA();
    rgba.red = colorArray[0];
    rgba.green = colorArray[1];
    rgba.blue = colorArray[2];
    rgba.alpha = 1.0;
    return rgba;
  }
}
