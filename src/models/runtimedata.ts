export interface RuntimeData {
    triggerValue: number;
}


export function isRuntimeData(arg: any) : arg is RuntimeData {
    return arg.triggerValue !== undefined;
}