import { Variable } from 'astal/variable';
import { Gtk, Log, Astal, Gdk } from '../lib/imports';
import { audio_device } from '../services/SoundVolume';
import { AgsError } from '../lib/error';
import { AgsSoundBar } from '../widget/SoundBar';

function iconByState (): string {
    const default_icons = ['volume_mute', 'volume_down', 'volume_up'];
    try {
        if (audio_device.default_speaker().volume <= 0) { return 'volume_off'; }

        const i = Math.floor(audio_device.default_speaker().volume / 1.5 * (default_icons.length - 1));
        return default_icons[i];
    }
    catch (e) {
        if (e instanceof AgsError) {
            Log.debug (`Audio - iconByState(...): ${e.errnum}, ${e.message}`)
        }
    }

    return default_icons[0];
}

export const soundVolume = Variable (0);
export const soundVolumePercentage = soundVolume().as((n) => Math.round(n * 100));
export const iconVolumeState = Variable (iconByState());

audio_device.on_service_update ((wp) => {
    if (wp !== null) {
        soundVolume.set (audio_device.default_speaker ().volume);

        audio_device.default_speaker().connect ('notify', (self) => {
            iconVolumeState.set(iconByState());
            soundVolume.set(self.volume ?? 0);
        });
    }
});


export default function getAudioVolumnState (monitor: Gdk.Monitor, props: {percentage: boolean}) {
    return <eventbox onClick={(self, event) => {
        if (event.button == Astal.MouseButton.PRIMARY) {
            AgsSoundBar (monitor);
        }
    }} onScroll={(self, event) => {
        const vol = Math.max(0, Math.min(1.5, audio_device.default_speaker().volume - event.delta_y / 20));
        audio_device.default_speaker().set_volume (Math.round(vol * 100) / 100);
    }}>
        <box className="icon-box audio-volume-box" valign={Gtk.Align.CENTER}>
            <label className="icon-material font-1-5" label={iconVolumeState()} />
            {props.percentage ? <label label={soundVolumePercentage.as((n) => `${n}%`)} /> : null}
        </box>
    </eventbox>
}