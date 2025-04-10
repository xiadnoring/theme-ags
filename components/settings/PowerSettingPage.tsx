import { readFile, readFileAsync } from "astal";
import { execAsync, GLib, Gtk, Log, Variable, Widget } from "../../lib/imports";
import { buildSettingParam } from "./SettingParam";
import { batteryPercentage, powerprofile } from "../BatteryState";
import { err_num } from "../../lib/error";
import Brightness from "../../lib/brightness";

const brightness = Brightness.get_default();

const powerprofile_metadata = {
    'performance': ['Perfomance', 'High performance and power usage'],
    'balanced': ['Balanced', 'Standard performance and power usage'],
    'power-saver': ['Power Saver', 'Reduced performance and power usage']
};

async function build () {
    const boxprops = new Widget.Box ({
        orientation: Gtk.Orientation.VERTICAL,
        hexpand: true,
        expand: true,
        className: "gap-v-2"
    });

    const destroy_cbs: (() => void)[] = [];

    const boxpropschildren: Gtk.Widget[] = [];
    
    if (powerprofile.get_profiles().length > 0) {
        // POWER PROFILE 
        Log.debug (`g_variant_get_string: assertion 'value != NULL' failed - bug from the 'powerprofile.get_profiles();'`);
        let mode = Variable (powerprofile.get_active_profile());
        
        let rhs = powerprofile.connect ('profile-released', (source, cookie) => {
            mode.set(powerprofile.get_active_profile());
        });

        destroy_cbs.push(() => powerprofile.disconnect (rhs));

        let data: {value: string, name: string, describe: string}[] = [];

        for (const profile of powerprofile.get_profiles()) {
            if (profile.profile in powerprofile_metadata) {
                const metadata = powerprofile_metadata[profile.profile as keyof typeof powerprofile_metadata];
                data.push({
                    value: profile.profile,
                    describe: metadata[1],
                    name: metadata[0]
                });
            }
            else {
                data.push({
                    value: profile.profile,
                    describe: 'no data',
                    name: profile.profile
                });
            }
        }

        data = data.reverse();
        
        boxpropschildren.push (buildSettingParam('battery_profile', 'Power Profile', 'Set Up Power Profile', mode, (value: string) => {
            for (const profile of powerprofile.get_profiles()) {
                if (profile.profile == value) {
                    powerprofile.set_active_profile (value);
                    return;
                }
            }
            
            Log.error (err_num.POWER_PROFILE_DOESNT_EXISTS, `${value} not exists in ${powerprofile.get_profiles ().map (n => n.profile).join (',')}`);
        }, data));
    }

    {
        // BATTERY STATUS
        boxpropschildren.push (buildSettingParam ('battery_charging_full', 'Battery Percentage', batteryPercentage().as((n) => `${n}%`)));
    }

    {
        // MONITOR BRIGHTNESS
        const vbrightness = Variable (brightness.screen);
        const rhs = brightness.connect ('notify', () => {
            if (vbrightness.get() == brightness.screen) {
                return;
            }
            
            vbrightness.set (brightness.screen);
        });
        destroy_cbs.push(() => brightness.disconnect (rhs));

        boxpropschildren.push (buildSettingParam ('settings_brightness', 'Monitor brightness', 'Brightness for all monitors', vbrightness, (v: number) => {
            if (vbrightness.get() == brightness.screen) {
                return;
            }

            vbrightness.set(v);
            brightness.screen = v;
        }, { max: 1, min: 0 }));
    }
    
    boxprops.children = (boxpropschildren);
    return <box onDestroy={() => {
        for (const cb of destroy_cbs) { cb(); }
    }} orientation={Gtk.Orientation.VERTICAL} hexpand={true} className={"gap-v-4"}>
        {boxprops} 
    </box>;
}


export function ags_settings_power_page () {
    return {
        icon: 'battery-colored',
        name: 'Battery',
        build
    };
}