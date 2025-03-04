import Astal from "gi://Astal?version=3.0";
import { desktop } from "../lib/app";
import { App, execAsync, Gdk, GLib, Gtk, Log, Pango, Variable, Widget } from "../lib/imports";
import { GtkGrid, GtkMenu, GtkMenuItem, TextView } from "../lib/elements";
import { AppList, build_app_icon } from "../components/AppList";
import { err_num } from "../lib/error";

type pinned_apps_item_t = {id: string, name: string, icon: string, exec: string};
type pinned_apps_t = Variable<pinned_apps_item_t[]>;

const PINNED_ROW = 4;
const PINNED_COLUMN = 6;

function build_pinned_apps_popup_menu (unpin_cb: () => void) {
    const menu = new GtkMenu({
        
    });

    const unpin_btn = new GtkMenuItem ({
        label: "Unpin App",
        onButtonReleaseEvent: (self, event) => {
            if (event.get_button()[1] == 1) {
                // Primary Button
                unpin_cb();
            }
        }
    });

    menu.insert(unpin_btn, 0);

    return menu;
}

function get_pinned_apps (monitor: Gdk.Monitor, pinned_apps: pinned_apps_t, refetch: () => void) {
    const destroy_cbs: (()=>void)[] = [];
    const list = new GtkGrid ({
        className: "pinned-apps-content",
        name: "overview",
    });
    let current_app: pinned_apps_item_t|null = null;


    // Fill
    for (let i = 0; i < PINNED_ROW; i++) {
        list.insert_row (i * PINNED_COLUMN);

        for (let j = 0; j < PINNED_COLUMN; j++) {
            list.insert_column (i * j);
        }
    }

    // Stack
    const stack = new Widget.Stack({
        children: [
            <box name="empty" className="pinned-apps-content" vexpand={true} halign={Gtk.Align.CENTER} valign={Gtk.Align.CENTER}>
                <box className="pinned-apps-error-alert gap-h-2">
                    <icon icon="thumbtack-slash-symbolic" className="icon-2"></icon>
                    <label className="font-3" label="No pinned apps" />
                </box>
            </box>,
            list
        ],
        onDestroy: () => {
            for (const cb of destroy_cbs) {
                cb();
            }
        }
    });

    const menu = build_pinned_apps_popup_menu (() => {
        // Unpin callback
        if (current_app === null) { return; }
        const id = current_app.id;
        desktop.databases['menu-pinned'].remove ({id}, (err: Error|null) => {
            if (err !== null) {
                Log.error (err_num.DB_ERROR, `Failed to delete row ${id} from 'menu-pinned'`);
                return;
            }

            refetch();
        });
    });

    // Subscribe
    destroy_cbs.push(pinned_apps.subscribe ((n) => {
        if (n.length == 0) {
            stack.shown = 'empty';
        }
        else {
            stack.shown = 'overview';

            // CLEAN UP
            for (let i = 0; i < PINNED_ROW; i++) {
                for (let j = 0; j < PINNED_COLUMN; j++) {
                    list.get_child_at (j, i)?.destroy();
                }
            }

            // FILL
            for (let i = 0; i < n.length; i++) {
                const top = Math.floor(i / PINNED_COLUMN);
                const left = i - top * PINNED_COLUMN;
                const app = n[i];
                
                list.attach (<button onButtonPressEvent={(self, event) => {
                    if (event.get_button()[1] == 3) {
                        // Right Click
                        current_app = app;
                        menu.popup_at_pointer (event);
                    }
                }} onClicked={() => {
                    desktop.run_app (app.exec, app.name);
                    desktop.set_monitor_lock (monitor, false);
                }} className="app-btn">
                    <box valign={Gtk.Align.CENTER} halign={Gtk.Align.CENTER} orientation={Gtk.Orientation.VERTICAL}>
                        {build_app_icon(app.icon, { halign: Gtk.Align.CENTER })}
                        <box valign={Gtk.Align.END} orientation={Gtk.Orientation.VERTICAL}>
                            <label ellipsize={Pango.EllipsizeMode.END} className="font-1 font-weight-400" label={app.name} />
                        </box>
                    </box>
                </button>, left, top, 1, 1);
            }
        }
    }));

    destroy_cbs.push(() => {
        menu.destroy();
    }); 

    return stack;
}

function fetch_pinned_aps (page: number, count: number, pinned_apps: pinned_apps_t) {
    const start = (page - 1) * count;
    //@ts-ignore
    desktop.databases['menu-pinned'].find ({}, {'id': 1, 'name': 1, 'exec': 1, 'icon': 1}).skip(start).limit(count).exec((err: Error|null, data: pinned_apps_item_t[]) => {
        if (err !== null) {

            return;
        }

        pinned_apps.set (data);
    });
}

