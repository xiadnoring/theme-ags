
import { Binding } from "astal";
import { Astal, Gdk, GLib, Gtk, Pango, Variable, Widget } from "../../lib/imports";

enum paramtype {
    INFO, SWITCH, SELECT, SLIDER, REVEALER
};

export function buildSettingParam (icon: string|Binding<string>, name: string|Binding<string>, description: string|Binding<string>, value: Variable<boolean>, cb: (v: boolean) => void): Gtk.Widget;
export function buildSettingParam (icon: string|Binding<string>, name: string|Binding<string>, description: string|Binding<string>): Gtk.Widget;
export function buildSettingParam (icon: string|Binding<string>, name: string|Binding<string>, description: string|Binding<string>, value: Variable<string>, cb: (v: string) => void, data: {value: string, name: string, describe: string}[]): Gtk.Widget;
export function buildSettingParam (icon: string|Binding<string>, name: string|Binding<string>|Binding<string>, description: string|Binding<string>, value: Variable<number>, cb: (v: number) => void, data: {min: number, max: number}): Gtk.Widget;
export function buildSettingParam (icon: string|Binding<string>, name: string|Binding<string>, description: string|Binding<string>, content: Gtk.Widget): Gtk.Widget;
export function buildSettingParam (icon: string|Binding<string>, name: string|Binding<string>, description: string|Binding<string>, content: Variable<Gtk.Widget>) : Gtk.Widget;

