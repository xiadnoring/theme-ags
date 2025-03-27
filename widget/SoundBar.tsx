import { AstalIO } from "astal";
import { ags_settings_about_system } from "../components/settings/AboutSystem";
import { ags_settings_power_page } from "../components/settings/PowerSettingPage";
import { desktop } from "../lib/app";
import { Astal, Gdk, GLib, Gtk, Log, Variable, Widget } from "../lib/imports";
import { Mutex, tryAcquire } from "../modules/async-mutex";
import { ags_settings_sound_page } from "../components/settings/SoundSettingPage";
import { err_num } from "../lib/error";
import { ags_settings_wifi } from "../components/settings/WifiSettingPage";
import { ags_settings_cron_tab } from "../components/settings/CronTab";
import { ags_settings_apps } from "../components/settings/Apps";
import { before_delete } from "../lib/ondestroy";
import { iconVolumeState, soundVolume, soundVolumePercentage } from "../components/AudioVolumeState";
import { audio_device } from "../services/SoundVolume";

let monitors = new Set <string> ();

export async function AgsSoundBar (monitor: Gdk.Monitor) {
    const monitorid = desktop.gdkmonitor2id (monitor);
    
    try {
        if (monitors.has(monitorid)) {
            // unlock
            desktop.set_monitor_lock (monitor, false);
        }
        else {
            // lock
            desktop.set_monitor_lock (monitor, true);

            monitors.add(monitorid);
        }

        const bd = new before_delete ();

        bd.add (() => monitors.delete (monitorid));

        /** window */
        const window = <window className="bg-transparent" anchor={Astal.WindowAnchor.RIGHT|Astal.WindowAnchor.TOP} keymode={Astal.Keymode.ON_DEMAND} onDestroy={() => bd.call()} 
             name="sound-bar" gdkmonitor={monitor} application={desktop.App}>
            <box className="m-3 bg-widget rounded-4 sound-bar-osd border border-1 border-secondary">
                <label className="icon-material font-3 ps-3 py-2" label={iconVolumeState()} />
                <slider valign={Gtk.Align.CENTER} widthRequest={200} max={1.5} min={0} 
                    onDragged={(self) => audio_device.default_speaker().set_volume (self.value)} value={soundVolume()} />
                <label halign={Gtk.Align.CENTER} className="sound-bar-osd-percentage" label={soundVolumePercentage.as((n) => `${n}%`)} />
            </box>
        </window>;

        desktop.on_screen_block_close (monitor, () => {
            window.destroy();
        });
    }
    catch (e) {
        Log.exception (e);
    }

    return;
}