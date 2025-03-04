import { readFile, readFileAsync } from "astal";
import { execAsync, GLib, Gtk, Widget } from "../../lib/imports";
import { buildSettingParam } from "./SettingParam";
import { existsAsync } from "../../modules/fs";

function icon_by_distro (distro: string) {
    switch (distro) {
        case 'arch':
            return 'archlinux-icon';
        case 'ubuntu':
            return 'no';
    }

    return 'defaultlinux-symbolic';
}

async function parse_os_release() {
    let rows = (await readFileAsync ("/etc/os-release")).split('\n').map ((n) => n.split('='));
    let data: {[key: string]: string} = {};
    for(const row of rows) {
        data[row[0]] = row[1];
    }
    return data;
}

async function parse_cpu_info () {
    const cpus = (await execAsync (['bash', '-c', `cat /proc/cpuinfo  | grep 'name'| uniq -c`])).split('\n').map (
        n => n.trim().split(/\s(.*)/s)).map (n => [n[1].split(':')[1].trim(), n[0]]);

    return cpus;
}

async function parse_gpu_info () {
    const res: string[] = [];
    const gpus = (await execAsync (['bash', '-c', `lspci | grep ' VGA ' | cut -d" " -f 1 | xargs -i lspci -v -s {}`])).split('\n\n');
    for (const gpu of gpus) {
        const l = gpu.indexOf('[');
        const r = gpu.indexOf (']');
        res.push(gpu.slice (l + 1, r));
    }
    return res;
}

function formatBytes(bytes: number, decimals = 2) {
    if (!+bytes) return '0 Bytes'
    const k = 1024
    const dm = decimals < 0 ? 0 : decimals
    const sizes = ['Bytes', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

async function parse_memory_total () {
    const memory = Number((await execAsync (['bash', '-c', `grep MemTotal /proc/meminfo | awk '{print $2}'`])));
    return formatBytes (memory * 1024);
}

async function get_model () {
    if (await existsAsync ('/system/app') && await existsAsync ('/system/priv-app')) {
        return await execAsync (['bash', '-c', 'getprop ro.product.brand']) + ' ' + execAsync (['bash', '-c', 'getprop ro.product.model']);
    }
    if (await existsAsync ('/sys/devices/virtual/dmi/id/board_vendor') || await existsAsync ('/sys/devices/virtual/dmi/id/board_name')) {
        return await execAsync (['bash', '-c', 'cat /sys/devices/virtual/dmi/id/board_vendor']) + ' ' + await execAsync (['bash', '-c', 'cat /sys/devices/virtual/dmi/id/board_name']);
    }
    if (await existsAsync ('/sys/devices/virtual/dmi/id/product_name') || await existsAsync ('/sys/devices/virtual/dmi/id/product_version')) {
        return await execAsync (['bash', '-c', 'cat /sys/devices/virtual/dmi/id/product_name']) + ' ' + await execAsync (['bash', '-c', 'cat /sys/devices/virtual/dmi/id/product_version']);
    }
    if (await existsAsync ('/sys/firmware/devicetree/base/model')) {
        return await execAsync (['bash', '-c', 'cat /sys/firmware/devicetree/base/model']);
    }
    if (await existsAsync ('/tmp/sysinfo/model')) {
        return await execAsync (['bash', '-c', 'cat /tmp/sysinfo/model']);
    }
    return 'Computer';
}

async function get_props ()  {
    const os_release = await parse_os_release();
    const gpus = await parse_gpu_info();
    const cpus = await parse_cpu_info();
    const memory = await parse_memory_total();
    const props: {[key: string]: {description: string, icon: string}} = {};

    props['OS'] = {
        description: os_release["NAME"] ?? 'Linux',
        icon: 'computer'  
    };

    for (let i = 0; i < cpus.length; i++) {
        props["CPU-"+i] = {
            description: `${cpus[i][0]} (${cpus[i][1]})`,
            icon: 'memory'
        };
    }

    props["Memory"] = {
        description: memory,
        icon: 'memory_alt'
    };

    for (let i in gpus) {
        props[`GPU-${i}`] = {
            icon: 'memory_alt',
            description: gpus[i]
        };
    }

    props["Model"] = {
        description: await get_model (),
        icon: 'computer'
    };

    return {props, os_release};
}

async function build () {
    const boxprops = new Widget.Box ({
        orientation: Gtk.Orientation.VERTICAL,
        hexpand: true,
        expand: true,
        className: "gap-v-2"
    });

    const {props, os_release} = await get_props();
    const boxpropschildren: Gtk.Widget[] = [];
    for (const prop of Object.entries(props)) {
        boxpropschildren.push(buildSettingParam (prop[1].icon, prop[0], prop[1].description));
    }   
    boxprops._setChildren (boxpropschildren);

    return <box orientation={Gtk.Orientation.VERTICAL} hexpand={true} className={"gap-v-4"}>
        <icon css={"font-size: 20rem;"} icon={icon_by_distro(os_release['ID'])}></icon>
        {boxprops} 
    </box>;
}

export function ags_settings_about_system () {
    return {
        build,
        icon: 'desktop-colored',
        name: 'System'
    };
}