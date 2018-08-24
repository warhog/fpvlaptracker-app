export interface StateData {
    type: string,
    state?: string;
    rssi?: string,
    scan?: string,
    calibration?: string
}

export function isStateData(arg: any) : arg is StateData {
    return arg.type !== undefined && arg.type == "state";
}

export function isRssiData(arg: any) : arg is StateData {
    return arg.type !== undefined && arg.type == "state";
}

export function isScanData(arg: any) : arg is StateData {
    return arg.type !== undefined && arg.type == "state";
}

export function isCalibrationData(arg: any) : arg is StateData {
    return arg.type !== undefined && arg.type == "state";
}
