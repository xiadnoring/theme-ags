import NM10 from "gi://NM";
import { active_access_point, active_internet_state, network } from "../../lib/app";
import { execAsync, Gio, GLib, Gtk, interval, Log, Variable, Widget } from "../../lib/imports";
import { buildSettingParam } from "./SettingParam";
import AstalNetwork01 from "gi://AstalNetwork";
import { err_num } from "../../lib/error";

export const WifiSettingPageName = 'Network';

const network_wifi_icon_states = ["network_wifi_1_bar_locked", "network_wifi_2_bar_locked", "network_wifi_3_bar_locked"];
type wifi_list_t = {[key: string]: {gtk: Gtk.Widget, strength: Variable <number>, cbs: (() => void)[]}};

function network_wifi_icon_by_strength (strength: number) {
    return network_wifi_icon_states[Math.round(strength / 100 * (network_wifi_icon_states.length - 1))];
}

function find_uuid_by_connection (active_conn: AstalNetwork01.AccessPoint) {
    const client = network.get_client();
    const connections = client.get_connections();
    for (const connection of connections) {
        if (connection.get_id() == active_conn.get_ssid()) {
            return connection.get_uuid();
        }
    }
    return null;
}

async function _fetch_current_networks (gwifilist: Widget.Box, wifilist: wifi_list_t) {
    try {
        const wifi = network.get_wifi();
        if (wifi) {
            const connections = wifi.get_access_points();
            const _disabled_networks = new Set (Object.keys(wifilist));
            for (const connection of connections) {
                _disabled_networks.delete(connection.get_bssid());
                if (connection.get_bssid() in wifilist == false) {
                    const strength_v = Variable (connection.get_strength());

                    /** status message state */
                    let state: Variable<'status'|'password'> = Variable('status');

                    /** was destroyed */
                    let destroyed_flag = false;

                    /** password */
                    const entry = new Widget.Entry ({
                        name: "password",
                        placeholder_text: "Password",
                        hexpand: true,
                        primary_icon_name: "key-symbolic",
                        editable: true
                    });

                    /** status */
                    let btn_connect_state_label = () => new Widget.Label ({
                        label: "Connected",
                        className: "text-gray"
                    });

                    /** additional message */
                    let wifi_status = Variable ('Protected');

                    /** btn connect */
                    let btn_connect_state_connect = () => new Widget.Button({
                        onClicked: () => {
                            execAsync (`/home/Timur/Desktop/WorkSpace/NetworkManager/build/src/nmcli/nmcli device wifi connect ${connection.get_bssid()}`).catch ((e) => {
                                if (e instanceof Gio.IOErrorEnum) {
                                    const msg2 = 'Error: Connection activation failed: Secrets were required, but not provided.';
                                    if (e.message.indexOf(msg2)>=0) {
                                        state.set('password');
                                    }
                                    const msg3 = `Warning: password for '802-11-wireless-security.psk' not given in 'passwd-file' and nmcli cannot ask without '--ask' option.`;
                                    if (e.message.indexOf(msg3)>=0) {
                                        state.set('password');
                                    }
                                }
                            });
                        },
                        className: "btn-square font-weight-400",
                        label: "Connect"
                    });

                    /** Log In btn */
                    let btn_connect_state_auth = () => new Widget.Button({
                        onClicked: () => {
                            const ex = `/home/Timur/Desktop/WorkSpace/NetworkManager/build/src/nmcli/nmcli device wifi connect ${connection.get_bssid()} password ${entry.get_buffer().get_text()}`;
                            execAsync (ex).catch ((e) => {
                                if (destroyed_flag) {
                                    /** was destroyed */
                                    Log.exception (e, 'Wi-Fi connection failed');
                                    return;
                                }

                                if (e instanceof Gio.IOErrorEnum) {
                                    wifi_status.set (e.message);

                                    const msg1 = 'Error: 802-11-wireless-security.key-mgmt: property is missing.';
                                    if (e.message.indexOf(msg1)>=0) {
                                        Log.error (err_num.NETWORK_ERROR, `We got ${msg1}.\nYou can try to install 'iwd' and add\n[device]\nwifi.backend=iwd\nto '/etc/NetworkManager/conf.d/wifi_backend.conf'`);
                                    }
                                }
                                else {
                                    wifi_status.set ('Unexpected error')
                                }
                                
                            }).finally (() => {
                                if (destroyed_flag) {
                                    /** was destroyed */
                                    return;
                                }

                                entry.get_buffer().set_text('', 0);
                                state.set('status');
                            });
                        },
                        className: "btn-square font-weight-400",
                        label: "Log In"
                    });

                    /** update status message callback */
                    let update_state = () => {
                        const isit = connection.get_bssid() == active_access_point.get()?.get_bssid();

                        if (isit) {
                            const need_auth = (wifi.get_state() == AstalNetwork01.DeviceState.NEED_AUTH);
                            
                            if (need_auth) { 
                                state.set('password'); 
                            }
                            else if (wifi.get_state() == AstalNetwork01.DeviceState.ACTIVATED) {
                                state.set('status');
                            }

                        }
                    }
                    const connection_status = (n: AstalNetwork01.Internet) => active_access_point.get()?.get_bssid() == connection.get_bssid() && n==AstalNetwork01.Internet.CONNECTED ? btn_connect_state_label() : btn_connect_state_connect();
                    
                    let btn_connect_v: Variable<Gtk.Widget> = Variable(connection_status(active_internet_state.get()));
                    const wifi_connection_g = <centerbox onDestroy={() => destroyed_flag = true} className={"py-2 px-4"}>
                        <box>
                            <stack shown={state()}>
                                {entry}
                                <label name="status" halign={Gtk.Align.START} className="text-gray" label={wifi_status()}></label>
                            </stack>
                        </box>
                        <box></box>
                        <box halign={Gtk.Align.END}>
                            {btn_connect_v()}
                        </box>
                    </centerbox>;
                    
                    const cbs: (() => void)[] = [
                        active_access_point.subscribe(update_state),
                        state.subscribe (n => {
                            return btn_connect_v.set((n == 'password' ? btn_connect_state_auth() : connection_status(active_internet_state.get())));
                        }),
                        active_internet_state.subscribe (n => {
                            return btn_connect_v.set((state.get() == 'password' ? btn_connect_state_auth() : connection_status(n)));
                        }),
                    ];

                    wifilist[connection.get_bssid()] = {
                        gtk: buildSettingParam (strength_v().as((n) => network_wifi_icon_by_strength(n)), 
                                `${connection.get_ssid()??''} (${connection.get_bssid()??''})`, 
                                active_access_point().as((n) => n?.get_bssid() == connection.get_bssid() ? 'Connected' : '' ), 
                                wifi_connection_g),
                        strength: strength_v,
                        cbs
                    }

                    gwifilist.add_child (new Gtk.Builder(), wifilist[connection.get_bssid()].gtk, null);
                }
            }
            for (const disabled_network of _disabled_networks) {
                gwifilist.remove(wifilist[disabled_network].gtk);
                wifilist[disabled_network].cbs.map (n => n());
                wifilist[disabled_network].gtk.destroy();
                
                delete wifilist[disabled_network];
            }
        }
    }
    catch (e) {
        Log.error (err_num.FATAL, "Failed to get wifi access points. " + (e instanceof Error ? e.message : ''));
    }
}

