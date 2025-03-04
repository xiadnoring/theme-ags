import * as FileUtils from 'astal/file';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import { AgsError, err_num, log } from '../../lib/error';
import path from '../path';

export function writeFile (file: string, data: string, {...options}: {callback?: (err: any) => void}) {
    if (!data) {
        const f = Gio.File.new_for_path(file);
        f.create_async(Gio.FileCreateFlags.NONE,
            GLib.PRIORITY_DEFAULT, null, (f, e) => {
                const exists = GLib.file_test (file, GLib.FileTest.EXISTS);
                if (options.callback) { options.callback (exists ? null : new AgsError (err_num.FILE_CREATE, 'Failed to create the file on path ' + file)); }
            });
        return;
    }
    FileUtils.writeFileAsync (file, data).then (() => {
        if (options.callback) options.callback (null);
    }).catch (e => {
        if (options.callback) options.callback (e);
    });
}

export function readFile (file: string, {...options}: {callback?: (err: any|null, content: String) => void, encode?: 'utf8'}) {
    FileUtils.readFileAsync (file).then ((content) => {
        if (options.callback) options.callback (null, content);
    }).catch ((e) => {
        if (options.callback) options.callback (e, '');
    });
}


export function exists (file: string, {...options}: {callback: (exists: boolean) => void}) {
    (async () => {
        const exists = GLib.file_test (file, GLib.FileTest.EXISTS);
        if (options.callback) { options.callback (exists); }
    }) ().catch (e => {
        log.error (err_num.FILE_EXISTS, `failed to check file exists: ${e instanceof Error ? e.message : e}`);
        options.callback (false);
    });
}

export function rename (from: string, to: string, {...options}: {callback?: (err: AgsError|null) => void, progress?: ((progress: number) => void)|null}) {
    (async () => {
        const file = Gio.File.new_for_path (from);
        const result = file.move (Gio.File.new_for_path (to), Gio.FileCopyFlags.OVERWRITE, null, options.progress ?? null) ? null : new AgsError (err_num.FILE_RENAME, `rename(): Failed to rename file ${from} to ${to}`);
        if (options.callback) { options.callback (result); }
    }) ();
}

export function unlink (file: string, {...options}: {callback?: ((err: AgsError|null) => void)|null}) {
    (async () => {
        const result = GLib.unlink (file);
        if (options.callback) { options.callback (result == 0 ? null : new AgsError (err_num.FILE_UNLINK, `Failed to unlink file ${file}`)); }
    }) ();
}


export function appendFile (file: string, data: string, {...options}: {callback?: (err: AgsError|null) => void}) {
    const f = Gio.File.new_for_path (file);
    f.append_to_async (Gio.FileCreateFlags.PRIVATE, GLib.PRIORITY_DEFAULT, null, (source_object, res) => {
        if (source_object === null) {
            throw new AgsError (err_num.FILE_APPEND_TO, 'source_object === null, maybe file not exists.');
        }
        const ostream = source_object.append_to (Gio.FileCreateFlags.PRIVATE, null);
        ostream.write (new TextEncoder ().encode (data), null);
        if (options.callback) options.callback (null);
    });
}

export async function existsAsync (file: string): Promise<boolean> {
    return new Promise <boolean> ((resolve, reject) => {
        exists (file, {callback: (res) => {
            resolve (res);
        }});
    });
}

async function list_dir (path: string) : Promise <Gio.FileEnumerator> {
    const directory = Gio.File.new_for_path (path);
    const iter = new Promise<Gio.FileEnumerator>((resolve, reject) => {
        directory.enumerate_children_async (directory + '::*', Gio.FileQueryInfoFlags.NOFOLLOW_SYMLINKS, GLib.PRIORITY_DEFAULT, null, (self, res) => {
            try { resolve(directory.enumerate_children_finish (res)) }
            catch (e) { reject(e); }
        });
    }); 
    return iter;
}

async function is_file (path: string): Promise<boolean> {
    const file = Gio.File.new_for_path(path);
    const type = file.query_file_type (FileUtils.Gio.FileQueryInfoFlags.NOFOLLOW_SYMLINKS, null);
    return type == FileUtils.Gio.FileType.REGULAR;
}

async function is_directory (path: string): Promise<boolean> {
    const file = Gio.File.new_for_path(path);
    const type = file.query_file_type (FileUtils.Gio.FileQueryInfoFlags.NOFOLLOW_SYMLINKS, null);
    return type == FileUtils.Gio.FileType.DIRECTORY;
}

export default {
    rename,
    unlink,
    writeFile,
    readFile,
    exists,
    appendFile,
    list_dir,
    is_file,
    is_directory
}