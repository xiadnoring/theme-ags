import { Variable } from "astal/variable";
import { Gio, monitorFile } from "astal/file";
import { monitorConfig } from "./config";
import { exec, execAsync } from 'astal/process';
import { App, Astal, Gdk, GLib, Gtk, Log } from "./imports";
import { AgsError, err_num, log } from './../lib/error';
import Bar from "../widget/Bar";
import { monitorBlock } from "../components/MonitorBlock";
import { Menu } from "../widget/Menu";
import { checkKeybind } from "./shortcut";
import Datastore from './../modules/nedb/index.js';
import { waitLastAction } from "./store";
import { reload_app_list } from "../components/AppList";
import AstalHyprland from "gi://AstalHyprland?version=0.1";
import AstalIO01 from "gi://AstalIO";
import AstalNetwork from "gi://AstalNetwork?version=0.1";
import fs from "../modules/fs";
import path from "../modules/path";
import { sha256files } from "./crypt";
import { startupcronjobs } from "../components/settings/CronTab";

enum MonitorTheme {
    DEFAULT
}

type Databases = {
    'menu-pinned': Datastore,
    'hashes': Datastore,
    'crontab': Datastore,
    'wallpapers': Datastore
};


export const network = AstalNetwork.get_default();
export const active_access_point: Variable <AstalNetwork.AccessPoint|null> = Variable (network.get_wifi()?.get_active_access_point() ?? null);
export const active_internet_state: Variable<AstalNetwork.Internet> = Variable (AstalNetwork.Internet.DISCONNECTED).poll (1300, () => {
    active_access_point.set(network.get_wifi()?.get_active_access_point() ?? null);
    return network.wifi.get_enabled() ? network.wifi.get_internet() : AstalNetwork.Internet.DISCONNECTED 
});

class Desktop {
    config: Variable<{[key: string]: any}>
    configDir: string
    wallpaperDir: string
    
    App: Astal.Application
    monitors: Variable <Set<Gdk.Monitor>>
    monitor_locks: Map <string, Variable<boolean>>;
    shortcut_cnt: number 
    databases: Databases
    user_config_dir: string
    private style_changing: boolean
    private watch_callback: Gio.FileMonitor
    private config_callbacks: (() => void)[]
    private on_destroy_cbs: Set <() => Promise<void>>;

    constructor (config_path: string, App: Astal.Application) {
        this.configDir =  GLib.getenv('HOME') + '/.config/ags';
        this.user_config_dir = GLib.getenv('HOME') + "/.ags";
        
        {
            const response = monitorConfig (config_path);
            this.config = response.config;
            this.watch_callback = response.callback;
        }

        this.monitor_locks = new Map ();
        this.on_destroy_cbs = new Set ();
        this.monitors = Variable (new Set ());
        this.wallpaperDir = '';
        this.config_callbacks = [];
        this.style_changing = false;
        this.App = App;
        this.shortcut_cnt = 0;

        this.bind_values();
        
        const dbs: {[key: string]: Datastore} = {};
        for (const dbtype of ['menu-pinned', 'hashes', 'crontab', 'wallpapers']) {
            dbs[dbtype] = new Datastore ({filename:  this.user_config_dir + '/db/' + dbtype + '.db'});
            dbs[dbtype].loadDatabase ((err: Error|null) => {
                if (err != null) {
                    Log.error (err_num.DB_LOAD_ERROR, `db: ${dbtype}. Error: ${err.message}`)
                    console.error (err);
                }
            });
        }
        this.databases = dbs as typeof this.databases;
        this.setup_databases();
    }


    private setup_databases () {
        this.databases["menu-pinned"].ensureIndex ({fieldName: 'id', unique: true}, (err: Error|null) => {
            if (err != null) { Log.error (err_num.DB_ERROR, "Failed to make column indexing in 'menu-pinned'"); }
        });

        this.databases["hashes"].ensureIndex ({fieldName: 'id', unique: true}, (err: Error|null) => {
            if (err != null) { Log.error (err_num.DB_ERROR, "Failed to make column indexing in 'hashes'"); }
        });


        this.databases["crontab"].ensureIndex ({fieldName: 'id', unique: true}, (err: Error|null) => {
            if (err != null) { Log.error (err_num.DB_ERROR, "Failed to make column indexing in 'crontab'"); }
        });

        this.databases["wallpapers"].ensureIndex ({fieldName: 'path', unique: true}, (err: Error|null) => {
            if (err != null) { Log.error (err_num.DB_ERROR, "Failed to make column indexing in 'wallpapers'"); }
        });
    }