async function build () {
    const boxprops = new Widget.Box ({
        orientation: Gtk.Orientation.VERTICAL,
        hexpand: true,
        expand: true,
        className: "gap-v-2"
    });

    const destroy_cbs: (() => void)[] = [];

    const boxpropschildren: Gtk.Widget[] = [];
    

    const wifi = network.get_wifi();
    let wifi_state = Variable (wifi?.enabled ?? false);
    
    
    boxpropschildren.push(buildSettingParam('network_manage', 'Wireless Network', 'Enable/Disable', wifi_state, (v: boolean) => {
        if (wifi) {
            wifi.set_enabled(v);
        }
    }));
    
    const netclient = network.get_client();

    const wifilist: wifi_list_t = {};
    const gwifilist = new Widget.Box ({
        hexpand: true,
        orientation: Gtk.Orientation.VERTICAL,
        className: "gap-v-2 mx-2 my-2 settings-wifi-list"
    });
    boxpropschildren.push (buildSettingParam('wifi', 'Available Networks', '', gwifilist))
    const local_fetch_current_networks = () => _fetch_current_networks (gwifilist, wifilist);
    
    local_fetch_current_networks();

    const wifi_list_rhs = wifi ? [
        wifi.connect ('state-changed', local_fetch_current_networks),
        wifi.connect ('state-changed', () => { wifi_state.set (wifi?.enabled ?? false); })
    ] : [];

    const wifi_update_list_interval = interval (300, local_fetch_current_networks);

    destroy_cbs.push (() => wifi_update_list_interval.cancel());
    destroy_cbs.push (() => wifi_list_rhs.forEach ((n) => wifi?.disconnect(n)));

    boxprops._setChildren (boxpropschildren);
    return <box onDestroy={() => {
        for (const cb of destroy_cbs) { cb(); }
    }} orientation={Gtk.Orientation.VERTICAL} hexpand={true} className={"gap-v-4"}>
        {boxprops} 
    </box>;
}

export function ags_settings_wifi () {
    return {
        build,
        icon: 'wifi-colored',
        name: WifiSettingPageName
    };
}