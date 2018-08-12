import {Injectable} from '@angular/core';
import 'rxjs/add/operator/map';
import {BluetoothSerial} from '@ionic-native/bluetooth-serial';
import {FltutilProvider} from '../fltutil/fltutil'
import {Observable} from 'rxjs/Observable';
import {Storage} from '@ionic/storage';
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
    private deviceName: string = "";

    private observable: any;
    private observer: any;

    constructor(private bluetoothSerial: BluetoothSerial, private fltutil: FltutilProvider, private storage: Storage) {
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
        this.bluetoothSerial.write("PUT config " + JSON.stringify(configData) + "\n").catch(function (msg) {
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
