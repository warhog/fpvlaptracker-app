import {Component} from '@angular/core';
import {NavController} from 'ionic-angular';
import {Storage} from '@ionic/storage';
import {BluetoothPage} from '../bluetooth/bluetooth';

@Component({
    selector: 'page-settings',
    templateUrl: 'settings.html'
})
export class SettingsPage {

    private bluetoothDevice: string = "none";

    constructor(private storage: Storage, public navCtrl: NavController) {
        storage.get("bluetooth.name").then((name: string) => {
            this.bluetoothDevice = name;
        });
    }
    
    gotoBluetoothSelection() {
        this.navCtrl.push(BluetoothPage);
    }

}
