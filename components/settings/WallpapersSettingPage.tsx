import { readFile, readFileAsync } from "astal";
import { execAsync, GLib, Gtk, Log, Variable, Widget } from "../../lib/imports";
import { buildSettingParam } from "./SettingParam";
import { batteryPercentage, powerprofile } from "../BatteryState";
import { err_num } from "../../lib/error";
import Brightness from "../../lib/brightness";
import { soundVolume, soundVolumePercentage } from "../AudioVolumeState";
import { audio_device } from "../../services/SoundVolume";
import { FileChooserWindow } from "../../widget/FileChooser";
import { Gdk } from "../../lib/imports";
import { before_delete } from "../../lib/ondestroy";


async function build (gdkmonitor: Gdk.Monitor) {
    const bd = new before_delete();

    return <box className={"gap-v-4"} onDestroy={() => bd.call()} hexpand={true} vertical={true}>
        <centerbox hexpand={true}>
            <box></box>
            <box></box>
            <box halign={Gtk.Align.END}>
                <button label={"Choose..."} onClick={() => FileChooserWindow (gdkmonitor, { multiple: false }, () => {

                })}></button>
            </box>
        </centerbox>
    </box>;
}


export function ags_settings_wallpapers_page () {
    return {
        icon: 'picture-colored',
        name: 'Wallpapers',
        build
    };
}