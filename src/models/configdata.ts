export interface ConfigData {
    type: string,
    ssid: string,
    password: string,
    frequency: number,
    minimumLapTime: number,
    triggerThreshold: number,
    triggerThresholdCalibration: number,
    calibrationOffset: number,
    state: string,
    triggerValue: number,
    voltage: number,
    uptime: number,
    defaultVref: number
}


export function isConfigData(arg: any) : arg is ConfigData {
    return arg.type !== undefined && arg.type == "config";
}