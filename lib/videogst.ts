import { Astal, Gdk, GLib, Gtk, Log, Pango, Variable, Gst, Gio } from "../lib/imports";
import { isGstVersionAtLeast, isGtkVersionAtLeast } from "./app";
import { err_num } from "./error";

let GstPlay = null;

try {
    // GstPlay is available from GStreamer 1.20+
    // @ts-ignore
    GstPlay = imports.gi.GstPlay;
}
catch (e) {
    if (e instanceof Error) {
        Log.exception (e, `GstPlay, or the typelib is not installed. Renderer will fallback to GtkMediaFile!`, err_num.IMPORT_ERROR);
    }
}


let GstAudio = null;
// Might not pre-installed on some distributions
try {
    //@ts-ignore
    GstAudio = imports.gi.GstAudio;
} catch (e) {
    Log.exception (e, 'GstAudio, or the typelib is not installed.', err_num.IMPORT_ERROR);
}

const haveGstPlay = GstPlay !== null;
const haveGstAudio = GstAudio !== null;
const haveContentFit = isGtkVersionAtLeast(4, 8);
const haveGraphicsOffload = isGtkVersionAtLeast(4, 14) && false;
const useGstGL = isGstVersionAtLeast(1, 24);

class VideoGst {
    forceGtk4PaintableSink_: boolean
    forceMediaFile_: boolean
    isEnableVADecoders_: boolean
    isEnableNvSl_: boolean
    contentFit_: number|null
    mute_: boolean
    nohide_: boolean
    dbus_: Gio.DBusExportedObject|null
    sharedPaintable_: null


    constructor () {
        this.forceGtk4PaintableSink_ = false
        this.forceMediaFile_ = false
        this.isEnableNvSl_ = false
        this.isEnableVADecoders_ = false
        this.mute_ = true
        this.contentFit_ = null
        this.nohide_ = false
        this.dbus_ = null
        this.sharedPaintable_ = null
    }

    setup () {
        this.exportDbus();
    }

    private exportDbus() {
        const dbusXml = `
        <node>
            <interface name="io.github.xiadnoring.ags-theme">
                <method name="setPlay"/>
                <method name="setPause"/>
                <property name="isPlaying" type="b" access="read"/>
                <signal name="isPlayingChanged">
                    <arg name="isPlaying" type="b"/>
                </signal>
            </interface>
        </node>`;

        this.dbus_ = Gio.DBusExportedObject.wrapJSObject(
            dbusXml,
            this
        );
        this.dbus_.export(
            Gio.DBus.session,
            '/io/github/xiadnoring/ags-theme'
        );
    }

    private unexportDbus() {
        this.dbus_?.unexport();
    }

    private setupGst () {
        // Software libav decoders have "primary" rank, set Nvidia higher
        // to use NVDEC hardware acceleration.
        this.setPluginDecodersRank(
            'nvcodec',
            Gst.Rank.PRIMARY + 1,
            this.isEnableNvSl_
        );

        // Legacy "vaapidecodebin" have rank "primary + 2",
        // we need to set VA higher then that to be used
        if (this.isEnableVADecoders_)
            this.setPluginDecodersRank('va', Gst.Rank.PRIMARY + 3);
    }

    private setPluginDecodersRank(pluginName: string, rank: number, useStateless: boolean = false) {
        let gstRegistry = Gst.Registry.get();
        let features = gstRegistry.get_feature_list_by_plugin(pluginName);

        for (let feature of features) {
            let featureName = feature.get_name();

            if (
                !featureName || (
                !featureName.endsWith('dec') &&
                !featureName.endsWith('postproc'))
            )
                continue;

            let isStateless = featureName.includes('sl');

            if (isStateless !== useStateless)
                continue;

            let oldRank = feature.get_rank();

            if (rank === oldRank)
                continue;

            feature.set_rank(rank);
            console.debug(`changed rank: ${oldRank} -> ${rank} for ${featureName}`);
        }
    }

    widget () {
        let widget = this.getWidgetFromSharedPaintable();
    }

    private getWidgetFromSharedPaintable() {
        if (this.sharedPaintable_) {
            let picture = new Gtk.Picture({
                hexpand: true,
                vexpand: true,
            });

            // if (haveContentFit)
            //     picture.set_content_fit(this.contentFit_);
            // this.pictures_.push(picture);

            if (haveGraphicsOffload) {
                //@ts-ignore
                let offload = Gtk.GraphicsOffload.new(picture);
                //@ts-ignore
                offload.set_enabled(Gtk.GraphicsOffloadEnabled.ENABLED);
                return offload;
            }

            return picture;
        }
        return null;
    }
}