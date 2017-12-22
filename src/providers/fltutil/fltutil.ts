import {Injectable} from '@angular/core';
import 'rxjs/add/operator/map';
import {LoadingController} from 'ionic-angular';
import {ToastController} from 'ionic-angular';

/*
  Generated class for the TestProvider provider.

  See https://angular.io/docs/ts/latest/guide/dependency-injection.html
  for more info on providers and Angular DI.
*/
@Injectable()
export class FltutilProvider {

    private loader: any = null;

    constructor(private loadingCtrl: LoadingController, private toastCtrl: ToastController) {
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

    showToast(errMsg: string) {
        let toast = this.toastCtrl.create({
            message: errMsg,
            duration: 5000
        });
        toast.present();
    }

}
