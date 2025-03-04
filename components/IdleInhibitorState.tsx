import AstalHyprland from "gi://AstalHyprland";
import { execAsync } from "astal/process";
import { GLib, Gtk, Widget } from "../lib/imports";
import { desktop } from "../lib/app";
import { Variable } from "astal/variable";

const coffeeStatus = Variable ("enabled");

export default function getIdleInhibitorState () {
    coffeeStatus.set (desktop.status_coffee() ? "enabled" : "disabled");
    
    return <eventbox onClick={() => {
        const status = coffeeStatus().get();
        
        if (status == "enabled") {
            desktop.disable_coffee();
            coffeeStatus.set("disabled");
        }
        else {
            desktop.enable_coffee();
            coffeeStatus.set("enabled");
        }

    }} onScroll={(self, event) => {
        if (event.delta_y > 0) {
            const status = "enabled";
            if (coffeeStatus().get() == status) { return; }
            desktop.enable_coffee ();
            coffeeStatus.set (status);
        }
        else {
            const status = "disabled";
            if (coffeeStatus().get() == status) { return; }
            desktop.disable_coffee ();
            coffeeStatus.set (status);
        }
    }}>
        <stack visibleChildName={coffeeStatus()} transitionType={Gtk.StackTransitionType.SLIDE_UP_DOWN} transitionDuration={200}>
            <box name="enabled"  valign={Gtk.Align.CENTER}  halign={Gtk.Align.CENTER} className="gap-h-2 mx-2">
                <icon icon="mug-hot-symbolic" className="bottom-2" ></icon>
                <label className="font-0" label="ON" />
            </box>
            <box name="disabled" valign={Gtk.Align.CENTER} halign={Gtk.Align.CENTER} className="gap-h-2 mx-2">
                <icon icon="mug-hot-symbolic" className="bottom-2" ></icon>
                <label className="font-0" label="OFF" />
            </box>
        </stack>
    </eventbox>;
}