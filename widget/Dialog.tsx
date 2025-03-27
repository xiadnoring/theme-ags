import { desktop } from "../lib/app";
import { Astal, Gdk, GLib, Gtk, Log, Pango, Variable, Widget } from "../lib/imports";

let monitors = new Map <string, Map<number, Gtk.Widget>> ();

function flush_blank_window (monitorid: string) {
    const m = monitors.get(monitorid);
    if (m && m.size <= 1) {
        for (const [key, w] of m.entries()) {
            w.hide();
            w.destroy();
        }
        monitors.delete(monitorid);
    }
}

function next_id (m: Map<number, Gtk.Widget>) {
    return Math.max(...m.keys()) + 1;
}

function close_current_dialog (monitorid: string) {
    const m = monitors.get(monitorid);
    if (m && m.size) {
        let key = Math.max(...m.keys());
        const w = m.get(key);
        if (w) {
            w.hide();
            w.destroy();
        }
        m.delete(key);
    }
    flush_blank_window(monitorid);
}

function create_blank_window (monitorid: string, gdkmonitor: Gdk.Monitor) {
    if (!monitors.has(monitorid)) {
        const m : Map<number, Gtk.Widget> = new Map ();
        let id: number = 0;
        const blank = <window className="bg-transparent" application={desktop.App} exclusivity={Astal.Exclusivity.IGNORE} keymode={Astal.Keymode.ON_DEMAND} gdkmonitor={gdkmonitor} anchor={Astal.WindowAnchor.BOTTOM|Astal.WindowAnchor.LEFT|Astal.WindowAnchor.RIGHT|Astal.WindowAnchor.TOP}
            >
                <eventbox onClick={() => close_current_dialog(monitorid)}>
                    <box expand={true} ></box>
                </eventbox>
            </window>;
        
        if (m) {
            m.set(id++, blank);
        }

        monitors.set(monitorid, m);
    }
}

function close_all_dialogs (monitorid: string) {
    const m = monitors.get(monitorid);
    if (m) {
        for (const [key, w] of m) {
            w.hide();
            w.destroy();
        }
        m.clear();
    }
    monitors.delete (monitorid);
}

function close_dialog_by_id (monitorid: string, id: number) {
    const m = monitors.get(monitorid);
    if (m) {
        const w = m.get(id);
        if (w) {
            w.hide();
            w.destroy();
        }
        m.delete(id);
    }
    flush_blank_window(monitorid);
}

export function DialogWindow (gdkmonitor: Gdk.Monitor, callback: ((close: () => void) => Gtk.Widget)) {
    const monitorid = desktop.gdkmonitor2id (gdkmonitor);

    try {
        create_blank_window(monitorid, gdkmonitor);
        const m = monitors.get(monitorid);
        if (m) {
            let id = next_id(m);
            const content = callback (() => close_dialog_by_id (monitorid, id));
            m.set(id, <window className="bg-transparent" application={desktop.App} keymode={Astal.Keymode.ON_DEMAND} gdkmonitor={gdkmonitor}
                >
                {content}
            </window>);
        }

        desktop.on_screen_block_close (gdkmonitor, () => close_all_dialogs(monitorid));
    }
    catch (e) {
        if (e instanceof Error) {
            Log.exception (e, 'Failed to create DialogWindow(...)');
        }
    }
}
