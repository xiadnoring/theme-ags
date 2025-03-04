import { desktop } from "../lib/app";
import { Gdk, Gtk, Widget } from "../lib/imports";
import { AgsSettingsWidget } from "../widget/Settings";

export function settingsToggleBarButton (monitor: Gdk.Monitor) {
    return <box valign={Gtk.Align.CENTER} halign={Gtk.Align.CENTER}>
        <button className="btn btn-icon" onClicked={(self) => {
            AgsSettingsWidget (monitor);
        }} label='settings' />
    </box>
}