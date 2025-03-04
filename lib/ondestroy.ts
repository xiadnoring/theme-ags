export class before_delete {
    callbacks: Map<Function, any[]>
    
    constructor () {
        this.callbacks = new Map();
    }

    add (cb: Function, ...args: any[]) {
        this.callbacks.set (cb, args);
    }

    remove (cb: Function) {
        this.callbacks.delete (cb);
    }

    call () {
        for (const [cb, args] of this.callbacks.entries()) {
            cb (...args);
        }

        this.callbacks.clear();
    }
}