    private bind_values () {
        this.config_callbacks.push (this.config.subscribe ((n) => { this.wallpaperDir = n['wallpaper_folder'] ?? ''; }));
    }

    switchwall () {
        this.execScript ('color_generation/switchwall.sh', '&');
    }

    async random_wallpaper () {
        if (this.style_changing || !this.wallpaperDir) { return; }
        this.style_changing = true;

        try {
            const bgFiles = (await execAsync (`find ${this.wallpaperDir} -type f -iname '*.png' -o -iname '*.jpg'`)).split('\n');
            const bgFile = bgFiles[Math.floor (Math.random() * (bgFiles.length - 1))];
            await execAsync (`bash ${this.configDir}/scripts/color_generation/switchwall.sh ${bgFile}`);
            await this.recompile_scss ();
        }
        catch (e) {
            log.error (err_num.WALLPAPER_CHANGE, (e instanceof Error ? e.message : ''));
        }
        finally {
            this.style_changing = false;
        }
    }

    execScript (script: string, params: string = '') {
        execAsync ([`bash`, `-c`, `${this.configDir}/scripts/${script}`, params]).catch(print);
    }

    private async recompile_scss () {
        let scss_source_hash: {hash: string}[]|null = [];
        try {
            scss_source_hash = await this.databases['hashes'].async_find ({'id': 'scss'}, { 'hash': 1 });
        }
        catch (e) {
            /** not exists */
        }

        const main_css = this.configDir + "/scss/generated/main.css";
        const current_scss_source_hash = await sha256files([path.join(this.configDir, 'scss'), path.join(this.configDir, 'style.scss')]);

        if (scss_source_hash && scss_source_hash.length && current_scss_source_hash == scss_source_hash[0].hash) {
            /** no needed */
            this.App.apply_css (main_css, true);
            return;
        }

        if (scss_source_hash===null||!scss_source_hash.length) {
            /** not exists */
            this.databases["hashes"].insert ({'id': 'scss', 'hash': current_scss_source_hash});
        }
        else {
            /** update */
            this.databases["hashes"].update ({'id': 'scss'}, {'id': 'scss', 'hash': current_scss_source_hash});
        }

        /** compile */
        await execAsync (['sass', this.configDir + "/style.scss" ,'--style' ,'compressed', main_css])
        this.execScript ('color_generation/applycolor.sh', '&');

        /** apply */
        this.App.apply_css (main_css, true);
    }

    async after_init () {
        await this.recompile_scss ();
        await startupcronjobs();
    }

    async enable_coffee () {
        const scriptPath = `${this.configDir}/scripts/wayland-idle-inhibitor.py`
        await execAsync(['bash', '-c', `pidof wayland-idle-inhibitor.py || ${scriptPath}`]).catch(print);
    }

    async disable_coffee () {
        const scriptPath = `${this.configDir}/scripts/wayland-idle-inhibitor.py`
        await execAsync('pkill -f wayland-idle-inhibitor.py').catch(print);
    }

    status_coffee () {
        try {
            return !!exec('pidof wayland-idle-inhibitor.py')
        }
        catch (e) {
            return false;
        }
    }

    on_screen_block_close (monitor: Gdk.Monitor, callback: () => void) {
        const status = this.monitor_locks.get(this.gdkmonitor2id(monitor));
        
        if (status !== undefined) {
            if (!status.get()) {
                callback();
                return;
            }
            let cb = status.subscribe ((n) => {
                if (!n) {
                    cb();
                    callback();
                }
            });
        }
    }

    monitor_setup (monitor: Gdk.Monitor, theme: MonitorTheme = MonitorTheme.DEFAULT) {
        switch (theme) {
            case MonitorTheme.DEFAULT:
                Bar(monitor);
                Menu(monitor);
                monitorBlock(monitor);
            break;
            default:
                break
        }
    }

