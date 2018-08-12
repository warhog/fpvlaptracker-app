import {Component} from '@angular/core';
import {NavController} from 'ionic-angular';
import {BluetoothPage} from '../bluetooth/bluetooth';
import {HomePage} from '../home/home';
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

@Component({
    selector: 'page-device',
    templateUrl: 'device.html'
})

export class DevicePage {

    private configData: ConfigData.ConfigData = {
        ssid: "",
        password: "",
        frequency: 0,
        minimumLapTime: 0,
        triggerThreshold: 0,
        triggerThresholdCalibration: 0,
        calibrationOffset: 0,
        state: "",
        triggerValue: 0
    };
    private rssi: number = 0;

    // linter complains about not used but is used in html
    private deviceName: string = "";

    constructor(
        public storage: Storage, 
        public navCtrl: NavController, 
        private fltutil: FltutilProvider, 
        private fltunit: FltunitProvider,
        private zone: NgZone
    ) {
    }

    getFrequencyTable(): number[] {
        let frequencies: number[] = [
            5865, 5845, 5825, 5805, 5785, 5765, 5745, 5725, // Band A
            5733, 5752, 5771, 5790, 5809, 5828, 5847, 5866, // Band B
            5705, 5685, 5665, 5645, 5885, 5905, 5925, 5945, // Band E
            5740, 5760, 5780, 5800, 5820, 5840, 5860, 5880, // Band F / Airwave
            5658, 5695, 5732, 5769, 5806, 5843, 5880, 5917, // Band C / Immersion Raceband
            5362, 5399, 5436, 5473, 5510, 5547, 5584, 5621  // Band D / 5.3
        ];
        return frequencies;
    }

    getFrequencyNameTable(): string[] {
        let frequencyNameTable: string[] = [
            "A1", "A2", "A3", "A4", "A5", "A6", "A7", "A8", // Band A
            "B1", "B2", "B3", "B4", "B5", "B6", "B7", "B8", // Band B
            "E1", "E2", "E3", "E4", "E5", "E6", "E7", "E8", // Band E
            "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", // Band F
            "R1", "R2", "R3", "R4", "R5", "R6", "R7", "R8", // Band C / Immersion Raceband
            "D1", "D2", "D3", "D4", "D5", "D6", "D7", "D8", // Band D / 5.3
        ];
        return frequencyNameTable;
    }

    validateFrequency(frequency: number): boolean {
        let frequencies: number[] = this.getFrequencyTable();
        return frequencies.indexOf(frequency) > -1;
    }

    getFrequencyName(frequency: number): string {
        let frequencies: number[] = this.getFrequencyTable();
        let frequencyNameTable: string[] = this.getFrequencyNameTable();
        let index = frequencies.indexOf(frequency);
        if (index >= 0) {
            return frequencyNameTable[index];
        }
        return "unknown";
    }

    reboot() {
        this.fltunit.reboot();
    }

    saveData() {
        this.fltunit.saveData(this.configData);
    }

    gotoSettings() {
        this.navCtrl.push(BluetoothPage);
    }

    gotoFastRssi() {
        this.navCtrl.push(FastrssiPage);
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
        this.fltunit.connect().catch(function (errMsg: string) {
            me.fltutil.showToast(errMsg);
            me.gotoSettings();
        });
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
