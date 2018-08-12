export interface RssiData {
    rssi: number;
}

export function isRssiData(arg: any) : arg is RssiData {
    return arg.rssi !== undefined;
}