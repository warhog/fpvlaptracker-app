export interface ConfigData {
    ssid: string,
    password: string,
    frequency: number,
    minimumLapTime: number,
    triggerThreshold: number,
    triggerThresholdCalibration: number,
    calibrationOffset: number,
    state: string,
    triggerValue: number
}


export function isConfigData(arg: any) : arg is ConfigData {
    return arg.ssid !== undefined && arg.password !== undefined && arg.triggerThresholdCalibration !== undefined;
}