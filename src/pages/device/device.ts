import {Component} from '@angular/core';
import {NavController} from 'ionic-angular';
import {ToastController} from 'ionic-angular';
import {NavParams} from 'ionic-angular';
import {BluetoothSerial} from '@ionic-native/bluetooth-serial';
import {LoadingController} from 'ionic-angular';
import {BluetoothPage} from '../bluetooth/bluetooth';
import {HomePage} from '../home/home';
import {Storage} from '@ionic/storage';

@Component({
    selector: 'page-device',
    templateUrl: 'device.html'
})

export class DevicePage {

    private deviceName: string = "";
    private data = {
        "ssid": "",
        "password": "",
        "frequency": 0,
        "minimumLapTime": 0,
        "thresholdLow": 0,
        "thresholdHigh": 0
    };
    private version: string = "";
    private state: number = STATES.DISCONNECTED;
    private rssi: number = 0;
    private loader: any = null;

    constructor(public storage: Storage, public toastCtrl: ToastController, public navCtrl: NavController, private loadingCtrl: LoadingController, private navParams: NavParams, private bluetoothSerial: BluetoothSerial) {
        //        let id = navParams.get('id');
        //        let name = navParams.get('name');
    }

    showLoader(text: string) {
        this.loader = this.loadingCtrl.create({
            content: text
        });
        this.loader.present();
    }

    hideLoader() {
        this.loader.dismiss();
    }

    validateFrequency(frequency: number): boolean {
        let frequencies: number[] = [
            5865, 5845, 5825, 5805, 5785, 5765, 5745, 5725, // Band A
            5733, 5752, 5771, 5790, 5809, 5828, 5847, 5866, // Band B
            5705, 5685, 5665, 5645, 5885, 5905, 5925, 5945, // Band E
            5740, 5760, 5780, 5800, 5820, 5840, 5860, 5880, // Band F / Airwave
            5658, 5695, 5732, 5769, 5806, 5843, 5880, 5917, // Band C / Immersion Raceband
            5362, 5399, 5436, 5473, 5510, 5547, 5584, 5621  // Band D / 5.3
        ];
        return frequencies.indexOf(frequency) > -1;
    }

    reboot() {
        let me = this;
        this.bluetoothSerial.write("REBOOT\n")
            .then(function () {
                me.showToast("Rebooting unit, this may take up to 1 minute, press activate standalone mode button if required!");
                me.goBack();
            })
            .catch(function (errMsg) {
                me.showToast("Cannot reboot unit: " + errMsg);
            });
    }

    saveData() {
        if (!this.validateFrequency(Number(this.data.frequency))) {
            this.showToast("Invalid frequency!");
            this.requestData();
            return;
        }

        let me = this;
        this.state = STATES.CHECK_SAVE_SUCCESS;
        this.bluetoothSerial.write("PUT config " + JSON.stringify(this.data) + "\n")
            .catch(function (msg) {
                me.showToast("Cannot save: " + msg);
                this.state = STATES.VALIDATED;
            });
    }

    showToast(errMsg: string) {
        let toast = this.toastCtrl.create({
            message: errMsg,
            duration: 5000
        });
        toast.present();
    }

    goBack() {
        this.navCtrl.popTo(HomePage);
    }

    gotoSettings() {
        this.navCtrl.push(BluetoothPage);
    }

    isWaitingForValidTest(): boolean {
        return this.state == STATES.VALID_TEST;
    }

    isValidated(): boolean {
        return this.state == STATES.VALIDATED;
    }

    isWaitingForSave(): boolean {
        return this.state == STATES.CHECK_SAVE_SUCCESS;
    }

    requestData() {
        this.showLoader("Loading configuration...");
        let me = this;
        this.bluetoothSerial.write("GET config\n")
            .catch(function (msg: string) {
                me.showToast("Cannot get configuration: " + msg);
            });
    }

    requestRssi() {
        let me = this;
        this.bluetoothSerial.write("GET rssi\n")
            .catch(function (msg: string) {
                me.showToast("Cannot get rssi: " + msg);
            });
    }

    onReceive(data: string) {
        if (this.isWaitingForValidTest()) {
            this.state = STATES.VALID_TEST;
            if (data.startsWith("VERSION: ")) {
                this.state = STATES.VALIDATED;
                this.version = data.substring(9, data.length);
                this.requestData();
//            } else {
//                this.showToast("unknown data: " + data);
            }
        } else if (this.isValidated()) {
            if (data.startsWith("CONFIG: ")) {
                this.data = JSON.parse(data.substring(8, data.length));
                this.requestRssi();
                this.hideLoader();
            } else if (data.startsWith("RSSI: ")) {
                this.rssi = Number(data.substring(6, data.length));
//            } else {
//                this.showToast("unknown data: " + data);
            }
        } else if (this.isWaitingForSave()) {
            this.state = STATES.VALIDATED;
            this.hideLoader();
            if (data.startsWith("SETCONFIG: ")) {
                let result: string = data.substring(11);
                if (result.trim() == "OK") {
                    this.showToast("Successfully saved");
                    this.requestData();
                    this.goBack();
                } else {
                    this.showToast("Cannot save to device!");
                }
//            } else {
//                this.showToast("unknown data: " + data);
            }
//        } else {
//            console.log("unknown state: " + data);
        }
    }

    connect(id: string, name: string) {

        return new Promise((resolve, reject) => {
            this.showLoader("Connecting to " + name + ", please wait...");

            this.bluetoothSerial.connect(id).subscribe((data) => {
                this.hideLoader();
                this.state = STATES.CONNECTED;
                this.bluetoothSerial.subscribe("\n").subscribe((data) => {
                    this.onReceive(data);
                }, (errMsg) => {
                    this.showToast(errMsg);
                    this.disconnect();
                });
                this.checkValidDevice();
                resolve();
            }, (errMsg) => {
                this.hideLoader();
                this.disconnect();
                reject(errMsg);
            });
        });
    }

    doConnect() {
        let me = this;
        this.storage.get("bluetooth.id").then((id: string) => {
            this.storage.get("bluetooth.name").then((name: string) => {
                this.deviceName = name;
                this.connect(id, name)
                    .then(function () {

                    })
                    .catch(function (errMsg: string) {
                        me.disconnect();
                        me.showToast(errMsg);
                        me.gotoSettings();
                    });
            }).catch(() => {
                me.gotoSettings();
            });
        }).catch(() => {
            me.gotoSettings();
        });
    }

    ionViewDidEnter() {
        this.doConnect();
    }

    ionViewWillLeave() {
        this.disconnect();
    }

    disconnect() {
        this.state = STATES.DISCONNECTED;
        this.bluetoothSerial.disconnect();
    }

    checkValidDevice() {
        let me = this;
        this.state = STATES.VALID_TEST;
        this.bluetoothSerial.write("GET version\n")
            .catch(function () {
                me.showToast("Cannot validate device.");
                me.disconnect();
            });
    }

}

enum STATES {
    DISCONNECTED = 0,
    CONNECTED,
    VALID_TEST,
    VALIDATED,
    CHECK_SAVE_SUCCESS
}

