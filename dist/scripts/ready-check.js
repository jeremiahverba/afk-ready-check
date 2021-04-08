import { log } from "./debug.js";
export class ReadyCheckHud extends Application {
    constructor() {
        super();
        this.i18n = (toTranslate) => {
            return game.i18n.localize(toTranslate);
        };
        this.allTokens = null;
        this.selectedTokens = [];
        this.searchTerm = null;
        this.defaultLeftPos = 150;
        this.defaultTopPos = 80;
    }
    setTokensReference(tokens) {
        this.allTokens = tokens;
    }
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            template: '/modules/afk-ready-check/templates/qss.hbs',
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
        data.statuses = CONFIG.statusEffects
            .map((s) => {
            return Object.assign(Object.assign({}, s), { label: s.label.replace('EFFECT.Status', '') });
        })
            .filter((s) => {
            if (this.searchTerm && this.searchTerm.trim()) {
                return s.label.toLowerCase().includes(this.searchTerm.toLowerCase());
            }
            return true;
        });
        data.searchTerm = this.searchTerm;
        log('data: ', data);
        return data;
    }
    moveCursorToEnd(el) {
        if (typeof el.selectionStart == 'number') {
            el.selectionStart = el.selectionEnd = el.value.length;
        }
        else if (typeof el.createTextRange != 'undefined') {
            el.focus();
            var range = el.createTextRange();
            range.collapse(false);
            range.select();
        }
    }
    activateListeners(html) {
        log('activate listeners: ', html);
        const quickStatusSelectHud = '#afk-ready-check';
        const repositionIcon = '#qss-reposition';
        const quickInput = '.qss-quick-input';
        const quickStatusEntry = '.qss-status-entry';
        const qi = html.find(quickInput);
        qi.on('input', (e) => {
            log('quick input change: ', e.target.value);
            this.searchTerm = e.target.value.trim();
            this.updateHud();
        });
        qi.focus();
        if (typeof qi[0].selectionStart == 'number') {
            qi[0].selectionStart = qi[0].selectionEnd = qi[0].value.length;
        }
        else if (typeof qi[0].createTextRange != 'undefined') {
            qi.focus();
            var range = qi[0].createTextRange();
            range.collapse(false);
            range.select();
        }
        html.find(repositionIcon).mousedown((ev) => {
            ev.preventDefault();
            ev = ev || window.event;
            let hud = $(document.body).find(quickStatusSelectHud);
            let marginLeft = parseInt(hud.css('marginLeft').replace('px', ''));
            let marginTop = parseInt(hud.css('marginTop').replace('px', ''));
            dragElement(document.getElementById('afk-ready-check'));
            let pos1 = 0;
            let pos2 = 0;
            let pos3 = 0;
            let pos4 = 0;
            function dragElement(elmnt) {
                elmnt.onmousedown = dragMouseDown;
                function dragMouseDown(e) {
                    e = e || window.event;
                    e.preventDefault();
                    pos3 = e.clientX;
                    pos4 = e.clientY;
                    document.onmouseup = closeDragElement;
                    document.onmousemove = elementDrag;
                }
                function elementDrag(e) {
                    e = e || window.event;
                    e.preventDefault();
                    // calculate the new cursor position:
                    pos1 = pos3 - e.clientX;
                    pos2 = pos4 - e.clientY;
                    pos3 = e.clientX;
                    pos4 = e.clientY;
                    // set the element's new position:
                    elmnt.style.top = elmnt.offsetTop - pos2 - marginTop + 'px';
                    elmnt.style.left = elmnt.offsetLeft - pos1 - marginLeft + 'px';
                    elmnt.style.position = 'fixed';
                    elmnt.style.zIndex = 100;
                }
                function closeDragElement() {
                    // stop moving when mouse button is released:
                    elmnt.onmousedown = null;
                    document.onmouseup = null;
                    document.onmousemove = null;
                    let xPos = elmnt.offsetLeft - pos1 > window.innerWidth ? window.innerWidth : elmnt.offsetLeft - pos1;
                    let yPos = elmnt.offsetTop - pos2 > window.innerHeight - 20 ? window.innerHeight - 100 : elmnt.offsetTop - pos2;
                    xPos = xPos < 0 ? 0 : xPos;
                    yPos = yPos < 0 ? 0 : yPos;
                    if (xPos != elmnt.offsetLeft - pos1 || yPos != elmnt.offsetTop - pos2) {
                        elmnt.style.top = yPos + 'px';
                        elmnt.style.left = xPos + 'px';
                    }
                    log(`Setting position to x: ${xPos}px, y: ${yPos}px, and saving in user flags.`);
                    game.user.update({ flags: { 'afk-ready-check': { hudPos: { top: yPos, left: xPos } } } });
                }
            }
        });
        html.find(quickStatusEntry).mouseup((ev) => {
            ev.preventDefault();
            ev = ev || window.event;
            log('clicked a status: ', ev.target);
            this.toggleCondition(JSON.parse(ev.target.getAttribute('data-status')));
        });
    }
    async toggleCondition(status) {
        if (status) {
            log('selected status: ', status);
            if (status.id.includes('combat-utility-belt.') && game.cub) {
                this.selectedTokens.forEach(async (t) => {
                    game.cub.hasCondition(status.label, t) ? await game.cub.removeCondition(status.label, t) : await game.cub.addCondition(status.label, t);
                });
            }
            else {
                this.selectedTokens.forEach(async (t) => {
                    await t.toggleEffect(status);
                });
            }
        }
    }
    setQssPosition() {
        log('setting position');
        let hudTitle = $(document).find('#qss-hudTitle');
        if (hudTitle.length > 0)
            hudTitle.css('top', -hudTitle[0].getBoundingClientRect().height);
        let token = this.selectedTokens && this.selectedTokens.length && this.selectedTokens[0];
        if (token) {
            this.setPositionBySelectedToken(token);
        }
        else {
            this.setUserPos();
        }
    }
    setUserPos() {
        log('user is repositioning');
        if (!(game.user.data.flags['afk-ready-check'] && game.user.data.flags['afk-ready-check'].hudPos)) {
            return;
        }
        this.getElementAndSetPosition();
    }
    getElementAndSetPosition() {
        let pos = game.user.data.flags['afk-ready-check'].hudPos;
        let defaultLeftPos = this.defaultLeftPos;
        let defaultTopPos = this.defaultTopPos;
        let elmnt = document.getElementById('afk-ready-check');
        log('attempting to get element: ', elmnt, pos, defaultLeftPos, defaultTopPos);
        if (elmnt) {
            elmnt.style.bottom = null;
            elmnt.style.top = pos.top < 5 || pos.top > window.innerHeight + 5 ? defaultTopPos + 'px' : pos.top + 'px';
            elmnt.style.left = pos.left < 5 || pos.left > window.innerWidth + 5 ? defaultLeftPos + 'px' : pos.left + 'px';
            elmnt.style.position = 'fixed';
            elmnt.style.zIndex = '100';
            return true;
        }
        return false;
    }
    setPositionBySelectedToken(token) {
        log('setting position based on selected token');
        let elmnt = $('#afk-ready-check');
        if (elmnt) {
            elmnt.css('bottom', null);
            elmnt.css('left', token.worldTransform.tx + (token.data.width * canvas.dimensions.size + 100) * canvas.scene._viewPosition.scale + 'px');
            elmnt.css('top', token.worldTransform.ty + 0 + 'px');
            elmnt.css('position', 'fixed');
            elmnt.css('zIndex', 100);
        }
    }
    updateHud() {
        log('Updating HUD');
        if (this.selectedTokens && this.selectedTokens.length) {
            log('will render');
            this.render();
        }
    }
    hasPermission(token) {
        let actor = token.actor;
        let user = game.user;
        return game.user.isGM || (actor === null || actor === void 0 ? void 0 : actor.hasPerm(user, 'OWNER'));
    }
}
