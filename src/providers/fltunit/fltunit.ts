import {Injectable} from '@angular/core';
import 'rxjs/add/operator/map';
import {BluetoothSerial} from '@ionic-native/bluetooth-serial';
import {FltutilProvider} from '../fltutil/fltutil'
import {Observable} from 'rxjs/Observable';

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

    saveData(ssid: string, password: string, frequency: number, minimumLapTime: number, triggerThreshold: number, triggerThresholdCalibration: number, calibrationOffset: number) {
        let data = {
            "ssid": ssid,
            "password": password,
            "frequency": frequency,
            "minimumLapTime": minimumLapTime,
            "triggerThreshold": triggerThreshold,
            "triggerThresholdCalibration": triggerThresholdCalibration,
            "calibrationOffset": calibrationOffset
        };
        this.setState(FLT_UNIT_STATES.CHECK_SAVE_SUCCESS);
        let me = this;
        this.bluetoothSerial.write("PUT config " + JSON.stringify(data) + "\n").catch(function (msg) {
            me.observer.next({type: "message", message: "Cannot save: " + msg});
            me.state = FLT_UNIT_STATES.VALIDATED;
        });
    }

    connect(id: string, name: string) {
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

    startScanChannels() {
        return new Promise((resolve, reject) => {
            this.bluetoothSerial.write("START scan\n")
                .then(function () {
                    resolve();
                })
                .catch(function (msg: string) {
                    reject(msg);
                });
        });
    }

    stopScanChannels() {
        return new Promise((resolve, reject) => {
            this.bluetoothSerial.write("STOP scan\n")
                .then(function () {
                    resolve();
                })
                .catch(function (msg: string) {
                    reject(msg);
                });
        });
    }

    startFastRssi() {
        return new Promise((resolve, reject) => {
            this.bluetoothSerial.write("START rssi\n")
                .then(function () {
                    resolve();
                })
                .catch(function (msg: string) {
                    reject(msg);
                });
        });
    }

    stopFastRssi() {
        return new Promise((resolve, reject) => {
            this.bluetoothSerial.write("STOP rssi\n")
                .then(function () {
                    resolve();
                })
                .catch(function (msg: string) {
                    reject(msg);
                });
        });
    }

    loadConfigData() {
        return new Promise((resolve, reject) => {
            this.bluetoothSerial.write("GET config\n")
                .then(function () {
                    resolve();
                })
                .catch(function (msg: string) {
                    reject(msg);
                });
        });
    }

    loadRssi() {
        return new Promise((resolve, reject) => {
            this.bluetoothSerial.write("GET rssi\n")
                .then(function () {
                    resolve();
                })
                .catch(function (msg: string) {
                    reject(msg);
                });
        });
    }

    loadState() {
        return new Promise((resolve, reject) => {
            this.bluetoothSerial.write("GET state\n")
                .then(function () {
                    resolve();
                })
                .catch(function (msg: string) {
                    reject(msg);
                });
        });
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
        this.bluetoothSerial.write("REBOOT\n")
            .then(function () {
                me.fltutil.showToast("Rebooting unit, this may take up to 1 minute.");
            })
            .catch(function (errMsg) {
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
                let config: any = JSON.parse(data.substring(8, data.length));
                this.observer.next(
                    {
                        type: "newConfigData",
                        ssid: config.ssid,
                        password: config.password,
                        frequency: config.frequency,
                        minimumLapTime: config.minimumLapTime,
                        triggerThreshold: config.triggerThreshold,
                        triggerThresholdCalibration: config.triggerThresholdCalibration,
                        calibrationOffset: config.calibrationOffset,
                        state: config.state
                    }
                );
            } else if (data.startsWith("RSSI: ")) {
                this.observer.next(
                    {
                        type: "newRssiValue",
                        rssi: Number(data.substring(6, data.length))
                    }
                );
            } else if (data.startsWith("STATE: ")) {
                this.observer.next(
                    {
                        type: "newStateValue",
                        state: data.substring(7, data.length)
                    }
                );
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
                    this.observer.next(
                        {
                            type: "newScanData",
                            freq: Number(parts[0]),
                            rssi: Number(parts[1])
                        }
                    );
                }
            // } else {
            //     this.fltutil.showToast("unknown data: " + data);
            }
        } else if (this.isWaitingForSave()) {
            this.state = FLT_UNIT_STATES.VALIDATED;
            if (data.startsWith("SETCONFIG: ")) {
                let result: string = data.substring(11);
                if (result.trim() == "OK") {
                    this.observer.next({type: "message", message: "Successfully saved"});
                    this.loadConfigData();
                } else {
                    this.observer.next({type: "message", message: "Cannot save to device!"});
                }
            }
        }
    }

}
