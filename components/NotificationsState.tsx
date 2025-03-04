import { desktop } from "../lib/app";
import { Astal, Gdk, Gtk, Variable, Widget } from "../lib/imports";
import { before_delete } from "../lib/ondestroy";
import { AgsNotificationsWidget, silent } from "../widget/Notifications";
import Notifd from "gi://AstalNotifd"

export function notificationsState (monitor: Gdk.Monitor) {
    const bd = new before_delete ();
    const nfd = Notifd.get_default();
    const cnt = Variable (0);

    function update () {
        cnt.set(nfd.get_notifications().length);
    }

    bd.add ((id: number) => { nfd.disconnect(id); }, nfd.connect ('notified', update));
    bd.add ((id: number) => { nfd.disconnect(id); }, nfd.connect ('resolved', update));

    update();

    return <eventbox onDestroy={() => bd.call()} onClick={(self, event) => {
        if (event.button == Astal.MouseButton.PRIMARY) {
            AgsNotificationsWidget (monitor);
        }
    }}>
        <box className="icon-box audio-volume-box me-2" valign={Gtk.Align.CENTER}>
            <label className="icon-material font-1-5" label={silent().as(n => n ? 'notifications_off' : 'notifications')} />
            <label label={cnt().as((v: number) => { const mv = Math.min(v, 99); return mv.toString() + (mv < v ? "+" : "")})}></label>
        </box>
    </eventbox>
}