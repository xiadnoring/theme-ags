import GLib from 'gi://GLib';
import { AgsError, err_num } from '../../lib/error';


function mkdirpAsync (path: string, mode = 755, callback: (err: AgsError|null) => void) {
    const success = GLib.mkdir_with_parents (path, mode) == 0;
    if (success) { callback (null); }
    else { callback (new AgsError (err_num.FILE_MKDIRP, `Failed to create directory on the path: ${path}`)); }
} 

async function mkdirp (path: string, mode = 755): Promise<AgsError|null> {
    return new Promise ((resolve, reject) => {
        mkdirpAsync (path, mode, (e) => {
            if (e === null) { resolve (e); }
            else { reject (e); }
        });
    })
}

export default {
    mkdirp,
    mkdirpAsync
};