    gdkmonitor2id (monitor: Gdk.Monitor) {
        return (monitor.get_model()??'?');
    }

    monitor2id (monitor: AstalHyprland.Monitor) {
        return (monitor.get_model()??'?');
    }

    bind_list_monitor_changes () {
        const monitor_added = (source: Astal.Application, monitor: Gdk.Monitor) => {
            this.monitors.get().add (monitor);
            this.monitor_locks.set (this.gdkmonitor2id(monitor), Variable(false));
            this.monitor_setup (monitor);
        };
        const monitor_removed = (source: Astal.Application, monitor: Gdk.Monitor) => {
            this.monitors.get().delete (monitor);
            this.monitor_locks.delete (this.gdkmonitor2id(monitor));
        };
        
        for (const monitor of this.App.get_monitors()) {
            monitor_added (this.App, monitor);
        }

        const rhs1 = this.App.connect ('monitor-added', monitor_added);
        const rhs2 = this.App.connect ('monitor-removed', monitor_removed);

        this.on_destroy_cb (async () => {
            this.App.disconnect (rhs1);
            this.App.disconnect (rhs2);
        });
    }

    on_destroy_cb (cb: () => Promise<void>) {
        this.on_destroy_cbs.add (cb);
    }

    async destroy () {
        for (const cb of this.on_destroy_cbs) {
            await cb ();
        }
        this.on_destroy_cbs.clear();
    }

    register_shortcut (shortcut: string, callback: () => void) {
        return (self: any, event: Gdk.Event) => {
            const shortcuts = this.config.get()['shortcuts'];
            if (shortcut in shortcuts == false) {
                throw new AgsError (err_num.SHORTCUT_NOT_EXISTS, `register_shortcut(...): shortcut: ${shortcut}`);
            }
            if (checkKeybind (event, shortcuts[shortcut])) {
                callback();
            }
        }
    }

    set_monitor_lock (monitor: Gdk.Monitor, status: boolean) {
        const _lock = this.monitor_locks.get (this.gdkmonitor2id(monitor));
        if (_lock === undefined) {
            log.error (err_num.MONITOR_NOT_EXISTS, `set_monitor_lock(...): failed to find monitor ${this.gdkmonitor2id(monitor)} to lock`);
            return;
        }

        if (status && _lock.get()) {
            _lock.set (!status);
        }
        
        _lock.set (status);
    }

    set_astal_monitor_lock (monitor: AstalHyprland.Monitor, status: boolean) {
        const _lock = this.monitor_locks.get (this.monitor2id(monitor));
        if (_lock === undefined) {
            log.error (err_num.MONITOR_NOT_EXISTS, `set_astal_monitor_lock(...): failed to find monitor ${this.monitor2id(monitor)} to lock`);
            return;
        }
        _lock.set (status);
    }

    expand_tilde (path: string) {
        return path.startsWith('~') ? GLib.get_home_dir() + path.slice(1) : path;
    }

    async run_app (exec: string, name: string = 'Undefined') {
        exec = exec.replaceAll ('%U', '').replaceAll('%F', '').replaceAll('%f', '').replace('%u', '');
        await execAsync (['bash', '-c', exec]).catch ((err) => {
            Log.error (err_num.EXEC_ERROR, "Failed to run " + name + ". Msg: " + (err instanceof Error ? err.message : err));
        });
    }

    desktop_entries_source_bind () {
        let monitors: Gio.FileMonitor[] = [];
        let last_action: AstalIO01.Time|null = null;
        let monitor_cb = () => {
            last_action = waitLastAction (last_action, 500, () => {
                last_action = null;
                reload_app_list();
            });
        };
        let cb = this.config.subscribe ((n) => {
            for (let monitor of monitors) {
                monitor.cancel();
            }

            monitors = [];

            for (const source of n['desktop_entries_sources']) {
                const monitor = monitorFile (this.expand_tilde (source), monitor_cb);

                if (monitor != null) {
                    monitors.push(monitor);
                }
            }
        });

        this.on_destroy_cbs.add(async () => cb());
    }
};


export const desktop = new Desktop ('/home/Timur/.ags/config.json', App);