import { desktop } from "../lib/app";
import AstalHyprland from "gi://AstalHyprland";
import { App, Astal, Gdk } from "../lib/imports";
import { err_num, log } from "../lib/error";

const hyprland = AstalHyprland.get_default();

export function monitorBlock (monitor: Gdk.Monitor) {
    const status = desktop.monitor_locks.get (desktop.gdkmonitor2id(monitor));
    if (status === undefined) {
        log.error (err_num.MONITOR_NOT_EXISTS, "monitorBlock(...): failed to find monitor to create a lock object");
        return;
    }
    return <window className="monitor-lock" anchor={Astal.WindowAnchor.BOTTOM | Astal.WindowAnchor.TOP | Astal.WindowAnchor.LEFT | Astal.WindowAnchor.RIGHT} gdkmonitor={monitor} application={App} expand={true} visible={status()}>
        <eventbox expand={true} onClick={() => {
            const status = desktop.monitor_locks.get (desktop.gdkmonitor2id(monitor));
            if (status === undefined) { return; }
            status.set (false);
        }}>
            <box expand={true}></box>
        </eventbox>
    </window>;
}