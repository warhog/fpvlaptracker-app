export interface StateData {
    state: string;
}

export function isStateData(arg: any) : arg is StateData {
    return arg.state !== undefined;
}