import { execAsync } from "../../../../../usr/share/astal/gjs";
import { desktop } from "../lib/app";
import { Widget } from "../lib/imports";

export function colorPickerButton () {
    return <button className="btn btn-icon" onClick={(self, event) => {
        execAsync (['hyprpicker', '-a']).catch (print);
    }} label='colorize' />
}