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

  Hooks.on('renderReadyCheckHud', () => {});

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
