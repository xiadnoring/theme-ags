import { Variable } from "astal/variable";
import { formateDate } from "../lib/date";

const time = Variable(new Date).poll(1000 * 30, "date")

export default function CurrentDate (type: 'time'|'datetime'|'date', timeformat: 'en'|'ru') {
    return <label label={time().as((n) => formateDate (n, {type, timeformat}))} />
}