import {Injectable} from '@angular/core';
import 'rxjs/add/operator/map';
import {BluetoothSerial} from '@ionic-native/bluetooth-serial';
import {FltutilProvider} from '../fltutil/fltutil'
import {Observable} from 'rxjs/Observable';
import {RuntimeData} from '../../models/runtimedata';
import {ConfigData} from '../../models/configdata';
import {StateData} from '../../models/statedata'
import {RssiData} from '../../models/rssidata'
import {MessageData} from '../../models/messagedata'
import {ScanData} from '../../models/scandata';

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

    private observable: any;
    private observer: any;

    constructor(private bluetoothSerial: BluetoothSerial, private fltutil: FltutilProvider) {
        this.observable = Observable.create(observer => {
            this.observer = observer;
        });
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
        this.bluetoothSerial.write("PUT config " + JSON.stringify(configData) + "\n").catch(function (msg) {
            me.observer.next({type: "message", message: "Cannot save: " + msg});
            me.state = FLT_UNIT_STATES.VALIDATED;
        });
    }

    isConnected() {
        return this.bluetoothSerial.isConnected();
    }

    connect(id: string, name: string) {
        if (this.isConnected) {
            this.disconnect();
        }
        return new Promise((resolve, reject) => {
            this.fltutil.showLoader("Connecting to " + name + ", please wait...");

            this.bluetoothSerial.connect(id).subscribe((data) => {
                this.fltutil.hideLoader();
                this.state = FLT_UNIT_STATES.CONNECTED;
                this.bluetoothSerial.subscribe("\n").subscribe((data) => {
                    this.onReceive(data);
                }, (errMsg) => {
                    this.fltutil.showToast(errMsg);
                    this.disconnect();
                });
                this.checkValidDevice();
                resolve();
            }, (errMsg) => {
                this.fltutil.hideLoader();
                this.disconnect();
                reject(errMsg);
            });
        });
    }

    disconnect() {
        this.state = FLT_UNIT_STATES.DISCONNECTED;
        this.bluetoothSerial.disconnect();
    }

    simpleRequest(requestString) : Promise<string> {
        return new Promise((resolve, reject) => {
            this.bluetoothSerial.write(requestString + '\n')
                .then(function () {
                    resolve();
                })
                .catch(function (msg: string) {
                    reject(msg);
                });
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
        return this.simpleRequest("GET config");
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

    reboot() {
        let me = this;
        this.simpleRequest("REBOOT").then(function() {
            me.fltutil.showToast("Rebooting unit, this may take up to 1 minute.");
        }).catch(function (errMsg) {
            me.fltutil.showToast("Cannot reboot unit: " + errMsg);
        });
    }

    onReceive(data: string) {
        if (this.isWaitingForValidTest()) {
            this.state = FLT_UNIT_STATES.VALID_TEST;
            if (data.startsWith("VERSION: ")) {
                this.state = FLT_UNIT_STATES.VALIDATED;
                this.version = data.substring(9, data.length);
                this.loadConfigData();
            }
        } else if (this.isValidated()) {
            if (data.startsWith("CONFIG: ")) {
                let config: ConfigData = JSON.parse(data.substring(8, data.length));
                this.observer.next(config);
            } else if (data.startsWith("RSSI: ")) {
                let rssiData: RssiData = { rssi: Number(data.substring(6, data.length)) };
                this.observer.next(rssiData);
            } else if (data.startsWith("STATE: ")) {
                let stateData: StateData = { state: data.substring(7, data.length) };
                this.observer.next(stateData);
            } else if (data.startsWith("RUNTIME: ")) {
                let runtimeData: RuntimeData = JSON.parse(data.substring(9, data.length));
                this.observer.next(runtimeData);
            } else if (data.startsWith("SCAN: ")) {
                if (data.startsWith("SCAN: started")) {
                    this.fltutil.showToast("Scan started");
                } else if (data.startsWith("SCAN: stopped")) {
                    this.fltutil.showToast("Scan stopped");
                } else {
                    let channelData: string = data.substring(6, data.length);
                    let parts: string[] = channelData.split("=");
                    if (parts.length != 2) {
                        this.fltutil.showToast("Scan split error");
                        return;
                    }
                    let scanData: ScanData = { freq: Number(parts[0]), rssi: Number(parts[1]) };
                    this.observer.next(scanData);
                }
            //  } else {
            //      this.fltutil.showToast("unknown data: " + data);
            }
        } else if (this.isWaitingForSave()) {
            this.state = FLT_UNIT_STATES.VALIDATED;
            if (data.startsWith("SETCONFIG: ")) {
                let result: string = data.substring(11);
                if (result.trim() == "OK") {
                    let messageData: MessageData = { message: "Successfully saved" };
                    this.observer.next(messageData);
                    this.loadConfigData();
                } else {
                    let messageData: MessageData = { message: "Cannot save to device!" };
                    this.observer.next(messageData);
                }
            }
        }
    }

}
