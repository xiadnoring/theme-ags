import { desktop } from "../../lib/app";
import { formateDate } from "../../lib/date";
import { AgsError, err_num } from "../../lib/error";
import { Astal, execAsync, Gdk, GLib, Gtk, Log, Pango, Variable, Widget } from "../../lib/imports";
import { before_delete } from "../../lib/ondestroy";


const active_cron_jobs: {[key: string]: GLib.Source} = {};

function cinterval2number (interval: string) {
    let n = 0

    const check_number = (n: number) => {
        if (n <= 0) {
            throw new AgsError (err_num.CRONJOB_ERROR, "Interval can't be less or equal 0");
        }
    };

    try {
        n = parseInt(interval);
        check_number(n);

        return n;
    }
    catch (e) {
        /** not only digits */
    }

    for (const part of interval.split (' ')) {
        if (!part || part.length == 1) {
            continue;
        }

        const ns = part.substring (0, part.length-1);
        const ts = part.substring (part.length-1, part.length);
        let localn = 0;

        try {
            localn = parseInt(ns);
        }
        catch (e) {
            /** error */
            throw new AgsError (err_num.CRONJOB_ERROR, "Failed to parse number: " + part + ". Message: " + (e instanceof Error ? e.message : 'no message here'));
        }

        check_number(localn);

        switch (ts) {
            case 'h':
                localn *= 60 * 60;
                break
            case 'm':
                localn *= 60;
                break
            case 's':
                break
            default:
                throw new AgsError (err_num.CRONJOB_ERROR, "Invalid time type: " + ts + ". Available h, m, s only.");
        }

        n += localn;
    }

    check_number(n);

    return n;
}

async function executecronjob (id: string, exec: string) {
    try {
        await execAsync (exec);
        const nums = await desktop.databases["crontab"].async_update ({id}, { $set: { last_execution: Date.now() } }, { upsert: false });
    }
    catch (e) {
        Log.error (err_num.CRONJOB_ERROR, `executecronjob failed by error: ${(e instanceof Error ? e.message : 'unknown')} for cronjob with ID: ${id}`);
    }
}

export async function startupcronjobs () {
    /** on app startup */
    if (active_cron_jobs.length) {
        Log.debug (`possible bug: Cron Job already have jobs on system startup. ${active_cron_jobs.length}`);
    }
    const jobs = await get_cron_jobs ();
    for (const job of jobs) {
        active_cron_jobs[job.id] = setInterval (() => executecronjob (job.id, job.exec), job.interval * 1000);
    }
}

function createcronjob(id: string, exec: string, interval: string, cb: () => void) {
    if (!id || !exec || !interval) { return; }

    const n = cinterval2number(interval);
    desktop.databases["crontab"].insert ({id, exec, interval: n, last_execution: 0}, (err:Error|null, result: any) => {
        if (err!==null) { return Log.error (err_num.CRONJOB_ERROR, `Failed to add new cron job to db. Received message: ${err.message}`); }

        /** start cron job */
        active_cron_jobs[id] = setInterval (() => executecronjob(id, exec), n * 1000);
        cb();
    });
}

function form4newjob (prev_window: Gtk.Widget|null, bd: before_delete, monitor: Gdk.Monitor, cb: () => void) {
    if (prev_window) {
        prev_window.destroy();
    }

    let id: string = '', exec: string = '', interval = '';

    const window = <window keymode={Astal.Keymode.ON_DEMAND} className="bg-transparent" gdkmonitor={monitor} name="form4newcronjob">
        <box vertical css="min-width: 500px;" className="bg-widget border border-1 border-secondary gap-v-4 p-5 rounded-4">
            <box>
                <label className="bold" label={"New Cron Job"}></label>
            </box>
            <box vertical className="gap-v-3">
                <box vertical className={"gap-v-2"}>
                    <label halign={Gtk.Align.START} label={"ID"}></label>
                    <entry hexpand={true} onChanged={(self) => id = self.get_text()}></entry>
                </box>
                <box vertical className={"gap-v-2"}>
                    <label halign={Gtk.Align.START} label={"Exec"}></label>
                    <entry hexpand={true} onChanged={(self) => exec = self.get_text()}></entry>
                </box>
                <box vertical className={"gap-v-2"}>
                    <label halign={Gtk.Align.START} label={"Interval (0h 0m 0s, 0000)"}></label>
                    <entry hexpand={true} onChanged={(self) => interval = self.get_text()}></entry>
                </box>
                <box halign={Gtk.Align.END} className={"gap-h-2"}>
                    <button label={"Cancel"} onClick={() => window.hide()}></button>
                    <button label={"Save"} onClick={() => {
                        window.hide();
                        createcronjob(id, exec, interval, cb);
                    }}></button>
                </box>
            </box>
        </box>
    </window>;

    return window;
}

