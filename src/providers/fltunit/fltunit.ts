import {Injectable} from '@angular/core';
import 'rxjs/add/operator/map';
import {BluetoothSerial} from '@ionic-native/bluetooth-serial';
import {FltutilProvider} from '../../providers/fltutil/fltutil'
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

    saveData(ssid: string, password: string, frequency: number, minimumLapTime: number, thresholdLow: number, thresholdHigh: number, offset: number) {
        let data = {
            "ssid": ssid,
            "password": password,
            "frequency": frequency,
            "minimumLapTime": minimumLapTime,
            "thresholdLow": thresholdLow,
            "thresholdHigh": thresholdHigh,
            "offset": offset
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

    scanChannels() {
        return new Promise((resolve, reject) => {
            this.bluetoothSerial.write("GET channels\n")
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
                me.fltutil.showToast("Rebooting unit, this may take up to 1 minute, press activate standalone mode button if required!");
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
                this.loadRssi();
                this.observer.next(
                    {
                        type: "newConfigData",
                        ssid: config.ssid,
                        password: config.password,
                        frequency: config.frequency,
                        minimumLapTime: config.minimumLapTime,
                        thresholdLow: config.thresholdLow,
                        thresholdHigh: config.thresholdHigh,
                        offset: config.offset
                    }
                );
            } else if (data.startsWith("RSSI: ")) {
                this.observer.next(
                    {
                        type: "newRssiValue",
                        rssi: Number(data.substring(6, data.length))
                    }
                );
            } else if (data.startsWith("CHANNELS: ")) {
                let channelData = JSON.parse(data.substring(10, data.length));
                this.observer.next(
                    {
                        type: "newScanData",
                        channels: channelData.channels,
                        maxFreq: channelData.maxFreq,
                        maxRssi: channelData.maxRssi
                    }
                );
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
