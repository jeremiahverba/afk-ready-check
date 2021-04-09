import { AfkStatus } from "./arc.js";
import { log } from "./debug.js";
export class ReadyCheckHud extends Application {
    constructor() {
        super();
        this.i18n = (toTranslate) => {
            return game.i18n.localize(toTranslate);
        };
    }
    performReadyCheck() {
        Hooks.callAll('afk-ready-check');
    }
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            template: '/modules/afk-ready-check/templates/ready-check.hbs',
            id: 'afk-ready-check-hud',
            classes: [],
            width: 200,
            height: 20,
            left: 150,
            top: 80,
            popOut: false,
            minimizable: false,
            resizable: false,
            title: 'afk-ready-check',
            dragDrop: [],
            tabs: [],
            scrollY: [],
        });
    }
    getData(options = {}) {
        const data = super.getData();
        data.id = 'afk-ready-check';
        data.playerStatuses = Array.from(game.playerStatuses).map(([name, status]) => {
            return { name, status: status.toString() };
        });
        log('data: ', data);
        return data;
    }
    activateListeners(html) {
        log('activate listeners: ', html);
        $('#readyButton').on('click', function () {
            log('ready button clicked!');
            Hooks.callAll('playerReportStatus', game.user.name, AfkStatus.notAfk);
        });
        $('#afkButton').on('click', function () {
            log('afk button clicked!');
            Hooks.callAll('playerReportStatus', game.user.name, AfkStatus.afk);
        });
    }
    hasPermission(token) {
        let actor = token.actor;
        let user = game.user;
        return game.user.isGM || (actor === null || actor === void 0 ? void 0 : actor.hasPerm(user, 'OWNER'));
    }
}
