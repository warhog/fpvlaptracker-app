import {NgModule, ErrorHandler} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';
import {IonicApp, IonicModule, IonicErrorHandler} from 'ionic-angular';
import {FpvlaptrackerApp} from './app.component';

import {BluetoothPage} from '../pages/bluetooth/bluetooth';
import {SettingsPage} from '../pages/settings/settings';
import {ScannerPage} from '../pages/scanner/scanner';
import {RacePage} from '../pages/race/race';
import {DevicePage} from '../pages/device/device';
import {HomePage} from '../pages/home/home';
import {TabsPage} from '../pages/tabs/tabs';
import {FastrssiPage} from '../pages/fastrssi/fastrssi';

import {StatusBar} from '@ionic-native/status-bar';
import {SplashScreen} from '@ionic-native/splash-screen';

import {BluetoothSerial} from '@ionic-native/bluetooth-serial';
import {IonicStorageModule} from '@ionic/storage';
import {SmartAudioProvider} from '../providers/smart-audio/smart-audio';
import {NativeAudio} from '@ionic-native/native-audio';
import {Insomnia} from '@ionic-native/insomnia';
import {FltutilProvider} from '../providers/fltutil/fltutil';
import {FltunitProvider} from '../providers/fltunit/fltunit';

@NgModule({
    declarations: [
        FpvlaptrackerApp,
        BluetoothPage,
        SettingsPage,
        ScannerPage,
        DevicePage,
        RacePage,
        HomePage,
        TabsPage,
        FastrssiPage
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
        ScannerPage,
        DevicePage,
        RacePage,
        HomePage,
        TabsPage,
        FastrssiPage
    ],
    providers: [
        StatusBar,
        SplashScreen,
        BluetoothSerial,
        {provide: ErrorHandler, useClass: IonicErrorHandler},
        NativeAudio,
        SmartAudioProvider,
        Insomnia,
        FltutilProvider,
        FltunitProvider,
        FltunitProvider
    ]
})
export class AppModule {}
