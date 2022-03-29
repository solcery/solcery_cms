export function mixin(base: any, mixin: any) {
    let proto = Object.getPrototypeOf(base);
    for (let propName in mixin) {
        let prop = mixin[propName];
        if (typeof prop === 'function' && propName.substring(0, 2) === 'on') {
            if (!base.hasOwnProperty('eventHandlers')) {
                let handlers: EventHandlers = {};
                base.eventHandlers = handlers;
            }
            if (!base.eventHandlers[propName]) {
                base.eventHandlers[propName] = [];
            }
            base.eventHandlers[propName].push(prop);
        } else {
            base[propName] = mixin[propName];
        }
    }
}

type EventHandlers = {
    [key: string]: ((...args: any[]) => void)[]
}

type Objects = {
    [key: string]: ClassObjects
}

type ClassObjects = {
    [key: string]: any
}

let Dweller: any = {}

Dweller.execAllMixins = function(event: string, ...args: any[]) {
    let proto = Object.getPrototypeOf(this);
    if (proto.eventHandlers) {
        let handlers = proto.eventHandlers[event];
        if (handlers) {
            for (let handler of handlers) {
                handler.apply(this, args);
            }
        }
        handlers = proto.eventHandlers['onEvent'];
        if (handlers) {
            for (let handler of handlers) {
                handler.apply(this, [ event ].concat(args));
            }
        }
    }
}

Dweller.awaitAllMixins = async function(event: string, ...args: any[]) {
    let proto = Object.getPrototypeOf(this);
    if (proto.eventHandlers) {
        let handlers = proto.eventHandlers[event];
        if (handlers) {
            for (let handler of handlers) {
                await handler.apply(this, args);
            }
        }
        handlers = proto.eventHandlers['onEvent'];
        if (handlers) {
            for (let handler of handlers) {
                await handler.apply(this, [ event ].concat(args));
            }
        }

    }
}

Dweller.create = function(classObject: any, data: any) {
    let obj = Object.create(classObject);
    obj.id = data.id;
    if (!this.objects) {
        let objects: Objects = {};
        this.objects = objects;
    }
    if (!this.objects[classObject.classname]) {
        let classObjects: ClassObjects = {};
        this.objects[classObject.classname] = classObjects;
    }
    this.objects[classObject.classname][data.id] = obj;
    obj.parent = this
    obj.root = this.root
    obj.execAllMixins('onCreate', data);
    return obj;
}

Dweller.get = function(classObject: any, id: any) {
    if (this.objects && this.objects[classObject.classname]) {
        return this.objects[classObject.classname][id]
    }
}

Dweller.getAll = function(classObject: any) {
    let result: any[] = [];
    if (this.objects && this.objects[classObject.classname]) {
        let objects = this.objects[classObject.classname]
        for (let objId in objects) {
            result.push(objects[objId])
        }
    }
    return result
}

export { Dweller }
