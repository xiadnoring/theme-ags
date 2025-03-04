import { App, Astal, BindableProps, ConstructProps, Gdk, Gtk, Widget, astalify } from 'astal/gtk3';
import GLib from "gi://GLib";
import Pango from "gi://Pango";
import Gio from "gi://Gio";
import { exec, execAsync } from 'astal/process';
import { log } from './error';
import { Variable } from 'astal/variable';
import { interval, timeout, idle } from "astal/time"

export {
    Gio,
    Variable,
    App,
    Astal,
    BindableProps,
    ConstructProps,
    Gtk,
    Gdk,
    Widget,
    astalify,
    GLib,
    Pango,
    exec,
    execAsync,
    interval,
    timeout,
    log as Log
}