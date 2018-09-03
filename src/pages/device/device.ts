import {Component} from '@angular/core';
import {NavController, AlertController, ViewController} from 'ionic-angular';
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
import { ProfileData } from '../../models/profiledata';

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
    private profile: string = "";
    private profiles: ProfileData[] = [];

    constructor(
        public storage: Storage, 
        public navCtrl: NavController, 
        private fltutil: FltutilProvider, 
        private fltunit: FltunitProvider,
        private zone: NgZone,
        private alertCtrl: AlertController,
        private viewCtrl: ViewController
    ) {
        this.loadProfiles();
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
            me.subscribe();
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
        let me = this;
        this.fltunit.isConnected().catch(() => {
            me.fltutil.showToast('Not connected');
            me.fltutil.hideLoader();
            me.navCtrl.pop();
        }).then(() => {
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
        });
    }

    loadProfiles() {
        let me = this;
        let defaultProfile: ProfileData = this.getDefaultProfile();
        this.profiles = [defaultProfile];
        this.storage.get("profiles").then((profilesRaw: string) => {
            let tempProfiles: ProfileData = JSON.parse(profilesRaw);
            if (tempProfiles !== null) {
                me.profiles = me.profiles.concat(tempProfiles);
            }
        });
    }

    getDefaultProfile(): ProfileData {
        return {
            "name": "Default",
            "frequency": 5865,
            "minimumLapTime": 4000,
            "triggerThreshold": 40,
            "triggerThresholdCalibration": 120,
            "calibrationOffset": 10
        };
    }

    saveProfiles() {
        let profiles = this.profiles;
        let key: ProfileData = null;
        for (let i: number = 0; i < this.profiles.length; i++) {
            if (this.profiles[i].name == "Default") {
                key = this.profiles[i];
            }
        }
        var index = profiles.indexOf(key, 0);
        if (index > -1) {
            profiles.splice(index, 1);
        }
        this.storage.set("profiles", JSON.stringify(profiles));
        this.profiles.splice(0, 0, this.getDefaultProfile());
    }

    newProfile() {
        let me = this;
        let alert = this.alertCtrl.create({
            title: "New profile name",
            inputs: [{
                name: "profile",
                placeholder: "Enter profile name"
            }],
            buttons: [{
                text: "Cancel",
                role: "cancel",
                handler: data => {}
            }, {
                text: "Create",
                handler: (data) => {
                    if (data.profile == "Default") {
                        me.fltutil.showToast("Cannot create profile with name Default");
                        return false;
                    }
                    let tempProfile: ProfileData = {
                        name: data.profile,
                        calibrationOffset: me.configData.calibrationOffset,
                        frequency: me.configData.frequency,
                        minimumLapTime: me.configData.minimumLapTime,
                        triggerThreshold: me.configData.triggerThreshold,
                        triggerThresholdCalibration: me.configData.triggerThresholdCalibration
                    };
                    me.profiles = me.profiles.concat(tempProfile);
                    me.profile = data.profile;
                    me.saveProfiles();
                    me.fltutil.showToast("Profile created", 2000);
                }
            }]
          });
          alert.present();
    }

    updateProfile() {
        if (this.profile == "Default") {
            this.fltutil.showToast("Cannot update default profile");
            return;
        }
        for (let i: number = 0; i < this.profiles.length; i++) {
            if (this.profiles[i].name == this.profile) {
                this.profiles[i].frequency = this.configData.frequency;
                this.profiles[i].minimumLapTime = this.configData.minimumLapTime;
                this.profiles[i].triggerThreshold = this.configData.triggerThreshold;
                this.profiles[i].triggerThresholdCalibration = this.configData.triggerThresholdCalibration;
                this.profiles[i].calibrationOffset = this.configData.calibrationOffset;
            }
        }
        this.saveProfiles();
        this.fltutil.showToast("Profile updated", 2000);
    }

    removeProfile() {
        if (this.profile == "Default") {
            this.fltutil.showToast("Cannot remove default profile");
            return;
        }
        let alert = this.alertCtrl.create({
            title: "Remove profile?",
            message: "Do you really want to remove the profile '" + this.profile + "'?",
            buttons: [{
                text: "No",
                role: "cancel",
                handler: () => {}
            }, {
                text: "Yes",
                handler: () => {
                    let key: ProfileData = null;
                    for (let i: number = 0; i < this.profiles.length; i++) {
                        if (this.profiles[i].name == this.profile) {
                            key = this.profiles[i];
                        }
                    }
                    var index = this.profiles.indexOf(key, 0);
                    if (index > -1) {
                        this.profiles.splice(index, 1);
                    }
                    this.profile = "";
                    this.saveProfiles();
                    this.fltutil.showToast("Profile removed", 2000);
                }
            }]
          });
          alert.present();
    }

    changeProfile(newProfile: string) {
        let me = this;
        let alert = this.alertCtrl.create({
            title: "Overwrite values?",
            message: "You selected the profile '" + newProfile + "', this will overwrite the current data!\nContinue?",
            buttons: [{
                text: "No",
                role: "cancel",
                handler: () => {
                    me.profile = "";
                }
            }, {
                text: "Yes",
                handler: () => {
                    for (let i: number = 0; i < me.profiles.length; i++) {
                        if (me.profiles[i].name == newProfile) {
                            if (me.profiles[i].frequency !== -1) {
                                if (me.configData.frequency != me.profiles[i].frequency) {
                                    let alert = this.alertCtrl.create({
                                        title: "Changed frequency",
                                        subTitle: "You changed the frequency this tracker is listening to. Please power off your video transmitter and reboot unit after changing the profile!",
                                        buttons: ["OK"]
                                    });
                                    alert.present();
                                }
                                me.configData.frequency = me.profiles[i].frequency;
                            }
                            me.configData.minimumLapTime = me.profiles[i].minimumLapTime;
                            me.configData.triggerThreshold = me.profiles[i].triggerThreshold;
                            me.configData.triggerThresholdCalibration = me.profiles[i].triggerThresholdCalibration;
                            me.configData.calibrationOffset = me.profiles[i].calibrationOffset;
                            me.saveData();
                            break;
                        }
                    }
                }
            }]
          });
          alert.present();
    }

    ionViewDidEnter() {
        this.doConnect();
    }

    ionViewWillLeave() {
        this.fltunit.disconnect();
    }

    ionViewWillEnter() {
        this.viewCtrl.showBackButton(false);
    }

}