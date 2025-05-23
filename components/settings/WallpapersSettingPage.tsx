import { readFile, readFileAsync } from "astal";
import { execAsync, GLib, Gst, Gtk, Log, Variable, Widget } from "../../lib/imports";
import { buildSettingParam } from "./SettingParam";
import { batteryPercentage, powerprofile } from "../BatteryState";
import { AgsError, err_num } from "../../lib/error";
import Brightness from "../../lib/brightness";
import { soundVolume, soundVolumePercentage } from "../AudioVolumeState";
import { audio_device } from "../../services/SoundVolume";
import { FileChooserWindow } from "../../widget/FileChooser";
import { Gdk } from "../../lib/imports";
import { before_delete } from "../../lib/ondestroy";
import { desktop } from "../../lib/app";
import { GtkGrid } from "../../lib/elements";
import { mergeClasses } from "../../lib/styles";

const MAX_COLS = 3;

async function build_wallpaper_preview (row: {path: string, favorite: boolean, monitor: null|number}|null): Promise<Gtk.Widget> {
    if (row !== null) {
        try {
            throw new Error ('failed');
        }
        catch (e) {
            if (e instanceof Error) {
                Log.exception (e, "Failed to load a video file");
            }
            else {
                console.log(e);
            }
        }
    }

    return <box hexpand={true} className={row !== null ? 
        mergeClasses("wallpaper-video-preview", "m-2","rounded-4","bg-black","border","border-1","border-secondary") 
            : mergeClasses("wallpapers-video-preview", "m-2", "bg-transparent")}>

    </box>;
}

async function build (gdkmonitor: Gdk.Monitor) {
    const bd = new before_delete();
    const scrollbd = new before_delete();
    let rows = 0;
    let finished = false;
    let ready = Variable(true);

    const wallpapers = new GtkGrid ({
        className: "wallpaper-video-preview-grid"
    });

    const scroll = new Widget.Scrollable ({
        child: wallpapers,
        hscrollbarPolicy: Gtk.PolicyType.NEVER,
        vscrollbarPolicy: Gtk.PolicyType.AUTOMATIC,
        hexpand: true,
        vexpand: true,
        onDestroy: () => scrollbd.call()
    });

    function reset_wallpapers () {
        while (true) {
            if (wallpapers.get_child_at(0,0)) {
                wallpapers.remove_row(0);
            }
            else {
                break
            }
        }

        rows = 0;
    }

    async function grab_next_wallpapers () {
        if (finished || !ready.get()) {
            return;
        }

        ready.set(false);
        
        try {
            await new Promise<void> ((resolve, reject) => {
                try {
                    /** @ts-ignore */
                    desktop.databases.wallpapers.find ({}, {path: 1, favorite: 1, monitor: 1, _id: 0})?.skip(rows * MAX_COLS).limit(MAX_COLS * 3).exec(async (err: Error|null, docs: any) => {
                        
                        if (err) {
                            reject(err);
                            return;
                        }
                        let cols = 0;

                        if (rows==0) {
                            wallpapers.insert_row((rows++) * MAX_COLS);
                        }
                        
                        if (!docs.length) {
                            finished = true;
                            return;
                        }

                        for (const row of docs) {
                            wallpapers.insert_column((rows - 1) * MAX_COLS + (cols++));
                            wallpapers.attach (await build_wallpaper_preview(row), (cols - 1), (rows - 1), 1, 1);

                            if (cols==MAX_COLS) {
                                cols=0;
                                wallpapers.insert_row((rows++) * MAX_COLS);
                            }
                        }

                        if (cols != 0) {
                            // fill
                            while (cols != MAX_COLS) {
                                wallpapers.insert_column((rows - 1) * MAX_COLS + (cols++));
                                wallpapers.attach (await build_wallpaper_preview(null), (cols - 1), (rows - 1), 1, 1);
                            }
                            cols = 0;
                        }

                        resolve();
                    });
                }
                catch (e) {
                    reject (e);
                }
            });
        }
        catch (e) {

        }

        ready.set(true);
    }

    scrollbd.add((id: number) => scroll.disconnect (id), scroll.connect ('scroll-event', (self, event) => {
        const ypos = Math.abs(wallpapers.translate_coordinates(scroll, 0, -scroll.get_allocated_height())[2]); /** y-pos */
        if (Math.abs(wallpapers.get_allocated_height() - ypos) <= 78) {
            grab_next_wallpapers();
        }
    }));

    grab_next_wallpapers();

    return <box className={"gap-v-4 settings-wallpapers"} onDestroy={() => bd.call()} hexpand={true} vertical={true}>
        <centerbox hexpand={true}>
            <box></box>
            <box></box>
            <box halign={Gtk.Align.END}>
                <button label={"Choose..."} onClick={() => FileChooserWindow (gdkmonitor, { multiple: false }, (files) => {
                    desktop.databases.wallpapers.insert ({path: files[0], favorite: false, monitor: null}, (err: Error|null, affected_rows: number) => {
                        if (err) {
                            Log.exception (err, "Failed to add new wallpaper to the db.");
                            return;
                        }
                        reset_wallpapers();
                        grab_next_wallpapers();
                    });
                })}></button>
            </box>
        </centerbox>
        <box hexpand={true}>
            {scroll}
        </box>
    </box>;
}


export function ags_settings_wallpapers_page () {
    return {
        icon: 'picture-colored',
        name: 'Wallpapers',
        build
    };
}