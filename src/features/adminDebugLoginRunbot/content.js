import LimitedRunbotContentFeature from '../../shared/limitedRunbot/content.js';
import configuration from './configuration.js';

export default class AdminDebugLoginRunbotContentFeature extends LimitedRunbotContentFeature {
    constructor() {
        super(configuration);
    }

    async loadFeature(url) {
        console.log('loadFeature');
        if (!this.isRunbotPage(url)) return;

        console.log(url);
        this.appendRunbotAdminDebugLogin();
    }

    async appendRunbotAdminDebugLogin() {
        const btnIdentifier = 'qol-admin-debug-login-runbot';

        Array.from(document.getElementsByClassName(btnIdentifier)).forEach((e) => e.remove());

        const signIn = Array.from(document.getElementsByClassName('fa fa-sign-in btn btn-info'));

        signIn.forEach((btn) => {
            if (!btn.href.includes('static/build')) {
                const newBtn = document.createElement('a');
                newBtn.className = `${btnIdentifier} fa fa-rocket btn btn-warning`;
                newBtn.style.color = '#444';
                newBtn.onclick = (e) => this.openEventRunbot(e, false);
                newBtn.onauxclick = (e) => this.openEventRunbot(e, true);
                newBtn.href = btn.href;
                newBtn.title = 'Open runbot as admin and with debug mode enabled';
                btn.after(newBtn);
            }
        });
    }

    async openEventRunbot(e, newTab) {
        e.preventDefault();
        this.openRunbot(e.target.href, newTab);
    }
}
