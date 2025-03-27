import { desktop } from "../lib/app";
import { GtkGrid } from "../lib/elements";
import { Astal, Gdk, Gio, GLib, Gtk, Log, Pango, Variable, Widget } from "../lib/imports";
import { before_delete } from "../lib/ondestroy";
import fs from "../modules/fs";
import path from "../modules/path";
import { DialogWindow } from "./Dialog";

const MAX_COLS = 6;

async function generate_file_element (filepath: string, file: Gio.FileInfo): Promise<Gtk.Widget> {
    const isfile = await fs.is_file (filepath);
    let icon: string;
    if (isfile) {
        icon = 'file-colored';
    }
    else {
        icon = 'folder-colored';
    }

    return <button className="btn btn-square" onClick={() => {

    }}>
        <box vertical={true} className="m-2">
            <box hexpand={true} halign={Gtk.Align.CENTER} valign={Gtk.Align.CENTER}>
                <icon icon={icon} className="font-4"></icon>
            </box>
            <box hexpand={true} halign={Gtk.Align.CENTER}>
                <label halign={Gtk.Align.CENTER} label={file.get_name()} ellipsize={Pango.EllipsizeMode.MIDDLE}></label>
            </box>
        </box>
    </button>;
}

async function grab_files_and_fill (files_view: Gtk.Grid, filepath: string): Promise<{ rows: number, isfolder: boolean }> {
    let rows = 0;
    let cols = 0;
    let isfolder = await fs.is_directory (filepath);

    if (isfolder) {
        const files = await fs.list_dir (filepath);
        files_view.insert_row(rows++ * MAX_COLS);
        for (const file of files) {
            
            const p = path.join(filepath, file.get_name());
            files_view.insert_column((rows - 1) * MAX_COLS + cols++);
            files_view.attach (await generate_file_element(p, file) ,cols-1,rows-1, 1,1);
            if (cols >= MAX_COLS) {
                cols=0;
                if (rows >= 20) {
                    break;
                }
                files_view.insert_row((rows++) * MAX_COLS);
                
            }
        }
    }
    else {
        
    }

    return {rows, isfolder};
}

export function FileChooserWindow (gdkmonitor: Gdk.Monitor, props: { multiple?: boolean }, callback: (files: string[]) => void) {
    DialogWindow (gdkmonitor, (close) => {
        let current_path = Variable('');
        
        let rows = 0;

        const bd = new before_delete();
        const files_view = new GtkGrid ({ });

        bd.add(current_path.subscribe((path: string) => {
            if (!path) {
                return;
            }

            for (let i = 0; i < rows; i++) {
                files_view.remove_row(i);
            }

            rows = 0;

            // FILL
            grab_files_and_fill (files_view, path).then (data => {
                rows = data.rows;
            });
        }));

        current_path.set(GLib.get_home_dir());

        return <box onDestroy={() => bd.call()} className="file-chooser bg-widget border border-1 border-secondary rounded-4 p-4">
            <box vertical={true}>
                <centerbox hexpand={true}>
                    <box></box>
                    <box hexpand={true}>
                        <entry hexpand={true} text={current_path()} onKeyPressEvent={(self, event) => { 
                            if (event.get_keycode()[1] == 36 /** enter */) { current_path.set(self.text); files_view.grab_focus(); } }}></entry>
                    </box>
                    <box>
                    </box>
                </centerbox>
                <box className="mt-3">
                    <scrollable className="file-chooser-scrollable" vexpand={true} hexpand={true} hscrollbarPolicy={Gtk.PolicyType.NEVER} vscrollbarPolicy={Gtk.PolicyType.AUTOMATIC}>
                        {files_view}
                    </scrollable>
                </box>
            </box>
        </box>;
    });
}