export function Menu (monitor: Gdk.Monitor) {
    let window_rhs: number[] = [];
    let textview_buffer_rhs: number[] = [];
    let page = 1;
    let count = PINNED_COLUMN * PINNED_ROW;

    const window_destroy_cb = (self: Widget.Window) => {
        window_rhs.map ((n) => self.disconnect (n));
    };

    const textview_destroy_cb = (self: Widget.Entry) => {
        textview_buffer_rhs.map ((n) => self.get_buffer().disconnect (n));
    };

    /** entry input */
    const textview = new Widget.Entry ({
        editable: true,
        name: "entry",
        placeholder_text: 'Search...',
        hexpand: true,
        primary_icon_name: 'magnifying-glass-symbolic',
        onDestroy: textview_destroy_cb,
    });

    /** close 'show all apps' */
    const show_all_apps_menu = new Widget.Box ({
        halign: Gtk.Align.END,
        name: "close",
        children: [
            new Widget.Button ({
                label: "Back",
                /** close menu */
                onClick: () => show_all_apps_toggle(false)
            })
        ]
    });

    /** stack menu */
    const stackmenu = new Widget.Stack ({
        children: [textview, show_all_apps_menu],
        shown: 'entry'
    });

    const applist = AppList(monitor, {});
    const pinned_apps: pinned_apps_t = Variable([]); 
    const search_apps_cb = (search: string) => {
        if (search.length == 0) {
            fetch_pinned_aps (page, count, pinned_apps);
            stack.shown = 'main';
            return;   
        }

        if (stack.shown != 'apps') {
            stack.shown = 'apps';
        }

        applist.search_cb (search);
    };

    const show_all_apps_toggle = (show: boolean) => {
        if (show) {
            stackmenu.shown = 'close';
            stack.shown = 'apps';

            applist.search_cb ('');
        }
        else {
            stackmenu.shown = 'entry';
            stack.shown = 'main';
        }
    };

    const appscontent = <box name="apps" border_width={0}>
        {applist.widget}
    </box>;

    const maincontent = <box name="main" orientation={Gtk.Orientation.VERTICAL}>
        <box className="pinned-apps gap-v-2 top-6" orientation={Gtk.Orientation.VERTICAL}>
            <centerbox>
                <box className="bold font-1">Pinned</box>
                <box></box>
                <box halign={Gtk.Align.END}>
                    <button onClick={() => show_all_apps_toggle(true)}>
                        <box className="gap-h-3">
                            <label label="All apps" />
                            <icon icon="chevron-right-symbolic"></icon>
                        </box>
                    </button>
                </box>
            </centerbox>
            {get_pinned_apps(monitor, pinned_apps, () => fetch_pinned_aps (page, count, pinned_apps))}
        </box>
        <box className="news gap-v-2 bottom-6" orientation={Gtk.Orientation.VERTICAL}>
            <centerbox>
                <box className="bold font-1">News</box>
                <box></box>
                <box halign={Gtk.Align.END}>
                    <button>
                        <box className="gap-h-3">
                            <label label="More" />
                            <icon icon="chevron-right-symbolic"></icon>
                        </box>
                    </button>
                </box>
            </centerbox>
            <box className="new-content" vexpand={true} halign={Gtk.Align.CENTER} valign={Gtk.Align.CENTER}>
                <box className="news-error-alert gap-h-2">
                    <icon icon="wifi-slash-symbolic" className="icon-2"></icon>
                    <label className="font-3" label="No internet connection" />
                </box>
            </box>
        </box>
    </box>;

    const stack = new Widget.Stack ({
        children: [maincontent, appscontent],
        shown: 'main',
        border_width: 0
    });

    const window = <window className="menu-window" keymode={Astal.Keymode.ON_DEMAND} layer={Astal.Layer.OVERLAY} name="overview" onDestroy={window_destroy_cb} visible={false} gdkmonitor={monitor} application={App} anchor={Astal.WindowAnchor.BOTTOM}>
        <box orientation={Gtk.Orientation.VERTICAL} className="menu border border-1 border-secondary">
            <box className="content gap-v-3" orientation={Gtk.Orientation.VERTICAL}>
                <box className="search-bar">
                    {stackmenu}
                </box>
                {stack}
            </box>
            <centerbox className="menu-bottom" orientation={Gtk.Orientation.HORIZONTAL} valign={Gtk.Align.CENTER}>
                <box className="gap-h-2" halign={Gtk.Align.START}>
                    <button valign={Gtk.Align.CENTER} halign={Gtk.Align.CENTER} className='btn-icon-4 btn-profile'>
                        <icon icon='user-outline-symbolic' className='user-icon'></icon>
                    </button>
                    <label label={GLib.get_user_name()}></label>
                </box>
                <box></box>
                <box halign={Gtk.Align.END}>
                    <button valign={Gtk.Align.CENTER} halign={Gtk.Align.CENTER} className='btn-icon-4'>
                        <icon icon='poweroff-outline-symbolic' className='poweroff-icon' ></icon>
                    </button>
                </box>
            </centerbox>
        </box>
    </window>;

    textview_buffer_rhs.push(textview.get_buffer().connect ('inserted-text', (_source, position, chars, nchars) => {
        search_apps_cb (textview.get_text());
    }));

    textview_buffer_rhs.push(textview.get_buffer().connect ('deleted-text', (_source, position, n_chars) => {
        search_apps_cb (textview.get_text());
    }));
    
    window_rhs.push(window.connect ('hide', () => {
        desktop.set_monitor_lock(monitor, false);
    }));

    window_rhs.push(window.connect ('show', () => {
        textview.grab_focus();
        fetch_pinned_aps (page, count, pinned_apps);
        desktop.set_monitor_lock(monitor, true);

        desktop.on_screen_block_close (monitor, () => {
            textview.set_text('');
            window.hide();
        });
    }));

    return window;
}