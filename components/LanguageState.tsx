import AstalHyprland from "gi://AstalHyprland";
import { exec, execAsync } from "astal/process";
import { GLib, Gtk, Widget } from "../lib/imports";
import { desktop } from "../lib/app";

const Hyprland = AstalHyprland.get_default();

export default function getLanguageState () {
    const languages: Set<string> = new Set ("US");

    function update_languages_gtk () {
        let children: Gtk.Widget[] = [];
        languages.forEach ((n) => children.push(<label name={n} label={desktop.config().as ((config) => config['keyboard_layout'] ? config['keyboard_layout'][n] ?? n : n)} />))
        stack.set_children (children);
    }

    const stack = new Widget.Stack ({
        transition_type: Gtk.StackTransitionType.SLIDE_UP_DOWN,
        transition_duration: 200,
        setup: (self) => self.hook (Hyprland, 'keyboard-layout', (source, keyboard: string, layout: string) => {
            if (!languages.has(layout)) { languages.add(layout); update_languages_gtk (); }
            self.shown = layout;
        })
    });

    let current = exec(['bash', '-c', `hyprctl devices -j | jq -r '.keyboards[] | select(.main == true) | .active_keymap'`]);
    if (!languages.has(current)) { languages.add(current); update_languages_gtk (); }
    stack.shown = current;

    return <box>
        {stack}
    </box>;
}