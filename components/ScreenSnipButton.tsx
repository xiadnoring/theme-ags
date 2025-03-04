import { desktop } from "../lib/app";


export default function ScreenSnipButton () {
    return <button className="btn btn-icon" onClick={(self, event) => {
        desktop.execScript ('grimblast.sh copy area');
    }}>screenshot_region</button>
}