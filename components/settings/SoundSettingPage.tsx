import { readFile, readFileAsync } from "astal";
import { execAsync, GLib, Gtk, Log, Variable, Widget } from "../../lib/imports";
import { buildSettingParam } from "./SettingParam";
import { batteryPercentage, powerprofile } from "../BatteryState";
import { err_num } from "../../lib/error";
import Brightness from "../../lib/brightness";
import { soundVolume, soundVolumePercentage } from "../AudioVolumeState";
import { audio_device } from "../../services/SoundVolume";


async function build () {
    const boxprops = new Widget.Box ({
        orientation: Gtk.Orientation.VERTICAL,
        hexpand: true,
        expand: true,
        className: "gap-v-2"
    });

    const destroy_cbs: (() => void)[] = [];

    const boxpropschildren: Gtk.Widget[] = [];
    
    {
        // SOUND PERCENTAGE
        boxpropschildren.push (buildSettingParam ('volume_down', 'Sound Percentage', soundVolumePercentage.as((n) => `${n}%`)));
    }

    {
        boxpropschildren.push (buildSettingParam ('sound_detection_loud_sound', 'Sound', 'System Sound', soundVolume, (v: number) => {
            audio_device.default_speaker().set_volume (v);
        }, { max: 1, min: 0 }));
    }
    
    boxprops.children = (boxpropschildren);
    return <box onDestroy={() => {
        for (const cb of destroy_cbs) { cb(); }
    }} orientation={Gtk.Orientation.VERTICAL} hexpand={true} className={"gap-v-4"}>
        {boxprops} 
    </box>;
}


export function ags_settings_sound_page () {
    return {
        icon: 'music-album-colored',
        name: 'Sound',
        build
    };
}