export interface ScanData {
    freq: number,
    rssi: number;
}

export function isScanData(arg: any) : arg is ScanData {
    return arg.freq !== undefined && arg.rssi !== undefined;
}