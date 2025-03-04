import { AstalIO } from "astal";
import { ags_settings_about_system } from "../components/settings/AboutSystem";
import { ags_settings_power_page } from "../components/settings/PowerSettingPage";
import { desktop } from "../lib/app";
import { Astal, Gdk, GLib, Gtk, Log, Variable, Widget } from "../lib/imports";
import { Mutex, tryAcquire } from "../modules/async-mutex";
import { ags_settings_sound_page } from "../components/settings/SoundSettingPage";
import { err_num } from "../lib/error";
import { ags_settings_wifi } from "../components/settings/WifiSettingPage";
import { ags_settings_cron_tab } from "../components/settings/CronTab";
import { ags_settings_apps } from "../components/settings/Apps";

let monitors = new Set <string> ();

function page_loading_build () : Gtk.Widget {
    return <box halign={Gtk.Align.CENTER} hexpand={true}>
        <label label="loading..."></label>
    </box>;
}

export async function AgsSettingsWidget (monitor: Gdk.Monitor) {
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
            
            const content_param = new Widget.Box ({name: "content", hexpand: true});

            let status = Variable ("loading");
            let params = [ags_settings_about_system(), ags_settings_wifi(), ags_settings_power_page(), ags_settings_sound_page(), ags_settings_cron_tab()];
            let current_param: Gtk.Widget = new Widget.Box({});

            params[0].build(monitor).then ((n) => {
                status.set ("content");

                if (current_param) {
                    content_param.remove(current_param);
                    current_param.destroy();
                }

                current_param = n;
                content_param.add(current_param);
            }).catch ((e) => {
                if (e instanceof Error) {
                    Log.error (err_num.SETTINGS_PAGE_RENDER, e.message + '\n' + (e.stack ?? 'none'));
                }
            });

            let current_name = Variable (params[0].name);

            const width = Math.min(monitor.get_geometry().width, 1200);
            const height = Math.min(monitor.get_geometry().height, 900);
            const paramlist_children: Gtk.Widget[] = [];
            
            for (const param of params) {
                paramlist_children.push(<button onClicked={() => {
                    if (param.name == current_name.get()) {
                        // already
                        return;
                    }
                    current_name.set(param.name);
                    status.set ("loading");
                    param.build(monitor).then ((n) => {
                        if (current_param) {
                            content_param.remove(current_param);
                            current_param.destroy();
                        }

                        current_param = n;
                        content_param.add(current_param);

                        status.set ("content");
                    });
                }} className={"btn-square btn-setting-param"}>
                    <box valign={Gtk.Align.CENTER} className={"gap-h-4 py-1"} orientation={Gtk.Orientation.HORIZONTAL}>
                        <icon className={"font-2"} icon={param.icon}></icon>
                        <label className={"font-1-5 font-weight-400"} label={param.name}></label>
                    </box>
                </button>);
            }

            const paramlist = new Widget.Box ({
                orientation: Gtk.Orientation.VERTICAL,
                children: paramlist_children,
                vexpand: true
            });

            const window = <window keymode={Astal.Keymode.ON_DEMAND} onDestroy={() => {
                monitors.delete (monitorid);
            }} name="settings" gdkmonitor={monitor} application={desktop.App} className="bg-transparent">
                <box className={"settings border border-1 border-secondary"} orientation={Gtk.Orientation.VERTICAL} css={`min-width: ${width}px; min-height: ${height}px;`}>
                    <centerbox className={"settings-titlebar"}>
                        <box className={"gap-h-2"} orientation={Gtk.Orientation.HORIZONTAL}>
                            <button className={"btn-transparent"} onClicked={() => {
                                // unlock
                                desktop.set_monitor_lock (monitor, false);
                            }}>
                                <label className={"icon-material font-1-5"} label={"arrow_left_alt"}></label>
                            </button>

                            <label className={"settings-titlebar-text"} label={"Settings"}></label>
                        </box>
                        <box></box>
                        <box></box>
                    </centerbox>
                    <box className={"settings-content p-2"} orientation={Gtk.Orientation.HORIZONTAL}>
                        <scrollable vscroll={Gtk.PolicyType.AUTOMATIC} hscroll={Gtk.PolicyType.NEVER}>
                            {paramlist}
                        </scrollable>
                        <scrollable vscroll={Gtk.PolicyType.AUTOMATIC} hscroll={Gtk.PolicyType.NEVER} className={"p-2"} hexpand={true}>
                            <stack visibleChildName={status()} hexpand={true}>
                                {content_param}
                                <box name="loading" hexpand={true}>{page_loading_build()}</box>
                            </stack>
                        </scrollable>
                    </box>
                </box>
            </window>;


            desktop.on_screen_block_close (monitor, () => {
                content_param.remove(current_param);
                current_param.destroy();
                window.destroy();
            });
        }
    }
    catch (e) {
        Log.exception(e);
    }

    return;
}