import { App, Astal, Gtk, Gdk } from "astal/gtk3"
import { Variable } from "astal"
import CurrentDate from "../components/CurrentDate"
import getProccessState from "../components/ProcessorState"
import getMemoryState from "../components/MemoryState"
import getBatteryState from "../components/BatteryState"
import WorkspaceContents from "../components/Workspaces"
import getAudioVolumnState from "../components/AudioVolumeState"
import { changeWallpaperButton } from "../components/ChangeWallpaperButton"
import ScreenSnipButton from "../components/ScreenSnipButton"
import { colorPickerButton } from "../components/ColorPicker"
import getLanguageState from "../components/LanguageState"
import getIdleInhibitorState from "../components/IdleInhibitorState"
import { desktop } from "../lib/app"
import getWifiState from "../components/WifiState"
import { settingsToggleBarButton } from "../components/SettingsToggle"
import { notificationsState } from "../components/NotificationsState"


export default function Bar(gdkmonitor: Gdk.Monitor) {
    return <window
        className="Bar"
        gdkmonitor={gdkmonitor}
        exclusivity={Astal.Exclusivity.EXCLUSIVE}
        anchor={Astal.WindowAnchor.TOP
            | Astal.WindowAnchor.LEFT
            | Astal.WindowAnchor.RIGHT}
        application={App}>

        <centerbox className="Space">
            <box halign={Gtk.Align.START}>
                <box className="left" >
                    {getProccessState()}
                    {getMemoryState()}
                </box>
            </box>

            <box className="center">
                <box>
                    {CurrentDate('datetime', 'en')}
                    {WorkspaceContents()}
                    <box className="gap-h-2" valign={Gtk.Align.CENTER}>
                        {changeWallpaperButton()}
                        {ScreenSnipButton()}
                        {colorPickerButton()}
                        {settingsToggleBarButton(gdkmonitor)}
                    </box>
                </box>
            </box>

            <box halign={Gtk.Align.END}>
                <box className="right gap-h-2">
                    {notificationsState(gdkmonitor)}
                    {getIdleInhibitorState()}
                    {getLanguageState()}
                    {getAudioVolumnState({percentage: false})}
                    {getWifiState()}
                    {getBatteryState({percentage: false})}
                </box>
            </box>
        </centerbox>
    </window>
}
