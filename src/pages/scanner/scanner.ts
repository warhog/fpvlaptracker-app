import {Component} from '@angular/core';
import {NavController} from 'ionic-angular';
import {Storage} from '@ionic/storage';
import {BluetoothPage} from '../bluetooth/bluetooth';
import {NgZone} from '@angular/core';
import {FltutilProvider} from '../../providers/fltutil/fltutil'
import {FltunitProvider} from '../../providers/fltunit/fltunit'

@Component({
    selector: 'page-scanner',
    templateUrl: 'scanner.html'
})
export class ScannerPage {

    private channelData: any = null;
    private maxFreq: string = "";
    private maxRssi: number = 0;
    private channels: {freq: number, rssi: number}[] = [];

    constructor(public zone: NgZone, private storage: Storage, private fltutil: FltutilProvider, private fltunit: FltunitProvider, public navCtrl: NavController) {

    }

    scanChannels() {
        this.fltutil.showLoader("Scanning channels...");
        let me = this;
        this.fltunit.loadConfigData().catch(function (msg: string) {
            me.fltutil.hideLoader();
            me.fltutil.showToast("Cannot get channels: " + msg);
        });
    }

    gotoSettings() {
        this.navCtrl.push(BluetoothPage);
    }

    doConnect() {
        let me = this;
        this.storage.get("bluetooth.id").then((id: string) => {
            this.storage.get("bluetooth.name").then((name: string) => {
                this.fltunit.connect(id, name)
                    .then(function () {

                    })
                    .catch(function (errMsg: string) {
                        me.fltunit.disconnect();
                        me.fltutil.showToast(errMsg);
                        me.gotoSettings();
                    });
            }).catch(() => {
                me.gotoSettings();
            });
        }).catch(() => {
            me.gotoSettings();
        });
    }

    subscribe() {
        let me = this;
        this.fltunit.getObservable().subscribe(data => {
            me.fltutil.hideLoader();
            if (data.type == "message") {
                me.fltutil.showToast(data.message);
            } else if (data.type == "newScanData") {
                me.channels = data.channels;
                me.maxFreq = data.maxFreq;
                me.maxRssi = data.maxRssi;
            }
        });
    }

    ionViewDidEnter() {
        this.doConnect();
        this.subscribe();
    }

    ionViewWillLeave() {
        this.fltunit.disconnect();
    }
}