import { Variable } from "astal";
import { monitorFile, readFile } from "astal/file";
import Gio from "gi://Gio";
import { AgsError, err_num } from "./error";
import { exists, existsAsync } from "../modules/fs";
import { JsonMask } from "../modules/jsonmask";

function generateReadConfig (config: Variable <any>) {
    const jsonmask = new JsonMask ({
        "theme": "hacker",
        "wallpaper_folder": "{string}",
        "keyboard_layout": "{any}",
        "shortcuts": {
            "menu": "{string}"
        },
        "desktop_entries_sources": "{string[]}"
    });

    return async (file: string, event: Gio.FileMonitorEvent) => {
        try {
            if (event != Gio.FileMonitorEvent.CHANGES_DONE_HINT) { return; }
        
            if (!await existsAsync (file)) {
                throw new AgsError (err_num.CONFIG_NOT_EXISTS, `Config on the path ${file} not exists.`);
            }
            try {
                const data = JSON.parse (readFile (file));
                if (!jsonmask.valid (data)) {
                    throw new AgsError (err_num.CONFIG_IS_INVALID, `Config has invalid options`);
                }
                config.set(data);
            }
            catch (e) {
                if (e instanceof Error ) {
                    throw new AgsError (err_num.CONFIG_PARSE, 'Failed to parse config with error: ' + e.message);
                }
            }
        }
        catch (e) {
            if (e instanceof AgsError) {
                e.debug ();
            }
            else if (e instanceof Error) {
                console.error (e);
            }
        }
    };
}

export function monitorConfig (config_path: string): { config: Variable <any>, callback: Gio.FileMonitor } {
    const config: Variable <any> = Variable ({});
    const readConfig = generateReadConfig (config);
    const callback = monitorFile (config_path, readConfig);

    readConfig (config_path, Gio.FileMonitorEvent.CHANGES_DONE_HINT);

    return {
        config,
        callback
    };
}