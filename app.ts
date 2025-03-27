import { App, Gst, Gtk } from "./lib/imports"
import { desktop } from "./lib/app"
import { hypland_prepare } from "./components/Workspaces";
import { audio_device } from "./services/SoundVolume";

Gtk.init(null);
Gst.init(null);

App.start({
    main() {
        desktop.bind_list_monitor_changes();
        desktop.desktop_entries_source_bind();

        hypland_prepare();

        /** services */
        audio_device.reload();
    }
});

App.add_icons (desktop.configDir + '/icons/default');
desktop.after_init ().catch (e => console.error (e));
