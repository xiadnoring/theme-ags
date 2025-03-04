const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getDate (date: Date) {
    return `${DAYS[date.getDay()]}, ${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

function timeNumberFormat (num: number) {
    const str = num.toString();
    if (str.length == 1) { return `0${str}`; }
    return str;
}

function getTime (date: Date, options: {timeformat: 'en'|'ru'}) {
    if (options.timeformat == 'en') {
        let hours = date.getHours();
        const isPM = hours >= 12;
        const format = isPM ? 'PM' : 'AM';
        if (isPM) { hours -= 12; }
        return `${timeNumberFormat(hours)}:${timeNumberFormat(date.getMinutes())} ${format}`;
    }

    if (options.timeformat == 'ru') {
        return `${date.getHours()}:${date.getMinutes()}`;
    }

    return '';
}

export function formateDate (date: Date|DateConstructor, options: { type: 'time'|'datetime'|'date', timeformat: 'en'|'ru' }): string {
    date = new Date (date.toLocaleString());
    if (options.type == 'datetime') {
        return getDate (date) + ', ' + getTime (date, options)
    }
    
    if (options.type == 'date') {
        return getDate (date);
    }

    if (options.type == 'time') {
        return getTime (date, options);
    }

    return '';
}