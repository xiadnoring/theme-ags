import PangoCairo from "gi://PangoCairo";
import Pango from "gi://Pango";
import { Gtk, Astal, Gdk, Widget } from "../lib/imports";
import AstalHyprland from "gi://AstalHyprland";
import Cairo from "gi://cairo";
import { GObject } from "astal/gobject";
import { execAsync } from "astal/process";
import { desktop } from "../lib/app";

const Lang = imports.lang;

const Hyprland = AstalHyprland.get_default();

const dummyWs = new Widget.Box({ className: 'bar-ws' }); // Not shown. Only for getting size props
const dummyActiveWs = new Widget.Box({ className: 'bar-ws bar-ws-active' }); // Not shown. Only for getting size props
const dummyOccupiedWs = new Widget.Box({ className: 'bar-ws bar-ws-occupied' }); // Not shown. Only for getting size props

export function hypland_prepare () {
    const binds: number[] = [];

    binds.push(Hyprland.connect ('client-moved', (source, client, ws) => {
        const monitor = client.get_monitor();
        desktop.set_astal_monitor_lock(monitor, false);
    }));

    desktop.on_destroy_cb (async () => {
        for (const bind of binds) {
            Hyprland.disconnect (bind);
        }
    });
}

const mix = (value1: number, value2: number, perc: number) => {
    return value1 * perc + value2 * (1 - perc);
}

type color = {
    red: number,
    green: number,
    blue: number,
    alpha: number
};

const getFontWeightName = (weight: Pango.Weight) => {
    switch (weight) {
        case Pango.Weight.ULTRALIGHT:
            return 'UltraLight';
        case Pango.Weight.LIGHT:
            return 'Light';
        case Pango.Weight.NORMAL:
            return 'Normal';
        case Pango.Weight.BOLD:
            return 'Bold';
        case Pango.Weight.ULTRABOLD:
            return 'UltraBold';
        case Pango.Weight.HEAVY:
            return 'Heavy';
        default:
            return 'Normal';
    }
}

class DrawingArea extends Widget.DrawingArea {
    static { GObject.registerClass({ GTypeName: "CustomDrawingArea" }, this) }

    custom: {
        initialized: boolean,
        workspaceMask: number,
        workspaceGroup: number,
        updateMask: (self: Widget.DrawingArea) => void,
        toggleMask: (self: Widget.DrawingArea, occupied: boolean, name: string) => void,
        onchange: () => void
    }
    
    constructor (props: Widget.DrawingAreaProps, count: number) {
        super (props);

        this.custom = {
            initialized: false,
            workspaceMask: 0,
            workspaceGroup: 0,
            updateMask: (self: Widget.DrawingArea) => {
                const offset = Math.floor((Hyprland.focused_workspace.id - 1) / count) * 10;
                // if (self.attribute.initialized) return; // We only need this to run once
                const workspaces = Hyprland.get_workspaces();
                let workspaceMask = 0;
                for (let i = 0; i < workspaces.length; i++) {
                    const ws = workspaces[i];
                    const clients = ws.get_clients();
                    const id = ws.get_id();
                    if (id <= offset || id > offset + count) continue; // Out of range, ignore
                    if (clients.length > 0) {
                        workspaceMask |= (1 << (id - offset));
                    }
                }
                this.custom.workspaceMask = workspaceMask;
                // self.attribute.initialized = true;
                self.queue_draw();
            },
            toggleMask: (self: Widget.DrawingArea, occupied: boolean, name: string) => {
                if (occupied) this.custom.workspaceMask |= (1 << parseInt(name));
                else this.custom.workspaceMask &= ~(1 << parseInt(name));
                self.queue_draw();
            },
            onchange: () => {
                this.set_css(`font-size: ${(Hyprland.focused_workspace.id - 1) % count + 1}px;`);
                const previousGroup = this.custom.workspaceGroup;
                const currentGroup = Math.floor((Hyprland.focused_workspace.id - 1) / count);
                if (currentGroup !== previousGroup) {
                    this.custom.updateMask(this);
                    this.custom.workspaceGroup = currentGroup;
                }
            }
        };
    }
}

