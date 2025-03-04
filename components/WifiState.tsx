import AstalHyprland from "gi://AstalHyprland";
import { execAsync } from "astal/process";
import { GLib, Gtk, Log, Variable, Widget } from "../lib/imports";
import { active_internet_state, desktop, network } from "../lib/app";
import AstalNetwork from "gi://AstalNetwork";

export default function getWifiState () {
    
    const children: typeof Widget.Stack.prototype.children = [];

    const network_strength_states = ["wifi_1_bar", "wifi_2_bar", "wifi"];
    const network_states = ["wifi_off", "wifi_1_bar", "wifi_2_bar", "wifi", "wifi_password"];
    

    const wifi = network.get_wifi();
    
    if (wifi === null) { return null; }

    for (const state of network_states) {
        children.push(<box name={state} halign={Gtk.Align.CENTER}>
            <label className="icon-material" label={state}></label>
        </box>);
    }

    let unsubs: (() => void)[] = [];

    const stack = new Widget.Stack ({
        transition_type: Gtk.StackTransitionType.SLIDE_UP_DOWN,
        transition_duration: 200,
        children,
        className: "font-1-5",
        onDestroy: () => {
            for (const unsub of unsubs) {
                unsub();
            }
        }
    });

    const cb = (internet: AstalNetwork.Internet, enabled: boolean = wifi.get_enabled()) => {
        if (!enabled) {
            stack.shown = 'wifi_off';
            return;
        }

        switch (internet) {
            case AstalNetwork.Internet.CONNECTED:
                const strength = wifi.get_strength();
                if (strength == 0) {
                    stack.shown = 'wifi_off';
                    break;
                }
                const level = Math.round(strength / 100 * (network_strength_states.length - 1));
                stack.shown = network_strength_states[level];
            break;
            case AstalNetwork.Internet.CONNECTING:
                stack.shown = 'wifi_password';
            break;
            case AstalNetwork.Internet.DISCONNECTED:
                stack.shown = 'wifi_off';
            break;
        }
    };

    let rhs = wifi.connect ('state-changed', () => cb (wifi.get_internet()));
    unsubs.push(() => wifi.disconnect(rhs));
    unsubs.push(active_internet_state.subscribe (cb));

    return <box halign={Gtk.Align.CENTER}>
        {stack}
    </box>;
}