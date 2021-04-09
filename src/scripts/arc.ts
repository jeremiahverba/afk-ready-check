import { preloadTemplates } from '../module/preloadTemplates.js';
import { log } from './debug.js';
import { ReadyCheckHud } from './ready-check.js';

declare global {
  interface Game {
    readyCheckHud: ReadyCheckHud;
    playerStatuses: Map<string, AfkStatus>;
  }
}

Hooks.once('init', async function () {
  log('Initializing afk-ready-check');
  await preloadTemplates();
});

Hooks.once('canvasReady', async () => {
  log('got canvas ready hook!', game, canvas);

  initializeAllPlayersAfkStatuses();

  if (!game.readyCheckHud) {
    game.readyCheckHud = new ReadyCheckHud();
  }

  Hooks.on('playerReportStatus', async (name: string, status: AfkStatus) => {
    log('player reporting status: ', name, status);
    game.playerStatuses.set(name, status);
    renderPlayerAfkStatus(name, status);
    game.readyCheckHud.render(true);
    if (Array.from(game.playerStatuses.values()).every((s) => s !== AfkStatus.unknown)) {
      await game.readyCheckHud.close();
    }
  });

  Hooks.on('afk-ready-check', () => {
    log('got the afk-ready-check hook!');
    game.readyCheckHud.render(true);
  });

  Hooks.on('renderReadyCheckHud', () => {
    log('got the renderReadyCheckHud hook!');
    setTimeout(() => {
      game.readyCheckHud.close();
    }, 10_000);
  });

  Hooks.on('preCreateChatMessage', (data, options) => {
    if (data.content.toLowerCase().trim() === '/readycheck') {
      log('ready check chat command intercepted!');
      setAllPlayerStatusesToUnknown();
      processAllPlayerStatuses();
      game.readyCheckHud.performReadyCheck();
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

function initializeAllPlayersAfkStatuses(): void {
  if (!game.playerStatuses) {
    const statuses = game.users.map((u) => {
      log('user: ', u, u.data);
      const status = u.active ? AfkStatus.notAfk : AfkStatus.afk;
      return { name: u.data.name, afk: status };
    });
    log('Detected the current player statuses: ', statuses);
    game.playerStatuses = new Map<string, AfkStatus>(statuses.map((s) => [s.name, s.afk]));
  }
  processAllPlayerStatuses();
}

function setAllPlayerStatusesToUnknown(): void {
  game.playerStatuses.forEach((status, name, allStatuses) => {
    log('setting player status: ', name, AfkStatus.unknown);
    game.playerStatuses.set(name, AfkStatus.unknown);
  });
}
function processAllPlayerStatuses(): void {
  game.playerStatuses.forEach((status, name, allStatuses) => {
    log('rendering player status: ', name, status);
    renderPlayerAfkStatus(name, status);
  });
}

function renderPlayerAfkStatus(playerName: string, status: AfkStatus): void {
  log('rendering player status: ', playerName, status);
  const playerNameSpans = Array.from(document.getElementsByClassName('player-name'));
  log('found spans: ', playerNameSpans);
  const playerSpan = playerNameSpans.find((pns) => (pns as any).innerText.split(' ')[0] === playerName);
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

function getIconClass(status: AfkStatus): string {
  if (status === AfkStatus.unknown) {
    return `fas fa-question player-unknown`;
  }
  if (status === AfkStatus.afk) {
    return `fas fa-dice-d20 player-afk`;
  }
  return `fas fa-dice-d20 player-not-afk`;
}

function isGM(): boolean {
  return game.user.isGM;
}

export enum AfkStatus {
  notAfk,
  afk,
  unknown,
}