async function get_cron_jobs () : Promise<{id: string, exec: string, interval: number, last_execution: number}[]> {
    try {
        return await desktop.databases["crontab"].async_find ({}, {id: 1, exec: 1, interval: 1, last_execution: 1});
    }
    catch (e) {
        Log.error (err_num.CRONJOB_ERROR, "Failed to get cron jobs: " + (e instanceof Error ? e.message : 'unknown'));
    }
    return [];
}

async function build (monitor: Gdk.Monitor) {
    const bd = new before_delete ();
    let destroyed = false;
    let current_window: Gtk.Widget|null=null;

    const cron_jobs = new Widget.Box ({
        children: [],
        className: "gap-v-2",
        hexpand: true
    });

    bd.add (() => current_window?.destroy());
    bd.add (() => destroyed = true);

    function resolvegui () {
        for (const child of cron_jobs.get_children()) {
            cron_jobs.remove(child);
        }
        
        get_cron_jobs().then ((n) => {
            if (destroyed) { /** destroyed */ return; }
            for (const cronjob of n) {
                let defaultclassnames = ['btn-square2','btn','rounded-4', 'px-3', 'py-2'];
                let classnames: Variable<string[]> = Variable (defaultclassnames);
                let cronjobel = <eventbox onHover={(self) => classnames.set([...defaultclassnames, 'btn-hover'])} 
                        onHoverLost={(self) => classnames.set(defaultclassnames)}>
                    <centerbox className={classnames().as(n => n.join(' '))} vexpand={false} hexpand={true}>
                        <box>
                            <label ellipsize={Pango.EllipsizeMode.MIDDLE} className={"font-1-5 bold"} label={cronjob.id}></label>
                        </box>
                        <box halign={Gtk.Align.CENTER}>
                            <label className={""} ellipsize={Pango.EllipsizeMode.END} label={cronjob.last_execution ? (formateDate(new Date(cronjob.last_execution), {type: 'datetime', timeformat: 'en'})) : 'no execution'}></label>
                        </box>
                        <box halign={Gtk.Align.END}>
                            <button className={"btn font-1-5 icon-material"} onClick={() => {
                                desktop.databases["crontab"].remove({id: cronjob.id}, {}, (err: null|Error, numRemoved: number) => {
                                    /** check error */
                                    if (err !== null) { return Log.error (err_num.CRONJOB_ERROR, `Failed to delete cron job from db. Received message: ${err.message}`); }
                                    if (destroyed) { /** destroyed */ return; }

                                    if (cronjob.id in active_cron_jobs) {
                                        /** stop active interval */
                                        clearInterval(active_cron_jobs[cronjob.id]);
                                        delete active_cron_jobs[cronjob.id];
                                    }

                                    /** remove GUI */
                                    cron_jobs.remove(cronjobel);
                                    cronjobel.destroy();
                                });
                            }} label={"delete"}></button>
                        </box>
                    </centerbox>
                </eventbox>;
                cron_jobs.add (cronjobel);
            }
        });
    }

    resolvegui();

    return <box className={"gap-v-4"} onDestroy={() => bd.call()} vertical={true} hexpand={true}>
        <centerbox hexpand={true}>
            <box></box>
            <box></box>
            <box halign={Gtk.Align.END}>
                <button label="Add Job" onClick={() => {
                    /** show form for new job */
                    current_window = form4newjob(current_window, bd, monitor, () => resolvegui());
                }}></button>
            </box>
        </centerbox>
        <box hexpand={true}>
            <scrollable hexpand={true} hscrollbarPolicy={Gtk.PolicyType.NEVER} vscrollbarPolicy={Gtk.PolicyType.AUTOMATIC}>
                {cron_jobs}
            </scrollable>
        </box>
    </box>;
}


export function ags_settings_cron_tab () {
    return {
        build,
        icon: 'desktop-colored',
        name: 'Crontab'
    };
}