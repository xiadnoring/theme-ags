import { desktop } from "../lib/app";
import { Astal, Gdk, GLib, Gtk, Log, Pango, Variable, Widget } from "../lib/imports";
import Notifd from "gi://AstalNotifd"
import { before_delete } from "../lib/ondestroy";
import { TextView } from "../lib/elements";
import { Scrollable } from "astal/gtk3/widget";
import { mergeClasses } from "../lib/styles";
import { isIcon } from "../lib/icons";
import fs from "../modules/fs";
import path from "../modules/path";


let monitors = new Set <string> ();
export const silent = Variable (Notifd.get_default().get_dont_disturb());

const time = (time: number, format = "%H:%M") => GLib.DateTime
    .new_from_unix_local(time)
    .format(format)!

function notification_appicon (appicon: string) {
    if (!appicon) { return; }
    const styles = 'min-width: 5rem; min-height: 5rem; background-size:cover; background-position: center;';
    const is_file = appicon.indexOf (path.sep) >= 0;
    if (is_file) {
        return new Widget.Box ({
            css: styles + `background-image: url(${JSON.stringify(appicon)});`,
            className: "rounded-2"
        });
    }

    if (!is_file && appicon) {
        return new Widget.Icon ({
            icon: appicon,
            css: styles,
            className: "rounded-2 font-9"
        });
    }

    return null;
}

function notification_datetime (datetime: number): string {
    return time(datetime);
}

function notification (n: {id: number, appname: string, summary: string, appicon: string, image: string, payload: string, datetime: number, soundfile: string, soundname: string, expire_timeout: number, actions: {id: string, label: string}[]}, parent: Widget.Box, obj: Notifd.Notification, v: Variable<boolean>) {

    const bd = new before_delete ();

    const data = <eventbox onDestroy={() => bd.call()} onClick={() => v.set(true)}>
        <box vertical={true} hexpand={true} className="bg-widget my-2 p-3 rounded-4 border border-1 border-secondary gap-h-2">
            <box hexpand={true} className="px-2 pb-1 border border-secondary" css="border-bottom-width: 2px;">
                <centerbox hexpand={true}>
                    <box>
                        <label className="text-secondary" ellipsize={Pango.EllipsizeMode.MIDDLE} label={n.appname || 'unname'}></label>
                    </box>
                    <box></box>
                    <box halign={Gtk.Align.END} className="gap-h-2">
                        <label className="font-0 text-secondary" label={notification_datetime(n.datetime)}></label>
                        <button className="btn btn-icon rounded-2 font-1 mb-1" label={'close'}
                            onClick={() => { obj.dismiss(); }}></button>
                    </box>
                </centerbox>
            </box>
            <box className="pt-2 gap-h-2">
                {notification_appicon(n.image||n.appicon)}
                <box orientation={Gtk.Orientation.VERTICAL} valign={Gtk.Align.CENTER}>
                    {new TextView ({
                        hexpand: true,
                        editable: false,
                        css: "background-color: rgba(0,0,0,0);",
                        wrap_mode: Gtk.WrapMode.WORD_CHAR,
                        buffer: new Gtk.TextBuffer ({
                            text: n.summary + '\n' + n.payload
                        }),
                        accepts_tab: false
                    })}
                </box>
            </box>
            <box hexpand={true} className="pt-2 gap-h-2">
                {n.actions.map ((action) => {
                    return action.label ? <button hexpand={true} className="btn" label={action.label} onClick={() => obj.invoke(action.id)}></button> : null
                })}
            </box>
        </box>
    </eventbox>;

    const resolved = () => { parent.remove(data); };
    parent.add (data);
    parent.reorder_child (data, 0);

    bd.add ((id: number) => obj.disconnect(id), obj.connect ('invoked', resolved));
    bd.add ((id: number) => obj.disconnect(id), obj.connect ('resolved', resolved));

}

function gtknotification (parent: Widget.Box, n: Notifd.Notification, v: Variable<boolean>) {
    notification ({
            id: n.get_id(),
            appname: n.get_app_name(),
            image: n.get_image(),
            appicon: n.get_app_icon() || n.get_desktop_entry(),
            payload: n.get_body(),
            datetime: n.get_time(),
            summary: n.get_summary(),
            soundfile: n.get_sound_file(),
            soundname: n.get_sound_name(),
            expire_timeout: n.get_expire_timeout(),
            actions: n.get_actions().map ((n) => { return { id: n.id, label: n.label }; })
        }, 
        parent, 
        n, 
        v
    );
}

function clear_notifications () {
    const notifd = Notifd.get_default();
    for (const n of notifd.get_notifications()) {
        n.dismiss();
    }
}

function silent_toggle () {
    const notifd = Notifd.get_default();
    notifd.set_dont_disturb(!silent.get());
    silent.set(notifd.get_dont_disturb());
}

