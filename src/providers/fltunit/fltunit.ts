import {Injectable} from '@angular/core';
import 'rxjs/add/operator/map';
import {BluetoothSerial} from '@ionic-native/bluetooth-serial';
import {FltutilProvider} from '../fltutil/fltutil'
import {Observable} from 'rxjs/Observable';
import {Storage} from '@ionic/storage';
import {RuntimeData} from '../../models/runtimedata';
import {ConfigData} from '../../models/configdata';
import {StateData, isRssiData, isCalibrationData} from '../../models/statedata'
import {RssiData} from '../../models/rssidata'
import {MessageData} from '../../models/messagedata'
import {ScanData, isScanData} from '../../models/scandata';
import {LapData} from '../../models/lapdata';
import { SmartAudioProvider } from '../smart-audio/smart-audio';
import { getDataType } from '../../models/type';
import { VersionData } from '../../models/versiondata';
import { AlarmData } from '../../models/alarmdata';

enum FLT_UNIT_STATES {
    DISCONNECTED = 0,
    CONNECTED,
    VALID_TEST,
    VALIDATED,
    CHECK_SAVE_SUCCESS
}

/*
  Generated class for the FltunitProvider provider.

  See https://angular.io/docs/ts/latest/guide/dependency-injection.html
  for more info on providers and Angular DI.
*/
@Injectable()
export class FltunitProvider {

    private version: string = "";
    private state: number = FLT_UNIT_STATES.DISCONNECTED;
    private deviceName: string = "";
    private timeout: any = null;

    private observable: any;
    private observer: any;

    constructor(
        private bluetoothSerial: BluetoothSerial,
        private fltutil: FltutilProvider,
        private storage: Storage,
        private smartAudioProvider: SmartAudioProvider
        ) {
        this.observable = Observable.create(observer => {
            this.observer = observer;
        });
    }

    getDeviceName(): string {
        return this.deviceName;
    }

    getObservable(): Observable<any> {
        return this.observable;
    }

    isWaitingForValidTest(): boolean {
        return this.state == FLT_UNIT_STATES.VALID_TEST;
    }

    isValidated(): boolean {
        return this.state == FLT_UNIT_STATES.VALIDATED;
    }

    isWaitingForSave(): boolean {
        return this.state == FLT_UNIT_STATES.CHECK_SAVE_SUCCESS;
    }

    getState(): FLT_UNIT_STATES {
        return this.state;
    }
    setState(state: FLT_UNIT_STATES) {
        this.state = state;
    }

    saveData(configData: ConfigData) {
        this.setState(FLT_UNIT_STATES.CHECK_SAVE_SUCCESS);
        let me = this;
        configData.minimumLapTime = configData.minimumLapTime * 1000;
        this.bluetoothSerial.write("PUT config " + JSON.stringify(configData) + "\n").then(function() {
            configData.minimumLapTime = configData.minimumLapTime / 1000;
        }).catch(function (msg) {
            me.observer.next({type: "message", message: "Cannot save: " + msg});
            me.state = FLT_UNIT_STATES.VALIDATED;
        });
    }

    isConnected() {
        return this.bluetoothSerial.isConnected();
    }

    connect() : Promise<string> {
        if (this.isConnected) {
            this.disconnect();
        }
        let me = this;
        return new Promise((resolve, reject) => {
            me.storage.get("bluetooth.id").then((id: string) => {
                me.storage.get("bluetooth.name").then((name: string) => {
                    me.deviceName = name;
                    me.fltutil.showLoader("Connecting to " + name + ", please wait...");
                    me.bluetoothSerial.connect(id).subscribe((data) => {
                        me.fltutil.hideLoader();
                        me.state = FLT_UNIT_STATES.CONNECTED;
                        me.bluetoothSerial.subscribe("\n").subscribe((data) => {
                            me.onReceive(data);
                        }, (errMsg) => {
                            me.disconnect();
                            reject(errMsg);
                        });
                        me.checkValidDevice();
                        resolve();
                    }, (errMsg) => {
                        me.fltutil.hideLoader();
                        me.disconnect();
                        reject(errMsg);
                    });
                }).catch(() => {
                    me.disconnect();
                    reject("Cannot load bluetooth name");
                });
            }).catch(() => {
                me.disconnect();
                reject("Cannot load bluetooth id");
            });
        });
    }

    disconnect() {
        this.state = FLT_UNIT_STATES.DISCONNECTED;
        this.bluetoothSerial.disconnect();
    }

    timeoutHandler() {
        this.fltutil.hideLoader();
        this.fltutil.showToast("Timeout, please retry");
        this.disconnect();
    }

