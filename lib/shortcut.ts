import { Gdk } from "./imports";

const MODS : {[key: string]: Gdk.ModifierType} = {
    'Shift': Gdk.ModifierType.SHIFT_MASK,
    'Ctrl': Gdk.ModifierType.CONTROL_MASK,
    'Hyper': Gdk.ModifierType.HYPER_MASK,
    'Meta': Gdk.ModifierType.META_MASK
}

export const checkKeybind = (event: Gdk.Event, keybind: string) => {
    const pressedModMask = event.get_state()[1];
    const pressedKey = event.get_keyval()[1];
    const keys = keybind.split('+');
    for (let i = 0; i < keys.length; i++) {
        if (keys[i] in MODS) {
            if (!(pressedModMask & MODS[keys[i]])) {
                return false;
            }
        } else if (pressedKey !== Gdk[(`KEY_${keys[i]}` as keyof typeof Gdk)]) {
            return false;
        }
    }
    return true;
}