function msg_no_notifications (prev_state: (()=>void)|null,parent: Widget.Box,v:Variable<boolean>) {
    const s = parent.get_children().length;
    if (s>1||(s==1&&prev_state===null)) {
        if (prev_state) { prev_state(); }
        return null;
    }

    if (prev_state!==null){
        return prev_state;
    }

    const box = new Widget.EventBox ({
        child: new Widget.Box ({
            className: "bg-widget border border-1 rounded-4 border-secondary p-4",
            hexpand: true,
            vertical: true,
            children: [
                new Widget.Label ({
                    hexpand: true,
                    className: "font-9 icon-material",
                    label: "notification_multiple"
                }),
                new Widget.Label ({
                    hexpand: true,
                    className: "font-1-5",
                    label: "no notifications"
                }),
            ]
        }),
        onClick: () => v.set(true)
    });
    parent.add (box);
    return () => { parent.remove(box); box.destroy(); };
}

function notifications () {
    let alsopressed = Variable(false);
    const notifd = Notifd.get_default();
    const bd = new before_delete ();

    const buttons = new Widget.Box ({
        className: "bg-widget p-3 gap-v-3 rounded-4 border border-1 border-secondary",
        css: "min-width: 25rem",
        children: [
            /** widget title */
            new Widget.Box ({
                children: [
                    new Widget.Label ({
                        hexpand: true,
                        halign: Gtk.Align.CENTER,
                        label: "Notifications",
                        className: "font-2 bold"
                    })
                ]
            }),
            /** buttons */
            new Widget.Box ({
                halign: Gtk.Align.CENTER,
                className: "gap-h-2",
                children: [
                    new Widget.Button ({
                        className: "btn btn-icon font-2",
                        label: "delete",
                        onClick: clear_notifications
                    }),

                    new Widget.Button ({
                        className: silent().as((n) => mergeClasses(`btn btn-icon font-2`, n?'btn-active':null)),
                        label: "notifications_off",
                        onClick: silent_toggle
                    })
                ]
            })
        ],
        orientation: Gtk.Orientation.VERTICAL
    });

    let nonotificationsblock: (()=>void)|null = null;
    const notifications = new Widget.Box ({
        children: [],
        orientation: Gtk.Orientation.VERTICAL,
        className: "bg-transparent"
    });

    const listn = notifd.get_notifications ();
    listn.sort((a, b): number => {
        const a1 = a.get_time(), b1 = b.get_time();
        if (a1==b1) { return 0; }
        if (a1>b1) { return 1; }
        return -1;
    });

    for (const n of listn) {
        gtknotification(notifications, n, alsopressed)
    }
    
    if (!listn.length) {
        /** empty notification list */
        nonotificationsblock = msg_no_notifications(nonotificationsblock, notifications, alsopressed);
    }

    bd.add ((id: number) => notifications.disconnect(id), notifications.connect('add', (self) => nonotificationsblock = msg_no_notifications(nonotificationsblock, self, alsopressed)));
    bd.add ((id: number) => notifications.disconnect(id), notifications.connect('remove', (self) => nonotificationsblock = msg_no_notifications(nonotificationsblock, self, alsopressed)));
    bd.add (() => nonotificationsblock&&nonotificationsblock());
    bd.add (
        (id: number) => { 
            notifd.disconnect (id); 
        }, 
        notifd.connect('notified', (_, id) => {
            const n = notifd.get_notification(id);
            gtknotification(notifications, n, alsopressed);
        })
    );



    return {
        alsopressed, 
        container: new Widget.Box ({
            onDestroy: () => bd.call(),
            className:"bg-transparent gap-v-3 me-3",
            orientation: Gtk.Orientation.VERTICAL,
            vexpand: true,
            children: [
                new Widget.EventBox ({
                    child: buttons,
                    onClick: () => alsopressed.set(true),
                }),
                new Scrollable ({
                    child: notifications,
                    vscroll: Gtk.PolicyType.EXTERNAL,
                    hscroll: Gtk.PolicyType.NEVER,
                    vexpand: true,
                })
            ]
        })
    };
}

/**
 * add notification widget to window
 * 
 * @param monitor monitor to add the notifications widget
 * @returns 
 */
export async function AgsNotificationsWidget (monitor: Gdk.Monitor) {
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

        let {alsopressed, container} = notifications();
        /** window */
        const window = <window className="bg-transparent" anchor={Astal.WindowAnchor.RIGHT|Astal.WindowAnchor.TOP|Astal.WindowAnchor.BOTTOM} keymode={Astal.Keymode.ON_DEMAND} onDestroy={() => { monitors.delete (monitorid); }} 
            vexpand={true} name="notifications" gdkmonitor={monitor} application={desktop.App}>
            <eventbox onClick={() => { !alsopressed.get() && desktop.set_monitor_lock (monitor, false); alsopressed.set(false);  }}>
                {container}
            </eventbox>
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