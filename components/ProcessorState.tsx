import { Variable } from 'astal/variable';
import { Gtk } from '../lib/imports';

const processor_state = Variable (0).poll (5000, ["bash", "-c", "LANG=C top -bn1 | grep Cpu | sed 's/\\,/\\./g' | awk '{print $2}'"]);

export default function getProccessState () {
    return <box className="icon-box gap-h-2" valign={Gtk.Align.CENTER}>
        <label className="icon-material" label="memory" />
        <label label={processor_state().as((n) => `${n}%`)} />
    </box>
}