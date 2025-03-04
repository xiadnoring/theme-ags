import { Variable } from 'astal/variable';
import { Gio, GLib, Gtk, Log } from '../lib/imports';
import { AgsError, err_num } from '../lib/error';
import type wpT from 'gi://AstalWp';


class AudioDevice {
    destroy_callbacks: (() => void)[];
    onupdate: Set <(wp: wpT.Wp|null) => void>;
    wp: typeof import("gi://AstalWp")|null = null;
    ondevicechange: number|null;

    constructor () {
        this.destroy_callbacks = [];
        this.onupdate = new Set ();
        this.wp = null;
        this.ondevicechange = null;
    }

    async reload () {
        try {
            //imports.mainloop.source_remove();
            this.wp = await import("gi://AstalWp");
        
        
            this.ondevicechange = this.get ().connect ('device-removed', (self) => {
                const dev = self.get_devices();
                if (dev === null || dev.length == 0) {
                    console.log('set timeout');
                    setTimeout (() => this.reload().catch (e => console.error (e)), 1000);
                }
            });
        }
        catch (e) {
            if (e instanceof AgsError) {
                Log.debug (`WirePlumber: reload service failed: ${e.errnum}, ${e.message}`);
            }
        }
        
        if (this.wp !== null) {
            for (const cb of this.onupdate) {
                cb (this.wp.default.get_default());
            }
        }
    }

    exists () {
        return this.wp !== null && this.wp.default.get_default () !== null;
    }

    get () {
        if (this.wp === null) {
            throw new AgsError (err_num.AUDIO_SERVICE_ERROR, "wp module wasn't loaded");
        }
        const wp1 = this.wp.default.Wp.get_default ();
        if (wp1 === null) {
            throw new AgsError (err_num.AUDIO_SERVICE_ERROR, "wp bind failed");
        }

        return wp1;
    }

    default_speaker (): wpT.Endpoint {
        const speaker = this.get().get_default_speaker ();
        if (speaker === null) {
            throw new AgsError (err_num.AUDIO_SERVICE_ERROR, "default speaker bind failed");
        }
        return speaker;
    }

    on_service_update (cb: (wp: wpT.Wp|null) => void) {
        this.onupdate.add (cb);
        cb (this.wp===null?null:this.get());
        return () => { this.onupdate.delete (cb); };
    }

    ondestroy (cb: () => void) {
        this.destroy_callbacks.push(cb);
    }

    destroy () {
        for (const cb of this.destroy_callbacks) {
            cb ();
        }

        this.onupdate.clear();
        this.destroy_callbacks = [];
    }
}

export const audio_device = new AudioDevice();