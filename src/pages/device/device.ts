import {Component} from '@angular/core';
import {NavController} from 'ionic-angular';
import {BluetoothPage} from '../bluetooth/bluetooth';
import {Storage} from '@ionic/storage';
import {FltutilProvider} from '../../providers/fltutil/fltutil';
import {FltunitProvider} from '../../providers/fltunit/fltunit';
import {NgZone} from '@angular/core';
import {FastrssiPage} from '../fastrssi/fastrssi';
import * as ConfigData from '../../models/configdata'
import * as RuntimeData from '../../models/runtimedata'
import * as StateData from '../../models/statedata'
import * as RssiData from '../../models/rssidata'
import * as MessageData from '../../models/messagedata'
import { ScannerPage } from '../scanner/scanner';
import { HomePage } from '../home/home';
import { HelpPage } from '../help/home';

@Component({
    selector: 'page-device',
    templateUrl: 'device.html'
})

export class DevicePage {

    private configData: ConfigData.ConfigData = {
        type: "config",
        ssid: "",
        password: "",
        frequency: 0,
        minimumLapTime: 0,
        triggerThreshold: 0,
        triggerThresholdCalibration: 0,
        calibrationOffset: 0,
        state: "",
        triggerValue: 0,
        voltage: 0,
        uptime: 0
    };
    private rssi: number = 0;
    private deviceName: string = "";

    constructor(
        public storage: Storage, 
        public navCtrl: NavController, 
        private fltutil: FltutilProvider, 
        private fltunit: FltunitProvider,
        private zone: NgZone
    ) {
    }

    reboot() {
        this.fltunit.reboot();
        this.navCtrl.push(HomePage);
    }

    saveData() {
        this.fltunit.saveData(this.configData);
    }

    gotoSettings() {
        this.navCtrl.push(BluetoothPage);
        this.fltunit.disconnect();
    }

    gotoHelp() {
        this.navCtrl.push(HelpPage);
        this.fltunit.disconnect();
    }

    gotoFastRssi() {
        this.navCtrl.push(FastrssiPage);
        this.fltunit.disconnect();
    }
    
    requestData() {
        this.fltutil.showLoader("Loading configuration...");
        let me = this;
        this.fltunit.loadConfigData().catch(function (msg: string) {
            me.fltutil.hideLoader();
            me.fltutil.showToast("Cannot get configuration: " + msg);
        });
    }

    requestRssi() {
        let me = this;
        this.fltunit.loadRssi().catch(function (msg: string) {
            me.fltutil.showToast("Cannot get rssi: " + msg);
        });
    }

    requestState() {
        let me = this;
        this.fltunit.loadState().catch(function (msg: string) {
            me.fltutil.showToast("Cannot get state: " + msg);
        });
    }

    requestTriggerValue() {
        let me = this;
        this.fltunit.loadTriggerValue().catch(function (msg: string) {
            me.fltutil.showToast("Cannot get trigger value: " + msg);
        });
    }

    doConnect() {
        let me = this;
        this.fltunit.connect().then(function() {
            me.deviceName = me.fltunit.getDeviceName();
        }).catch(function (errMsg: string) {
            me.fltutil.showToast(errMsg);
            me.gotoSettings();
        });
    }

    gotoScanner() {
        this.navCtrl.push(ScannerPage);
        this.fltunit.disconnect();
    }

    subscribe() {
        if (!this.fltunit.isConnected()) {
            this.fltutil.showToast('Not connected');
            this.fltutil.hideLoader();
            this.navCtrl.pop();
            return;
        }
        let me = this;
        this.fltunit.getObservable().subscribe(data => {
            me.fltutil.hideLoader();
            if (ConfigData.isConfigData(data)) {
                me.zone.run(() => {
                    me.configData = data;
                });
            } else if (RuntimeData.isRuntimeData(data)) {
                me.zone.run(() => {
                    me.configData.triggerValue = data.triggerValue;
                });
            } else if (StateData.isStateData(data)) {
                me.zone.run(() => {
                    me.configData.state = data.state;
                });
            } else if (RssiData.isRssiData(data)) {
                me.zone.run(() => {
                    me.rssi = data.rssi;
                });
            } else if (MessageData.isMessageData(data)) {
                me.fltutil.showToast(data.message);
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
