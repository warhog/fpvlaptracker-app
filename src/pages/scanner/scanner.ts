import {Component} from '@angular/core';
import {NavController} from 'ionic-angular';
import {ToastController} from 'ionic-angular';
import {BluetoothSerial} from '@ionic-native/bluetooth-serial';
import {Storage} from '@ionic/storage';
import {BluetoothPage} from '../bluetooth/bluetooth';
import {LoadingController} from 'ionic-angular';
import {SmartAudioProvider} from '../../providers/smart-audio/smart-audio';
import {NgZone} from '@angular/core';
import {Insomnia} from '@ionic-native/insomnia';

@Component({
    selector: 'page-scanner',
    templateUrl: 'scanner.html'
})
export class ScannerPage {

    private state: number = STATES.DISCONNECTED;
    private loader: any = null;
    private channelData: any = null;
    private maxFreq: string = "";
    private maxRssi: number = 0;
    private channels: { freq: number, rssi: number }[] = [];
    
    constructor(public zone: NgZone, private storage: Storage, public toastCtrl: ToastController, public navCtrl: NavController, private loadingCtrl: LoadingController, private bluetoothSerial: BluetoothSerial, private smartAudio: SmartAudioProvider, private insomnia: Insomnia) {

    }

    showToast(errMsg: string) {
        let toast = this.toastCtrl.create({
            message: errMsg,
            duration: 5000
        });
        toast.present();
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

    scanChannels() {
        this.showLoader("Scanning channels...");
        let me = this;
        this.bluetoothSerial.write("GET channels\n")
            .catch(function (msg: string) {
                me.showToast("Cannot get channels: " + msg);
            });
    }

    onReceive(data: string) {
        if (data.startsWith("CHANNELS: ")) {
            this.channelData = JSON.parse(data.substring(10, data.length));
            this.channels = this.channelData.channels;
            this.maxFreq = this.channelData.maxFreq;
            this.maxRssi = this.channelData.maxRssi;
            this.hideLoader();
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

    gotoSettings() {
        this.navCtrl.push(BluetoothPage);
    }

    doConnect() {
        let me = this;
        this.storage.get("bluetooth.id").then((id: string) => {
            this.storage.get("bluetooth.name").then((name: string) => {
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

        //        this.storage.get("race.keepAwakeDuringRace").then((keepAwakeDuringRace: boolean) => {
        //            if (keepAwakeDuringRace == undefined || keepAwakeDuringRace == null) {
        //                keepAwakeDuringRace = false;
        //            }
        //            if (keepAwakeDuringRace) {
        //                this.insomnia.keepAwake().then(() => {}, () => {
        //                    this.showToast("cannot disable sleep mode");
        //                });
        //            }
        //        });
    }

    ionViewWillLeave() {
        this.disconnect();
        //        this.storage.get("race.keepAwakeDuringRace").then((keepAwakeDuringRace: boolean) => {
        //            if (keepAwakeDuringRace == undefined || keepAwakeDuringRace == null) {
        //                keepAwakeDuringRace = false;
        //            }
        //            if (keepAwakeDuringRace) {
        //                this.insomnia.allowSleepAgain();
        //            }
        //        });
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
    VALIDATED
}

