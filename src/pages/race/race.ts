import {Component} from '@angular/core';
import {NavController} from 'ionic-angular';
import {ToastController} from 'ionic-angular';
import {BluetoothSerial} from '@ionic-native/bluetooth-serial';
import {Storage} from '@ionic/storage';
import {BluetoothPage} from '../bluetooth/bluetooth';
import {LoadingController} from 'ionic-angular';

@Component({
    selector: 'page-race',
    templateUrl: 'race.html'
})
export class RacePage {

    private state: RACESTATE = RACESTATE.STOP;

    restartRace() {
        this.state = RACESTATE.WAITING;
    }

    constructor(private storage: Storage, public toastCtrl: ToastController, public navCtrl: NavController, private loadingCtrl: LoadingController, private bluetoothSerial: BluetoothSerial) {
        this.restartRace();

        let me = this;
        storage.get("bluetooth.id").then((id: string) => {
            storage.get("bluetooth.name").then((name: string) => {
                this.connect(id, name)
                    .then(function () {

                    })
                    .catch(function (errMsg) {
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

    gotoSettings() {
        this.navCtrl.push(BluetoothPage);
    }

    showToast(errMsg: string) {
        let toast = this.toastCtrl.create({
            message: errMsg,
            duration: 5000
        });
        toast.present();
    }

    onReceive(data: string) {
        if (data.startsWith("LAP: ")) {
            this.showToast(data)
        }
    }

    connect(id: string, name: string) {

        return new Promise((resolve, reject) => {
            let loader = this.loadingCtrl.create({
                content: "Connecting to " + name + ", please wait..."
            });
            loader.present();

            this.bluetoothSerial.connect(id).subscribe((data) => {
                loader.dismissAll();
                this.bluetoothSerial.subscribe("\n").subscribe((data) => {
                    this.onReceive(data);
                }, (errMsg) => {
                    this.showToast(errMsg);
                    this.disconnect();
                });
                resolve();
            }, (errMsg) => {
                loader.dismissAll();
                this.disconnect();
                reject(errMsg);
            });
        });
    }

    ionViewWillLeave() {
        this.disconnect();
    }

    disconnect() {
        this.bluetoothSerial.disconnect();
    }

}

enum RACESTATE {
    WAITING = 0,
    STOP,
    RUNNING
}
