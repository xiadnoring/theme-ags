import Astal30 from "gi://Astal";

export const isIcon = (icon: string) =>
    !!Astal30.Icon.lookup_icon(icon)