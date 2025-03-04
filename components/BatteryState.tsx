import { Variable } from 'astal/variable';
import { Gtk } from '../lib/imports';
import Battery from 'gi://AstalBattery';
import AstalPowerProfiles from 'gi://AstalPowerProfiles?version=0.1';


export const powerprofile = AstalPowerProfiles.get_default();
export const battery = Battery.get_default ();

function calcPercentage () {
    return Math.round(battery.percentage * 100);
}


function iconByState (): string {
    const default_icons = ['battery_full', 'battery_6_bar', 'battery_5_bar', 'battery_4_bar', 'battery_3_bar', 'battery_2_bar', 'battery_1_bar', 'battery_alert'];
    const charging_icons = ['battery_charging_full', 'battery_charging_20', 'battery_charging_30', 'battery_charging_50', 'battery_charging_60', 'battery_charging_80', 'battery_charging_90', 'battery_full'];

    if (battery.charging) {
        const i = Math.floor(battery.percentage * (charging_icons.length-1));
        return charging_icons[i];
    }
    else {
        const i = Math.floor(battery.percentage * (default_icons.length-1));
        return default_icons[default_icons.length - i - 1];
    }
}

export const batteryPercentage = Variable (calcPercentage());
export const batteryState = Variable (iconByState());

battery.connect ('notify', () => {
    batteryPercentage.set(calcPercentage());
    batteryState.set(iconByState());
});


export default function getBatteryState (props : { percentage: boolean }) {
    return <box css="margin-left: -0.04rem;" className="icon-box" valign={Gtk.Align.CENTER}>
        <label className="icon-material" label={batteryState()} />
        {props.percentage ? <label label={batteryPercentage().as(n => `${n}%`)} /> : null}
    </box>;
}