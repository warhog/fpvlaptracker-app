import {Component} from '@angular/core';
import {NavController} from 'ionic-angular';
import {Storage} from '@ionic/storage';
import {BluetoothPage} from '../bluetooth/bluetooth';
import {ScannerPage} from '../scanner/scanner';

@Component({
    selector: 'page-settings',
    templateUrl: 'settings.html'
})
export class SettingsPage {

    private bluetoothDevice: string = "none";
    private numberOfLaps: number = 10;
    private keepAwakeDuringRace: boolean = false;

    constructor(private storage: Storage, public navCtrl: NavController) {
        storage.get("bluetooth.name").then((name: string) => {
            this.bluetoothDevice = name;
        });
        storage.get("race.numberOfLaps").then((numberOfLaps: number) => {
            if (numberOfLaps == undefined || numberOfLaps == null || numberOfLaps == 0) {
                numberOfLaps = 10;
            }
            this.numberOfLaps = numberOfLaps;
        });
        storage.get("race.keepAwakeDuringRace").then((keepAwakeDuringRace: boolean) => {
            if (keepAwakeDuringRace == undefined || keepAwakeDuringRace == null) {
                keepAwakeDuringRace = false;
            }
            this.keepAwakeDuringRace = keepAwakeDuringRace;
        });
    }

    gotoBluetoothSelection() {
        this.navCtrl.push(BluetoothPage);
    }

    saveValues() {
        this.storage.set("race.numberOfLaps", this.numberOfLaps);
        this.storage.set("race.keepAwakeDuringRace", this.keepAwakeDuringRace);
    }

}
