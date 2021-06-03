import { AfkStatus, ArcSocketEventType, SOCKET_NAME } from './arc';
import { log } from './debug';

export const AFK_READY_CHECK_HOOK_NAME = 'afk-ready-check-hook';
const AFK_READY_CHECK_TIMEOUT = 60_000;
const AFK_READY_CHECK_INTERVAL = 1_000;

function sendStatusReportSocketEvent(status: AfkStatus): void {
  const socket = game.socket as SocketIOClient.Socket;
  socket.emit(SOCKET_NAME, { type: ArcSocketEventType.statusReport, data: { name: game.user.name, status: status } });
}

export class ReadyCheckHud extends Application {
  i18n = (toTranslate: string) => {
    return game.i18n.localize(toTranslate);
  };

  private countDownTimerId: number;
  private countDownIntervalId: number;
  private countDownCounter = 60;
  constructor() {
    super();
    log('ready-check hud constructor');
  }

  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      template: '/modules/afk-ready-check/templates/ready-check.hbs',
      id: 'afk-ready-check-hud',
      classes: [],
      width: 600,
      left: 980,
      top: 0,
      popOut: true,
      minimizable: false,
      resizable: false,
      title: 'afk-ready-check',
      dragDrop: [],
      tabs: [],
      scrollY: [],
    });
  }

  public getData(options = {}): any {
    const data = super.getData();
    data.id = 'afk-ready-check';
    data.playerStatuses = Array.from(game.playerStatuses).map(([name, status]) => {
      return { name, status: status.toString() };
    });
    data.countDownCounter = this.countDownCounter;
    log('data: ', data);
    return data;
  }

  activateListeners(html): void {
    log('activate listeners: ', html, this);

    if (!this.countDownTimerId && !this.countDownIntervalId) {
      log('starting timeout timer');
      this.countDownCounter = 60;
      this.countDownIntervalId = setInterval(() => {
        log('countdown update interval fired');
        this.updateCountdown();
      }, AFK_READY_CHECK_INTERVAL);

      this.countDownTimerId = setTimeout(() => {
        log('countdown has elapsed, reporting user as afk and closing');
        sendStatusReportSocketEvent(AfkStatus.afk);
        this.killTimeoutAndInterval();
        // give some room for the other status's to report at the end of their timers, so we don't pop back open.
        setTimeout(() => this.close(), 1000);
      }, AFK_READY_CHECK_TIMEOUT);
    }

    const self = this;
    $('#readyButton').on('click', function () {
      log('ready button clicked!');
      sendStatusReportSocketEvent(AfkStatus.notAfk);
      game.playerStatuses.set(game.user.name, AfkStatus.notAfk);
      self.killTimeoutAndInterval();
      self.render();
    });
    $('#afkButton').on('click', function () {
      log('afk button clicked!');
      sendStatusReportSocketEvent(AfkStatus.afk);
      game.playerStatuses.set(game.user.name, AfkStatus.afk);
      self.killTimeoutAndInterval();
      self.render();
    });
  }

  async shutdown(): Promise<void> {
    this.killTimeoutAndInterval();
    await this.close();
  }

  killTimeoutAndInterval(): void {
    log('killing timeout and interval');
    clearInterval(this.countDownIntervalId);
    clearTimeout(this.countDownTimerId);
    this.countDownCounter = 60;
  }

  updateCountdown(): void {
    this.countDownCounter--;
    log('updating the countdown: ', this.countDownCounter);
    this.render();
  }
}
