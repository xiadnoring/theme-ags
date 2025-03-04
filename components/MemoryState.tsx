import { Variable } from 'astal/variable';
import { Gtk } from '../lib/imports';

const memory_state = Variable (0).poll (5000, ["bash", "-c", `LANG=C free | awk '/^Mem/ {printf("%.2f\\n", ($3/$2) * 100)}'`]);

export default function getMemoryState () {
    return <box className="icon-box gap-h-2" valign={Gtk.Align.CENTER}>
        <label className="icon-material" label="memory_alt" />
        <label label={memory_state().as((n) => `${Math.round(n)}%`)} />
    </box>
}