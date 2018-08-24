export interface RuntimeData {
    type: string,
    triggerValue: number;
}


export function isRuntimeData(arg: any) : arg is RuntimeData {
    return arg.type !== undefined && arg.type == "runtime";
}