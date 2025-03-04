import { desktop } from "../lib/app";
import { Gtk, Widget } from "../lib/imports";

export function changeWallpaperButton () {
    return <box valign={Gtk.Align.CENTER} halign={Gtk.Align.CENTER}>
        <button className="btn btn-icon" onClick={(self, event) => {
            desktop.random_wallpaper ();
        }} label='wallpaper' />
    </box>
}