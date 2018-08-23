export interface StateData {
    state?: string;
    rssi?: string,
    scan?: string,
    calibration?: string
}

export function isStateData(arg: any) : arg is StateData {
    return arg.state !== undefined;
}

export function isRssiData(arg: any) : arg is StateData {
    return arg.rssi !== undefined;
}

export function isScanData(arg: any) : arg is StateData {
    return arg.scan !== undefined;
}

export function isCalibrationData(arg: any) : arg is StateData {
    return arg.calibration !== undefined;
}