// Font size = workspace id
function WorkspaceContentsBar (count = 10) {
    let prevFocusedId: number = -1;
    const drawArea = new DrawingArea ({
        className: 'bar-ws-container',
        setup: (area) => area
            .hook(Hyprland, 'event', (self) => {drawArea.custom.updateMask(self); drawArea.custom.onchange();})
            //@ts-ignore
            .connect('draw', Lang.bind(area, (area, cr) => {
                const id = Hyprland.get_focused_workspace ().get_id();
                if (id != prevFocusedId) {
                    prevFocusedId = id;

                    // close all floating widgets
                    const monitor = Hyprland.get_focused_monitor();
                    desktop.set_astal_monitor_lock (monitor, false);
                }
                const offset = Math.floor((id - 1) / count) * 10;

                const allocation = area.get_allocation();
                const { width, height } = allocation;

                const workspaceStyleContext = dummyWs.get_style_context();
                const workspaceDiameter = workspaceStyleContext.get_property('min-width', Gtk.StateFlags.NORMAL) as number;
                const workspaceRadius = workspaceDiameter / 2;
                const workspaceFontSize = (workspaceStyleContext.get_property('font-size', Gtk.StateFlags.NORMAL) as number) / 4 * 3;
                const workspaceFontFamily = workspaceStyleContext.get_property('font-family', Gtk.StateFlags.NORMAL) as string[];
                const workspaceFontWeight = workspaceStyleContext.get_property('font-weight', Gtk.StateFlags.NORMAL) as number;
                const wsbg = workspaceStyleContext.get_property('background-color', Gtk.StateFlags.NORMAL) as color;
                const wsfg = workspaceStyleContext.get_property('color', Gtk.StateFlags.NORMAL) as color;

                const occupiedWorkspaceStyleContext = dummyOccupiedWs.get_style_context();
                const occupiedbg = occupiedWorkspaceStyleContext.get_property('background-color', Gtk.StateFlags.NORMAL) as color;
                const occupiedfg = occupiedWorkspaceStyleContext.get_property('color', Gtk.StateFlags.NORMAL) as color;

                const activeWorkspaceStyleContext = dummyActiveWs.get_style_context();
                const activebg = activeWorkspaceStyleContext.get_property('background-color', Gtk.StateFlags.NORMAL) as color;
                const activefg = activeWorkspaceStyleContext.get_property('color', Gtk.StateFlags.NORMAL) as color;
                area.set_size_request(workspaceDiameter * count, -1);
                const widgetStyleContext = area.get_style_context();
                const activeWs = widgetStyleContext.get_property('font-size', Gtk.StateFlags.NORMAL) as number;

                const activeWsCenterX = -(workspaceDiameter / 2) + (workspaceDiameter * activeWs);
                const activeWsCenterY = height / 2;
                // Font
                const layout = PangoCairo.create_layout(cr);
                const fontDesc = Pango.font_description_from_string(`${workspaceFontFamily[0]} ${getFontWeightName(workspaceFontWeight)} ${workspaceFontSize}`);
                layout.set_font_description(fontDesc);
                cr.setAntialias(Cairo.Antialias.BEST);
                // Get kinda min radius for number indicators
                layout.set_text("0".repeat(count.toString().length), -1);
                const [layoutWidth, layoutHeight] = layout.get_pixel_size();
                const indicatorRadius = Math.max(layoutWidth, layoutHeight) / 2 * 1.15; // smaller than sqrt(2)*radius
                const indicatorGap = workspaceRadius - indicatorRadius;
                
                for (let i = 1; i <= count; i++) {
                    if (drawArea.custom.workspaceMask & (1 << i)) {
                        // Draw bg highlight
                        cr.setSourceRGBA(occupiedbg.red, occupiedbg.green, occupiedbg.blue, occupiedbg.alpha);
                        const wsCenterX = -(workspaceRadius) + (workspaceDiameter * i);
                        const wsCenterY = height / 2;
                        if (!(drawArea.custom.workspaceMask & (1 << (i - 1)))) { // Left
                            cr.arc(wsCenterX, wsCenterY, workspaceRadius, 0.5 * Math.PI, 1.5 * Math.PI);
                            cr.fill();
                        }
                        else {
                            cr.rectangle(wsCenterX - workspaceRadius, wsCenterY - workspaceRadius, workspaceRadius, workspaceRadius * 2)
                            cr.fill();
                        }
                        if (!(drawArea.custom.workspaceMask & (1 << (i + 1)))) { // Right
                            cr.arc(wsCenterX, wsCenterY, workspaceRadius, -0.5 * Math.PI, 0.5 * Math.PI);
                            cr.fill();
                        }
                        else {
                            cr.rectangle(wsCenterX, wsCenterY - workspaceRadius, workspaceRadius, workspaceRadius * 2)
                            cr.fill();
                        }
                    }
                }

                // Draw active ws
                cr.setSourceRGBA(activebg.red, activebg.green, activebg.blue, activebg.alpha);
                cr.arc(activeWsCenterX, activeWsCenterY, indicatorRadius, 0, 2 * Math.PI);
                cr.fill();
                // Draw workspace numbers
                for (let i = 1; i <= count; i++) {
                    const inactivecolors = drawArea.custom.workspaceMask & (1 << i) ? occupiedfg : wsfg;
                    if (i == activeWs) {
                        cr.setSourceRGBA(activefg.red, activefg.green, activefg.blue, activefg.alpha);
                    }
                    // Moving to
                    else if ((i == Math.floor(activeWs) && id < activeWs) || (i == Math.ceil(activeWs) && id > activeWs)) {
                        cr.setSourceRGBA(mix(activefg.red, inactivecolors.red, 1 - Math.abs(activeWs - i)), mix(activefg.green, inactivecolors.green, 1 - Math.abs(activeWs - i)), mix(activefg.blue, inactivecolors.blue, 1 - Math.abs(activeWs - i)), activefg.alpha);
                    }
                    // Moving from
                    else if ((i == Math.floor(activeWs) && id > activeWs) || (i == Math.ceil(activeWs) && id < activeWs)) {
                        cr.setSourceRGBA(mix(activefg.red, inactivecolors.red, 1 - Math.abs(activeWs - i)), mix(activefg.green, inactivecolors.green, 1 - Math.abs(activeWs - i)), mix(activefg.blue, inactivecolors.blue, 1 - Math.abs(activeWs - i)), activefg.alpha);
                    }
                    // Inactive
                    else
                        cr.setSourceRGBA(inactivecolors.red, inactivecolors.green, inactivecolors.blue, inactivecolors.alpha);
                    
                    layout.set_text(`${i + offset}`, -1);
                    const [layoutWidth, layoutHeight] = layout.get_pixel_size();
                    const x = -workspaceRadius + (workspaceDiameter * i) - (layoutWidth / 2);
                    const y = (height - layoutHeight) / 2;
                    cr.moveTo(x, y);
                    PangoCairo.show_layout(cr, layout);
                    cr.stroke();
                }
            }))
    }, count);

    let clicked =  false;
    let ws_group = 0;
    let mx = false;

    return new Widget.EventBox ({
        onScroll: (self, e) => {
            if (mx) { return; }
            mx = true;
            
            if (e.delta_y >= 0) {
                Hyprland.message_async(`dispatch workspace +1`, (self, res) => {
                    mx = false;
                });
            }
            
            else {
                Hyprland.message_async(`dispatch workspace -1`, (self, res) => {
                    mx = false;
                });
            }
        },
        child: new Widget.Box({
            homogeneous: true,
            className: 'bar-group',
            children: [new Widget.Box({
                css: 'min-width: 2px;',
                children: [drawArea],
            })]
        }),
        setup: (self) => {
            self.add_events(Gdk.EventMask.POINTER_MOTION_MASK);
            self.connect ('motion-notify-event', (self, event: Gdk.Event) => {
                if (!clicked) return;
                const [_, cursorX, cursorY] = event.get_coords();
                const widgetWidth = self.get_allocation().width;
                const wsId = Math.ceil(cursorX * 10 / widgetWidth);
                execAsync ([`${desktop.configDir}/scripts/hyprland/workspace_action.sh`, 'workspace', `${wsId}`])
                    .catch(print);
            })
            self.connect('button-press-event', (self, event: Gdk.Event) => {
                if (event.get_button()[1] === 1) {
                    clicked = true;
                    const [_, cursorX, cursorY] = event.get_coords();
                    const widgetWidth = self.get_allocation().width;
                    const wsId = Math.ceil(cursorX * 10 / widgetWidth);

                    execAsync([`${desktop.configDir}/scripts/hyprland/workspace_action.sh`, 'workspace', `${wsId}`])
                        .catch(print);
                }
                else if (event.get_button()[1] === 8) {
                    Hyprland.message_async(`dispatch togglespecialworkspace`).catch(print);
                }
            })
            self.connect('button-release-event', (self) => clicked = false);
        }
    });
}

export default function WorkspaceContents () {
    return <box className="bar-group-margin">
        {WorkspaceContentsBar()}
    </box>
}