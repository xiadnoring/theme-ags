import { Astal, astalify, ConstructProps, Gtk } from "./imports";
import GObject, { register } from "astal/gobject"

export class TextView extends astalify(Gtk.TextView) {
    static { GObject.registerClass(this) }

    constructor (props: ConstructProps<TextView, Gtk.TextView.ConstructorProps>) {
        super (props as any);
    }
}

export class GtkMenu extends astalify(Gtk.Menu) {
    static { GObject.registerClass(this) }

    constructor (props: ConstructProps<GtkMenu, Gtk.Menu.ConstructorProps>) {
        super (props as any);
    }
}

export class GtkMenuItem extends astalify(Gtk.MenuItem) {
    static { GObject.registerClass(this) }

    constructor (props: ConstructProps<GtkMenuItem, Gtk.MenuItem.ConstructorProps>) {
        super (props as any);
    }
}

// export class GtkMenuButton extends astalify(Gtk.MenuButton) {
//     static { GObject.registerClass(this) }

//     constructor (props: ConstructProps<GtkMenuButton, Gtk.MenuButton.ConstructorProps>) {
//         super (props as any);
//     }
// }

export class GtkGrid extends astalify(Gtk.Grid) {
    static { GObject.registerClass(this) }

    constructor (props: ConstructProps<GtkGrid, Gtk.Grid.ConstructorProps, { children: [] }>) {
        super (props as any);
    }
}
