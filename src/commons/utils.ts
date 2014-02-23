export function assign(target: any, source: any): any {
    return Object.keys(source).reduce((target: any, key: string) => {
        target[key] = source[key];
        return target;
    }, target);
}

export function clone<T>(target: T): T {
    return assign({}, target);
}

export function getEnumerablePropertyNames(target: any): string [] {
    var result: string[] = [];
    for (var key in target) {
        result.push(key);
    }
    return result;
}