    simpleRequest(requestString: string, timeout: number = 0) : Promise<string> {
        let me = this;
        return new Promise((resolve, reject) => {
            if (!this.isConnected()) {
                me.clearTimeout();
                reject("Not connected to unit");
            } else {
                this.bluetoothSerial.write(requestString + '\n').then(function () {
                    if (timeout > 0 && me.timeout === null) {
                        me.timeout = setTimeout(function() {
                            me.timeoutHandler();
                        }, timeout);
                    }
                    resolve();
                }).catch(function (msg: string) {
                    me.clearTimeout();
                    reject(msg);
                });
            }
        });
    }

    startScanChannels() : Promise<string> {
        return this.simpleRequest("START scan");
    }

    stopScanChannels() : Promise<string> {
        return this.simpleRequest("STOP scan");
    }

    startFastRssi() : Promise<string> {
        return this.simpleRequest("START rssi");
    }

    stopFastRssi() : Promise<string> {
        return this.simpleRequest("STOP rssi");
    }

    loadConfigData() : Promise<string> {
        return this.simpleRequest("GET config", 5000);
    }

    loadRssi() : Promise<string> {
        return this.simpleRequest("GET rssi");
    }

    loadState() : Promise<string> {
        return this.simpleRequest("GET state");
    }

    loadTriggerValue() : Promise<string> {
        return this.simpleRequest("GET runtimedata");
    }

    checkValidDevice() {
        let me = this;
        this.state = FLT_UNIT_STATES.VALID_TEST;
        this.bluetoothSerial.write("GET version\n")
            .catch(function () {
                me.fltutil.showToast("Cannot validate device.");
                me.disconnect();
            });
    }

    clearTimeout() {
        if (this.timeout !== null) {
            clearTimeout(this.timeout);
        }
    }

    reboot() {
        this.clearTimeout();
        let me = this;
        this.simpleRequest("REBOOT").then(function() {
            me.fltutil.showToast("Rebooting unit, this may take up to 1 minute.");
        }).catch(function (errMsg) {
            me.fltutil.showToast("Cannot reboot unit: " + errMsg);
        });
    }

    onReceive(data: string) {
        this.clearTimeout();
        if (this.isWaitingForValidTest()) {
            this.state = FLT_UNIT_STATES.VALID_TEST;

            if (getDataType(data) == "version") {
                this.state = FLT_UNIT_STATES.VALIDATED;
                let versionData: VersionData = JSON.parse(data);
                this.version = versionData.version;
                this.loadConfigData();
            }
        } else if (this.isValidated()) {
            let dataType: string = getDataType(data);
            if (dataType == "config") {
                let config: ConfigData = JSON.parse(data);
                config.minimumLapTime = config.minimumLapTime / 1000;
                this.observer.next(config);
            } else if (dataType == "rssi") {
                let rssiData: RssiData = JSON.parse(data);
                this.observer.next(rssiData);
            } else if (dataType == "state") {
                let stateData: StateData = JSON.parse(data);
                if (isScanData(stateData)) {
                    this.fltutil.showToast("Scan " + stateData.scan, 2000);
                } else if (isRssiData(stateData)) {
                    this.fltutil.showToast("Fast RSSI " + stateData.rssi, 2000);
                } else if (isCalibrationData(stateData)) {
                    this.fltutil.showToast("Calibration done", 3000);
                    this.smartAudioProvider.play("calibrationdone");
                } else {
                    this.observer.next(stateData);
                }
            } else if (dataType == "runtime") {
                let runtimeData: RuntimeData = JSON.parse(data);
                this.observer.next(runtimeData);
            } else if (dataType == "lap") {
                let lapData: LapData = JSON.parse(data);
                this.observer.next(lapData);
            } else if (dataType == "scan") {
                let scanData: ScanData = JSON.parse(data);
                this.observer.next(scanData);
            } else if (dataType == "alarm") {
                let alarmData: AlarmData = JSON.parse(data);
                this.fltutil.showToast(alarmData.msg, 10000);
            // } else {
            //     this.fltutil.showToast("unknown data: " + data);
            }
        } else if (this.isWaitingForSave()) {
            this.state = FLT_UNIT_STATES.VALIDATED;
            if (data.startsWith("SETCONFIG: ")) {
                let result: string = data.substring(11);
                if (result.trim() == "OK") {
                    let messageData: MessageData = { type: "message", message: "Successfully saved" };
                    this.observer.next(messageData);
                    this.loadConfigData();
                } else {
                    let messageData: MessageData = { type: "message", message: "Cannot save to device!" };
                    this.observer.next(messageData);
                }
            }
        }
    }

}
