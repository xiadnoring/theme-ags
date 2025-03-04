export const mergeClasses = (...classes: (string|undefined|null)[]) => classes.filter((className, index, array) => {
    return Boolean(className) && array.indexOf(className) === index;
}).join(' ');

export const objectWithoutChildren = (attr: {[key: string]: any}, ...children: string[]) : any => {
    let s = new Set (children);
    let obj: {[key: string]: any} = {};
    for (const [key, value] of Object.entries(attr)) { if (!s.has(key)) { obj[key] = value; } }
    return obj;
}
