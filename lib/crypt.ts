import { execAsync } from "astal";
import path from "../modules/path";
import fs from "../modules/fs";

export async function sha256files (pathes: string[]): Promise<string> {
    let files: string[] = [];
    const cb = async (p: string) => { 
        for (const file of await fs.list_dir(p)) {
            const p1 = path.join(p, file.get_name());
            if (await fs.is_file(p1)) {
                files.push(p1);
            }
            if (await fs.is_directory(p1)) {
                await cb (p1);
            }
        }
    }; 
    for (const p of pathes) {
        if (await fs.is_file(p)) {
            files.push(p);
        }
        if (await fs.is_directory(p)) {
            await cb (p);
        }
    }
    let current_scss_source_hash = (await execAsync (['bash', '-c', `sha256sum ${files.join(' ')} | sha256sum`]));
    if (current_scss_source_hash.indexOf(' ') != -1) { current_scss_source_hash=current_scss_source_hash.split(' ')[0]; }
    return current_scss_source_hash;
}