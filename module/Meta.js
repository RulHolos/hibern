export default class Meta_HUD extends FormApplication {
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            title: "Meta Options",
            template: "systems/hibern/templates/partials/meta-options.hbs",
            classes: ["hibern", "meta"],
            width: 500,
            height: 300,
            resizable: false,
        });
    }

    link_actor = undefined;

    static show({inFocus = true, act=undefined}={}) {
        let activeApp;
        for (let app of Object.values(ui.windows)) {
            if (app instanceof this) {
                activeApp = app;
                break;
            }
        }
        if (activeApp) {
            activeApp.link_actor = act;
            activeApp.render(true, {focus: inFocus});
        } else {
            activeApp = new this();
            activeApp.link_actor = act;
            activeApp.render(true, {focus: inFocus});
        }
    }

    getData() {
        let sheetData;
        console.log(this.link_actor);
        sheetData = {
            actor: this.link_actor
        };
        return sheetData;
    }

    activateListeners(html) {
        super.activateListeners(html);
    }
}