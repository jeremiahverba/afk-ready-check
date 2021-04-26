import { preloadTemplates } from '../module/preloadTemplates.js';
import { log } from './debug.js';
import { ReadyCheckHud } from './ready-check.js';
const AFK_READY_CHECK_CHAT_COMMAND = '/readycheck';
export const SOCKET_NAME = 'module.afk-ready-check';
export var ArcSocketEventType;
(function (ArcSocketEventType) {
    ArcSocketEventType["readyCheck"] = "afk-ready-check-event";
    ArcSocketEventType["statusReport"] = "afk-ready-check-status-report-event";
})(ArcSocketEventType || (ArcSocketEventType = {}));
Hooks.once('init', async function () {
    log('Initializing afk-ready-check');
    await preloadTemplates();
});
Hooks.once('canvasReady', async () => {
    log('got canvas ready hook!', game, canvas);
    const socket = game.socket;
    socket.on(SOCKET_NAME, (socketEvent) => {
        log('got socket event: ', socketEvent);
        switch (socketEvent.type) {
            case ArcSocketEventType.readyCheck:
                log('got the afk-ready-check socket event!');
                if (!isGM()) {
                    setAllPlayerStatusesToUnknown();
                    game.readyCheckHud.render(true);
                }
                break;
            case ArcSocketEventType.statusReport:
                const name = socketEvent.data.name;
                const status = socketEvent.data.status;
                log('player reporting status: ', name, status);
                game.playerStatuses.set(name, status);
                renderPlayerAfkStatus(name, status);
                game.readyCheckHud.render(false);
                const playerStatusesArray = Array.from(game.playerStatuses.values());
                if (playerStatusesArray.every((s) => s !== AfkStatus.unknown)) {
                    log('all players reported successfully, shutting down...');
                    game.readyCheckHud.shutdown();
                }
                break;
            default:
                log('unexpected socket event type received.', socketEvent);
        }
    });
    initializeAllPlayersAfkStatuses();
    if (!game.readyCheckHud) {
        game.readyCheckHud = new ReadyCheckHud();
    }
    Hooks.on('preCreateChatMessage', (data, options) => {
        if (data.content.toLowerCase().trim() === AFK_READY_CHECK_CHAT_COMMAND && isGM()) {
            log('ready check chat command intercepted!');
            socket.emit(SOCKET_NAME, { type: ArcSocketEventType.readyCheck, data: {} });
            setAllPlayerStatusesToUnknown();
            game.readyCheckHud.render(true);
            return false;
        }
    });
    Hooks.on('updateUser', ([user, character, diff, id]) => {
        const name = user.data.name;
        const active = user.data.active;
        const status = active ? AfkStatus.notAfk : AfkStatus.afk;
        log('got updateUser hook for: ', user, name);
        log('setting player to the known statuses: ', name, false);
        game.playerStatuses.set(name, status);
        log('rendering all player statuses');
        processAllPlayerStatuses();
    });
    Hooks.on('renderPlayerList', (app, html, data) => {
        processAllPlayerStatuses();
    });
});
function initializeAllPlayersAfkStatuses() {
    if (!game.playerStatuses) {
        const statuses = game.users.map((u) => {
            log('user: ', u, u.data);
            const status = u.active ? AfkStatus.notAfk : AfkStatus.afk;
            return { name: u.data.name, afk: status };
        });
        log('Detected the current player statuses: ', statuses);
        game.playerStatuses = new Map(statuses.map((s) => [s.name, s.afk]));
    }
    processAllPlayerStatuses();
}
function setAllPlayerStatusesToUnknown() {
    game.playerStatuses.forEach((status, name, allStatuses) => {
        log('setting player status: ', name, AfkStatus.unknown);
        game.playerStatuses.set(name, AfkStatus.unknown);
        renderPlayerAfkStatus(name, status);
    });
}
function processAllPlayerStatuses() {
    game.playerStatuses.forEach((status, name, allStatuses) => {
        log('rendering player status: ', name, status);
        renderPlayerAfkStatus(name, status);
    });
}
function renderPlayerAfkStatus(playerName, status) {
    log('rendering player status: ', playerName, status);
    const playerNameSpans = Array.from(document.getElementsByClassName('player-name'));
    log('found spans: ', playerNameSpans);
    const playerSpan = playerNameSpans.find((pns) => pns.innerText.split(' ')[0] === playerName);
    log('found specific span for this player: ', playerSpan);
    if (playerSpan) {
        const icon = document.createElement('i');
        icon.className = getIconClass(status);
        if (playerSpan.hasChildNodes()) {
            playerSpan.childNodes.forEach((n) => {
                if (!n.textContent) {
                    playerSpan.removeChild(n);
                }
            });
        }
        playerSpan.appendChild(icon);
    }
}
function getIconClass(status) {
    if (status === AfkStatus.unknown) {
        return `fas fa-question player-unknown`;
    }
    if (status === AfkStatus.afk) {
        return `fas fa-dice-d20 player-afk`;
    }
    return `fas fa-dice-d20 player-not-afk`;
}
function isGM() {
    return game.user.isGM;
}
export var AfkStatus;
(function (AfkStatus) {
    AfkStatus[AfkStatus["notAfk"] = 0] = "notAfk";
    AfkStatus[AfkStatus["afk"] = 1] = "afk";
    AfkStatus[AfkStatus["unknown"] = 2] = "unknown";
})(AfkStatus || (AfkStatus = {}));
