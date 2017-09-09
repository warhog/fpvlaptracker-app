import {NgModule, ErrorHandler} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';
import {IonicApp, IonicModule, IonicErrorHandler} from 'ionic-angular';
import {FpvlaptrackerApp} from './app.component';

import {BluetoothPage} from '../pages/bluetooth/bluetooth';
import {SettingsPage} from '../pages/settings/settings';
import {RacePage} from '../pages/race/race';
import {DevicePage} from '../pages/device/device';
import {HomePage} from '../pages/home/home';
import {TabsPage} from '../pages/tabs/tabs';

import {StatusBar} from '@ionic-native/status-bar';
import {SplashScreen} from '@ionic-native/splash-screen';

import {BluetoothSerial} from '@ionic-native/bluetooth-serial';
import {IonicStorageModule} from '@ionic/storage';
import {SmartAudioProvider} from '../providers/smart-audio/smart-audio';
import {NativeAudio} from '@ionic-native/native-audio';
import {Insomnia} from '@ionic-native/insomnia';

@NgModule({
    declarations: [
        FpvlaptrackerApp,
        BluetoothPage,
        SettingsPage,
        DevicePage,
        RacePage,
        HomePage,
        TabsPage
    ],
    imports: [
        BrowserModule,
        IonicModule.forRoot(FpvlaptrackerApp),
        IonicStorageModule.forRoot()
    ],
    bootstrap: [IonicApp],
    entryComponents: [
        FpvlaptrackerApp,
        BluetoothPage,
        SettingsPage,
        DevicePage,
        RacePage,
        HomePage,
        TabsPage
    ],
    providers: [
        StatusBar,
        SplashScreen,
        BluetoothSerial,
        {provide: ErrorHandler, useClass: IonicErrorHandler},
        NativeAudio,
        SmartAudioProvider,
        Insomnia
    ]
})
export class AppModule {}
