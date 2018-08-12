export interface LapData {
    lapTime: number,
    rssi: number;
}

export function isLapData(arg: any) : arg is LapData {
    return arg.lapTime !== undefined && arg.rssi !== undefined;
}