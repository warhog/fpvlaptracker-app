import { ConfigData } from './configdata'
import { RuntimeData } from './runtimedata';
import { RssiData } from './rssidata';
import { StateData } from './statedata';
import { MessageData } from './messagedata';
import { LapData } from './lapdata';
import { ScanData } from './scandata';

export interface TypeData {
    type: string
}

export function getData(data: string) {
    let arg: TypeData = JSON.parse(data);
    if (arg.type !== undefined) {
        switch(arg.type) {
            case "config":
                let configData: ConfigData = JSON.parse(data);
                return configData;
            case "runtime":
                let runtimeData: RuntimeData = JSON.parse(data);
                return runtimeData;
            case "rssi":
                let rssiData: RssiData = JSON.parse(data);
                return rssiData;
            case "state":
                let stateData: StateData = JSON.parse(data);
                return stateData;
            case "message":
                let messageData: MessageData = JSON.parse(data);
                return messageData;
            case "lap":
                let lapData: LapData = JSON.parse(data);
                return lapData;
            case "scan":
                let scanData: ScanData = JSON.parse(data);
                return scanData;
            default:
                
        }
    }
    // return arg.ssid !== undefined && arg.password !== undefined && arg.triggerThresholdCalibration !== undefined;
}