export function mixin(base: any, mixin: any) {
    let proto = Object.getPrototypeOf(base);
    for (let propName in mixin) {
        let prop = mixin[propName];
        if (typeof prop === 'function' && propName.substring(0, 2) === 'on') {
            if (!base.eventHandlers) {
                let handlers: EventHandlers = {};
                base.eventHandlers = handlers;
            }
            if (!base.eventHandlers[propName]) {
                base.eventHandlers[propName] = [];
            }
            base.eventHandlers[propName].push(prop);
        } else {
            proto[propName] = mixin[propName];
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
    let handlers = proto.eventHandlers[event];
    if (handlers) {
        for (let handler of handlers) {
            handler.apply(this, args);
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
    if (!this.objects[classObject.name]) {
        let classObjects: ClassObjects = {};
        this.objects[classObject.name] = classObjects;
    }
    this.objects[classObject.name][data.id] = obj;
    obj.execAllMixins('onCreate', data);
    return obj;
}

export { Dweller }
