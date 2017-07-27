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

    private state: number = STATES.DISCONNECTED;
    private raceState: RACESTATE = RACESTATE.STOP;
    private raceStateText: string = "";
    private loader: any = null;
    private lastLapTime: number = 0;
    private lapTimes: number[] = [];
    private currentLap: number = 1;
    private maxLaps: number = 10;
    private fastestLap: number = 1;
    private fastestLapTime: number = 0;
    private averageLapTime: number = 0;

    restartRace() {
        this.setRaceState(RACESTATE.WAITING);
        this.lapTimes = [];
        this.currentLap = 1;
    }

    setRaceState(state: RACESTATE) {
        this.raceState = state;
        this.raceStateText = this.getStateText();
    }

    getStateText(): string {
        switch (this.raceState) {
            case RACESTATE.WAITING:
                return "Waiting";
            case RACESTATE.STOP:
                return "Stopped";
            case RACESTATE.RUNNING:
                return "Running";
            default:
                return "Unknown";
        }
    }

    constructor(private storage: Storage, public toastCtrl: ToastController, public navCtrl: NavController, private loadingCtrl: LoadingController, private bluetoothSerial: BluetoothSerial) {
        this.restartRace();
        this.setRaceState(RACESTATE.STOP);
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

    showLoader(text: string) {
        this.loader = this.loadingCtrl.create({
            content: text
        });
        this.loader.present();
    }

    hideLoader() {
        this.loader.dismiss();
    }

    convertTime(time: number): string {
        let minutes: number = 0;
        let milliseconds: number = time % 1000;
        let seconds: number = time / 1000;
        if (seconds >= 60) {
            minutes = seconds / 60;
            seconds = seconds % 60;
        }
        let minutesString: string = minutes.toFixed(0);
        let secondsString: string = seconds.toFixed(0)
        let millisecondsString: string = milliseconds.toString();
        if (milliseconds <= 99) {
            millisecondsString = "0" + millisecondsString;
        }
        if (milliseconds <= 9) {
            millisecondsString = "0" + millisecondsString;
        }
        if (seconds <= 9) {
            secondsString = "0" + secondsString;
        }

        if (minutes > 0) {
            return minutesString + "m" + secondsString + "." + millisecondsString + "s";
        }
        return secondsString + "." + millisecondsString + "s";

    }

    isRaceRunning(): boolean {
        return this.raceState == RACESTATE.RUNNING;
    }

    isRaceWaiting(): boolean {
        return this.raceState == RACESTATE.WAITING;
    }

    onReceive(data: string) {
        if (data.startsWith("LAP: ") && (this.isRaceRunning() || this.isRaceWaiting())) {
            if (this.currentLap == this.maxLaps) {
                this.showToast("Race ended, max. number of laps reached");
                this.setRaceState(RACESTATE.STOP);
            } else {
                this.setRaceState(RACESTATE.RUNNING);
                let lapTime: string = data.substring(5);
                this.lastLapTime = Number(lapTime);
                this.lapTimes.push(this.lastLapTime);
                this.currentLap++;

                let fastestLap = 0;
                let fastestLapTime = 99999999;
                let avgLapTime = 0;
                this.lapTimes.forEach(function (lap, index) {
                    if (lap < fastestLapTime) {
                        fastestLapTime = lap;
                        fastestLap = index + 1;
                    }
                    avgLapTime += lap;
                });
                avgLapTime = avgLapTime / this.lapTimes.length;
                this.averageLapTime = avgLapTime;
                this.fastestLap = fastestLap;
                this.fastestLapTime = fastestLapTime;
            }
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

enum RACESTATE {
    WAITING = 0,
    STOP,
    RUNNING
}

enum STATES {
    DISCONNECTED = 0,
    CONNECTED,
    VALID_TEST,
    VALIDATED,
    CHECK_SAVE_SUCCESS
}

