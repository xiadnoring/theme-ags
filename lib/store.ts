import AstalIO01 from "gi://AstalIO";
import { GLib, timeout } from "./imports";

export function waitLastAction (lastAction: AstalIO01.Time|null, delay: number, callback: () => void): AstalIO01.Time {
    if (lastAction !== null) { lastAction.cancel(); }
    return timeout (delay, callback);
}