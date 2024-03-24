export default class TabsJustice extends Tabs {
    /* @override */
    bind(html) {
        if (!this._nav) {
            this._nav = html.closest(".app")?.querySelector(this._navSelector);
            this._nav?.addEventListener("click", this._onClickNav.bind(this));
        }
        if (!this._nav) return;
        if (!this._contentSelector) this._content = null;
        else if (html.matches(this._contentSelector)) this._content = html;
        else this._content = html.querySelector(this._contentSelector);
        this.activate(this.activate);
    }
}