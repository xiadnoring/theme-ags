import AstalApps from "gi://AstalApps";
import { Astal, ConstructProps, exec, execAsync, Gdk, Gtk, Log, Pango, Variable, Widget } from "../lib/imports";
import { desktop } from "../lib/app";
import { GtkMenu, GtkMenuItem } from "../lib/elements";
import AstalHyprland from "gi://AstalHyprland";
import { err_num } from "../lib/error";

export type AppListProps = {};

export const apps = new AstalApps.Apps ({});

export function reload_app_list () {
    apps.reload();
}

export function build_app_icon (icon_name: string|null, props: ConstructProps<any, Widget.Box> = {}) {
    if (icon_name === null) { icon_name = 'blank'; }
    const icon_name_is_path = icon_name.startsWith ('~') || icon_name.startsWith ('.') || icon_name.startsWith ('/');
    const icon = icon_name_is_path ? null : new Widget.Icon ({
        icon: icon_name
    });
    return <box {...props} className="app-icon font-5" css={`background-image: url('${icon_name_is_path ? desktop.expand_tilde(icon_name) : 'none'}')`}>{icon}</box>;
}

export function AppList (monitor: Gdk.Monitor, props: AppListProps) {
    const content = new Widget.Box ({
        className: "app-list",
        orientation: Gtk.Orientation.VERTICAL,
    });

    const menu = new GtkMenu ({});

    let current_app: AstalApps.Application|null = null;
    let current_pin_status: Variable<boolean> = Variable(false);

    const on_primary_click = (cb: (event: Gdk.Event, app: AstalApps.Application) => void) => {
        return (self:any, event: Gdk.Event) => {
            if (current_app === null) { return; }
            if (event.get_button()[1] == 1) {
                cb (event, current_app);
                menu.hide();
            }
        }
    }

    menu.children = [
        new GtkMenuItem ({
            label: current_pin_status().as((n) => n ? 'Unpin App' : 'Pin App'),
            onButtonReleaseEvent: on_primary_click ((event, app) => {
                let status = current_pin_status().get();
                let id = app.get_entry() + app.get_name();
                if (status) {
                    // delete
                    desktop.databases["menu-pinned"].remove({'id': id});
                }
                else {
                    // set
                    desktop.databases["menu-pinned"].insert ({
                        id,
                        icon: app.get_icon_name(),
                        exec: app.get_executable(),
                        name: app.get_name()
                    });
                }

                current_pin_status.set(!status);
            })
        }),
        new GtkMenuItem ({
            label: "Run as floating",
            onButtonReleaseEvent: on_primary_click ((event, app) => {
                app.launch();
                let cnt = 0;
                let timer = setInterval (() => {
                    const entry = app.get_entry().split('.');
                    entry.pop();
                    const wmclass = [entry.join('.')];
                    const hyprland = AstalHyprland.get_default();
                    const clients = hyprland.get_clients ();
                    let address: string|null = null;
                    let pid: number = 0;
                    for (const client of clients) {
                        if (wmclass.indexOf(client.class) != -1 && client.pid > pid) {
                            address = client.address;
                            pid = client.pid;
                        }
                    }
                    if (address !== null) {
                        execAsync ('hyprctl dispatch togglefloating address:0x'+address).catch ((err) => {
                            Log.error (err_num.FLOATING_WINDOW, `Failed to run app ${app.get_name()} as floating. error msg: ${ err instanceof Error ? err.message : err}`);
                        });

                        clearInterval (timer);
                    }
                    else {
                        if (cnt++ > 15) {
                            clearInterval (timer);
                        }
                    }
                }, 100);

                desktop.set_monitor_lock (monitor, false);
            })
        }),
        new GtkMenuItem ({
            label: "Copy exec",
            onButtonReleaseEvent: on_primary_click ((event, app) => {
                const execbash = app.get_executable();
                const clipoboard = Gtk.Clipboard.get_default(monitor.get_display());
                clipoboard.set_text (execbash, execbash.length);
            })
        }),
        new GtkMenuItem ({
            label: "Copy .desktop entry",
            onButtonReleaseEvent: on_primary_click ((event, app) => {
                const execbash = app.get_entry();
                const clipoboard = Gtk.Clipboard.get_default(monitor.get_display());
                clipoboard.set_text (execbash, execbash.length);
            })
        })
    ];

    const search_cb = (search: string) => {
        const children: typeof content.children = [];

        for (const app of apps.fuzzy_query (search)) {
            const icon_name = app.icon_name ?? 'gthumb';
            

            const button = <button relief={Gtk.ReliefStyle.NONE} onButtonPressEvent={(self, event) => {
                if (event.get_button()[1] == 3) {
                    desktop.databases['menu-pinned'].find ({'id': app.get_entry() + app.get_name()}, { _id: 1 }, (err: Error|null, data: {_id: string}[]) => {
                        if (err !== null) {

                            return;
                        }

                        current_pin_status.set(data.length != 0);
                    });
                    current_app = app;
                    menu.popup_at_pointer (event);
                    
                }
            }} onClicked={(self) => {
                desktop.set_monitor_lock (monitor, false);
                app.launch();
            }} className="app-btn"><box orientation={Gtk.Orientation.HORIZONTAL} className="gap-h-2">
                {build_app_icon(icon_name)}
                <box orientation={Gtk.Orientation.VERTICAL} valign={Gtk.Align.CENTER}>
                    <label halign={Gtk.Align.START} className="font-1 bold" ellipsize={Pango.EllipsizeMode.END} label={app.name} />
                    <label halign={Gtk.Align.START} className="font-1 font-weight-200" ellipsize={Pango.EllipsizeMode.END} label={app.description ?? 'No description'} />
                </box>
            </box></button>;

            children.push (button);
        }
        content.children = children;
    };

    const scrollable = new Widget.Scrollable ({
        className: 'scrollbar',
        hscroll: Gtk.PolicyType.NEVER,
        vscroll: Gtk.PolicyType.ALWAYS,
        hexpand: true,
        vexpand: true,
        shadow_type: Gtk.ShadowType.NONE,
        border_width: 0,
        child: content,
        onDestroy: () => {
            menu.destroy();
        }
    });
    return {search_cb, widget: scrollable};
}