import { desktop } from "../lib/app";
import { GtkGrid } from "../lib/elements";
import { Astal, Gdk, Gio, GLib, Gtk, Log, Pango, Variable, Widget } from "../lib/imports";
import { before_delete } from "../lib/ondestroy";
import fs from "../modules/fs";
import path from "../modules/path";
import { DialogWindow } from "./Dialog";

const MAX_COLS = 6;
const ROWS_BY_STEP = 20;

async function generate_file_element (filepath: string, file: Gio.FileInfo, current_path: Variable<string>): Promise<Gtk.Widget> {
    const isfile = await fs.is_file (filepath);
    let icon: string;
    if (isfile) {
        icon = 'file-colored';
    }
    else {
        icon = 'folder-colored';
    }

    return <button className="btn btn-square" onClicked={() => current_path.set(filepath)}>
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

async function grab_files_and_fill (files_view: Gtk.Grid, filepath: string, current_path: Variable<string>, prev_rows: number = 0): Promise<{ rows: number, isfolder: boolean, isfile: boolean }> {
    let rows = 0;
    let cols = 0;
    let prev_cols = prev_rows * MAX_COLS;
    let isfolder = await fs.is_directory (filepath);

    if (isfolder) {
        let files = await fs.list_dir (filepath);
        let flg = true;
        for await (const file of files) {
            if (prev_cols) {
                /** skip */
                prev_cols--;
                continue;
            }
            else if (flg) {
                files_view.insert_row((rows++ + prev_rows) * MAX_COLS);
                flg = false;
            }

            const p = path.join(filepath, file.get_name());
            files_view.insert_column((rows + prev_rows - 1) * MAX_COLS + cols++);
            files_view.attach (await generate_file_element(p, file, current_path) ,cols-1,rows+prev_rows-1, 1,1);
            if (cols >= MAX_COLS) {
                cols=0;
                if (rows >= ROWS_BY_STEP) {
                    break;
                }
                files_view.insert_row((rows++ + prev_rows) * MAX_COLS);
                
            }
        }
    }
    else {
        
    }

    return {rows, isfolder, isfile : await fs.is_file(filepath)};
}

export function FileChooserWindow (gdkmonitor: Gdk.Monitor, props: { multiple?: boolean }, callback: (files: string[]) => void) {
    DialogWindow (gdkmonitor, (close) => {
        const history: string[] = [];
        let ready = Variable(false);
        let current_path = Variable('');
        
        let rows = 0;

        const bd = new before_delete();
        const files_view = new GtkGrid ({ });

        async function grap_next_rows (path: string) {
            ready.set(false);

            try {
                // FILL
                await grab_files_and_fill (files_view, path, current_path, rows).then (data => {
                    if (data.isfolder) {
                        rows += data.rows;
                    }
                    if (data.isfile) {
                        callback ([path]);
                        close();
                    }
                });
            }
            catch (e) {
                if (e instanceof Error) {
                    Log.exception (e, "grab_files_and_fill(...) failed. FileChooser");
                }
            }

            ready.set(true);
        }

        function forward_path (path: string) {
            if (!path) {
                return;
            }

            while (true) {
                if (files_view.get_child_at(0,0)) {
                    files_view.remove_row(0);
                }
                else {
                    break
                }
            }

            rows = 0;

            grap_next_rows(path)
                .finally (() => {
                    history.push(path); });  
        }

        bd.add(current_path.subscribe(forward_path));

        current_path.set(GLib.get_home_dir());

        let scroll_bd = new before_delete();

        const scroll = new Widget.Scrollable ({
            child: files_view,
            className: "file-chooser-scrollable",
            expand: true,
            hscrollbarPolicy: Gtk.PolicyType.NEVER,
            vscrollbarPolicy: Gtk.PolicyType.AUTOMATIC,
            onDestroy: () => scroll_bd.call(),
            sensitive: ready()
        });

        scroll_bd.add((id: number) => scroll.disconnect(id), scroll.connect ('scroll-event', (self, event: Gdk.Event) => {
            const ypos = Math.abs(files_view.translate_coordinates(scroll, 0, -scroll.get_allocated_height())[2]); /** y-pos */
            if (Math.abs(files_view.get_allocated_height() - ypos) <= 78) {
                grap_next_rows (current_path.get());
            }
        }));

        const entry = new Widget.Entry({
            editable:ready(),
            hexpand: true,
            text: current_path(),
            onKeyPressEvent: (self, event) => { 
                if (ready.get() && event.get_keycode()[1] == 36 /** enter */) { current_path.set(self.text); files_view.grab_focus(); } }
        });

        return <box hexpand={true} onDestroy={() => bd.call()} className="file-chooser bg-widget border border-1 border-secondary rounded-4 p-4">
            <box hexpand={true} vertical={true}>
                <box vertical={false} hexpand={true}>
                    <box>
                        <button sensitive={ready()} onClick={() => ready.get() && history.length > 1 && (history.pop()??true) && (current_path.set(history.pop()??current_path.get()))} className="icon-material btn" label="arrow_back_ios_new"></button>
                    </box>
                    <box hexpand={true} className="px-2">
                        {entry}
                    </box>
                    <box   halign={Gtk.Align.END}>
                        <button className="icon-material btn" label="arrow_forward_ios" onClick={() => entry.text != current_path.get() && forward_path(entry.text)}></button>
                    </box>
                </box>
                <box className="mt-3">
                    {scroll}
                </box>
            </box>
        </box>;
    });
}