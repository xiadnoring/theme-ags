export enum err_num {
    FATAL,
    CONFIG_NOT_EXISTS,
    CONFIG_PARSE,
    CONFIG_IS_INVALID,
    FILE_APPEND_TO,
    FILE_RENAME,
    FILE_EXISTS,
    FILE_MKDIRP,
    FILE_CREATE,
    FILE_UNLINK,
    WALLPAPER_CHANGE,
    MONITOR_NOT_EXISTS,
    SHORTCUT_NOT_EXISTS,
    PROTECTION,
    FLOATING_WINDOW,
    DB_LOAD_ERROR,
    EXEC_ERROR,
    DB_ERROR,
    POWER_PROFILE_DOESNT_EXISTS,
    SETTINGS_PAGE_RENDER,
    NETWORK_ERROR,
    AUDIO_SERVICE_ERROR,
    NETWORK_SERVICE_ERROR,
    BATTERY_SERVICE_ERROR,
    CRONJOB_ERROR
};

export const err_msg = new Map <err_num, string> ([
    [err_num.FATAL, "Fatal error."],
    [err_num.CONFIG_NOT_EXISTS, "Config file not exists"],
    [err_num.CONFIG_PARSE, "Config parsing error during JSON.parse(...)"],
    [err_num.CONFIG_IS_INVALID, "Config is invalid"],
    [err_num.FILE_APPEND_TO, "File append to error"],
    [err_num.FILE_RENAME, "File rename error"],
    [err_num.FILE_EXISTS, "File check exists error"],
    [err_num.FILE_MKDIRP, "File mkdirp(...) error"],
    [err_num.FILE_CREATE, "File create error"],
    [err_num.FILE_UNLINK, "File unlink error"],
    [err_num.WALLPAPER_CHANGE, "Wallpaper change error"],
    [err_num.MONITOR_NOT_EXISTS, "Monitor not exists (out of range)"],
    [err_num.SHORTCUT_NOT_EXISTS, "The following shortcut not exists"],
    [err_num.PROTECTION, "The attack was repelled"],
    [err_num.FLOATING_WINDOW, "Floating window error"],
    [err_num.DB_LOAD_ERROR, "Failed to load db"],
    [err_num.EXEC_ERROR, "Exec error"],
    [err_num.DB_ERROR, "database error"],
    [err_num.SETTINGS_PAGE_RENDER, "Failed to render setting's page"],
    [err_num.NETWORK_ERROR, "Network Error"],
    [err_num.NETWORK_SERVICE_ERROR, "Network Service Error"],
    [err_num.AUDIO_SERVICE_ERROR, "Audio Service Error"],
    [err_num.BATTERY_SERVICE_ERROR, "Battery Service Error"],
    [err_num.CRONJOB_ERROR, "Cron Job Error"]
]);

export function get_errmsg_by_errnum (errnum: err_num) {
    return err_msg.get (errnum) ?? 'Not Found';
}

export class AgsError extends Error {
    errnum: err_num
    
    constructor (errnum: err_num, msg: string) {
        super (msg);

        this.errnum = errnum;
        this.message = msg;
    }

    debug () {
        console.error (`[${this.errnum}]: ${get_errmsg_by_errnum (this.errnum)}. ${this.message}.`);
        console.error (this.stack ?? 'stack not exists');
    }
}

class Log {

    constructor () {

    }

    debug (msg: string, ...args: any[]) {
        console.log (msg);
    }

    error (errnum: err_num, msg: string, ...args: any[]) {
        console.log(errnum, msg);
    }

    exception (e: any, msg?: string) {
        
    }
}

export const log = new Log ();