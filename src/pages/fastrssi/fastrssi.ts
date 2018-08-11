import {Component} from '@angular/core';
import {NavController} from 'ionic-angular';
import {Storage} from '@ionic/storage';
import {BluetoothPage} from '../bluetooth/bluetooth';
import {NgZone} from '@angular/core';
import {FltutilProvider} from '../../providers/fltutil/fltutil'
import {FltunitProvider} from '../../providers/fltunit/fltunit'

@Component({
    selector: 'page-fastrssi',
    templateUrl: 'fastrssi.html'
})
export class FastrssiPage {

    private rssi: number = 0;
    private fastrssiRunning: boolean = false;

    constructor(public zone: NgZone, private storage: Storage, private fltutil: FltutilProvider, private fltunit: FltunitProvider, public navCtrl: NavController) {

    }

    startFastRssi() {
        let me = this;
        this.fltunit.startFastRssi().then(function() {
            me.fastrssiRunning = true;
        }).catch(function (msg: string) {
            me.fltutil.showToast("Cannot start fastrssi: " + msg);
        });
    }

    stopFastRssi() {
        let me = this;
        if (this.fastrssiRunning) {
            this.fltunit.stopFastRssi().then(function() {
                me.fastrssiRunning = false;
            }).catch(function (msg: string) {
                me.fltutil.showToast("Cannot stop fastrssi: " + msg);
            });
        }
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
            } else if (data.type == "newRssiValue") {
                me.zone.run(() => {
                    if (data.rssi == NaN) {
                        data.rssi = 0;
                    }
                    me.rssi = data.rssi;
                    
                });
            }
        });
    }

    ionViewDidEnter() {
        this.doConnect();
        this.subscribe();
    }

    ionViewWillLeave() {
        this.stopFastRssi();
        this.fltunit.disconnect();
    }
}