export function buildSettingParam (icon: string|Binding<string>, name: string|Binding<string>, description: string|Binding<string>, value?: any, cb?: (v: any) => void, data?: any): Gtk.Widget {
    let type : paramtype = paramtype.INFO;

    if (value === undefined || value === null) {
        type = paramtype.INFO;
    }
    else if (value instanceof Gtk.Widget || (value instanceof Variable && value.get() instanceof Gtk.Widget)) {
        type = paramtype.REVEALER;
    }
    else if (typeof value.get() == 'boolean') {
        type = paramtype.SWITCH;
    }
    else if (typeof value.get() == 'number' && data.min !== undefined && data.max !== undefined) {
        type = paramtype.SLIDER;
    }
    
    if (data instanceof Array) {
        type = paramtype.SELECT;
    }
    

    const destroy_cbs: (() => void)[] = [];
    let state_opened: Variable<boolean>|null = null;
    const boxend = new Widget.Box ({});

    switch (type) {
        case paramtype.SELECT:
        case paramtype.REVEALER:
            state_opened = Variable(false);
            boxend.children = ([<icon icon={state_opened().as(n => n ? "angle-down-symbolic" : "angle-up-symbolic")}></icon>]);
            break;
        case paramtype.SWITCH:
            const _switch = new Widget.Switch ({
                state: (value as Variable<boolean>)(),
            });

            _switch.connect ('state-set', (self, state) => {
                if (cb) cb (state);
            });

            boxend.children = ([_switch]);
            break;
    }
    const _desciption = (description: string) => <label halign={Gtk.Align.START} label={description} className="font-weight-400 font-1" selectable={false}></label>;
    const maindata = <centerbox valign={Gtk.Align.CENTER} className="settings-param p-3" hexpand={true}>
        <box valign={Gtk.Align.CENTER} halign={Gtk.Align.START} className={"gap-h-4"} orientation={Gtk.Orientation.HORIZONTAL}>
            <box halign={Gtk.Align.CENTER} valign={Gtk.Align.CENTER}>
                <label className="icon-material font-4" label={icon}></label>
            </box>
            <box orientation={Gtk.Orientation.VERTICAL} valign={Gtk.Align.CENTER}>
                <label halign={Gtk.Align.START} label={name} className="bold font-weight-600" selectable={false}></label>
                <label visible={description instanceof Binding ? description.as((n) => n.length != 0) : description.length != 0} halign={Gtk.Align.START} label={description} className="font-weight-400 font-1" selectable={false}></label>
            </box>
        </box>
        <box valign={Gtk.Align.CENTER} halign={Gtk.Align.CENTER}></box>
        <box valign={Gtk.Align.CENTER} halign={Gtk.Align.END}>{boxend}</box>
    </centerbox>;

    const containerchildren: Gtk.Widget[] = [maindata];

    const choises: Gtk.Widget[] = [];
    let revealer_select: Widget.Revealer|null = null;

    if (value !== undefined) {
        switch (type) {
            case paramtype.SELECT: {
                for (const param of (data as {value: any, name: string, describe: string}[])) {
                    choises.push(<button onClicked={() => {
                        if (value.get() == param.value) { return; }
                        if (cb) { value.set(param.value); cb (param.value); }
                        revealer_select?.set_reveal_child(false);
                        state_opened?.set(false);
                    }} className={(value as Variable<string>)().as((n) => ['settings-select-btn py-3', n == param.value ? 'btn-square2 btn-active rounded-4' : 'btn-square rounded-4'].join(' '))}>
                        <box halign={Gtk.Align.START} valign={Gtk.Align.CENTER} orientation={Gtk.Orientation.VERTICAL}>
                            <label label={param.name} halign={Gtk.Align.START} className="font-weight-500" ellipsize={Pango.EllipsizeMode.END}></label>
                            <label label={param.describe} halign={Gtk.Align.START} className="font-weight-300" ellipsize={Pango.EllipsizeMode.END}></label>
                        </box>
                    </button>);
                }

                const selectdata = new Widget.Box ({
                    className: "p-2 gap-v-2",
                    children: choises,
                    orientation: Gtk.Orientation.VERTICAL
                });

                revealer_select = new Widget.Revealer ({
                    reveal_child: false,
                    child: selectdata
                });
                containerchildren.push(revealer_select);
                break;
            }
            case paramtype.SLIDER: {
                destroy_cbs.push((value as Variable<number>).subscribe ((n) => {
                    n = Number(n.toFixed(2));
                    if (cb) {cb (n);}
                }));
                containerchildren.push(new Widget.Box ({
                    hexpand: true,
                    child: new Widget.Slider ({
                        hexpand: true,
                        max: data.max,
                        min: data.min,
                        value: (value as Variable<number>)(),
                        onDragged: (self) => {
                            value.set(self.value);
                        }
                    }),
                    className: "px-5"
                }));
                break;
            }
            case paramtype.REVEALER: {
                revealer_select = new Widget.Revealer ({
                    child: (value instanceof Variable ? value() : value),
                    hexpand: true
                });
                containerchildren.push(revealer_select);
                break;
            }
        }
    }
    const classNameDefault = 'btn-square2 btn rounded-4';
    const container = new Widget.Box ({
        hexpand: true,
        onDestroy: () => {
            for (const cb of destroy_cbs) {
                cb();
            }
        },
        className: classNameDefault,
        child: new Widget.Box ({
            orientation: Gtk.Orientation.VERTICAL,
            children: [
                new Widget.EventBox ({
                    onHover: (self, event) => {
                        container.set_class_name (classNameDefault + ' btn-hover');
                        return Gdk.EVENT_STOP;
                    },
                    onHoverLost: (self, event) => {
                        container.set_class_name (classNameDefault);
                        return Gdk.EVENT_STOP;
                    },
                    onButtonPressEvent: (self, event) => {
                        container.set_class_name (classNameDefault + ' btn-active');
                        return Gdk.EVENT_STOP;
                    },
                    onButtonReleaseEvent: (self, event) => {
                        container.set_class_name (classNameDefault + ' btn-hover');
                        return Gdk.EVENT_STOP;
                    },
                    onClick: (self, event) => {
                        if (revealer_select !== null) {
                            revealer_select.set_reveal_child(!revealer_select.get_reveal_child());
                            state_opened?.set(revealer_select.get_reveal_child() ?? false);
                        }
                    },
                    child: new Widget.Box ({
                        orientation: Gtk.Orientation.VERTICAL,
                        children: containerchildren
                    })
                })
            ],
        })
    });

    return container;
    
}