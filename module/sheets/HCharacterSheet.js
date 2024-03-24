import Meta_HUD from "../Meta.js";
import TabsJustice from "../TabsJustice.js";

export default class HCharacterSheet extends ActorSheet {
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            width: 850, //700,
            height: 950, //750,
            scrollY: [".scroll-container", ".tab-body"],
            resizable: false,
            classes: ["hibern", "sheet", "personnage2"],
            tabs: [{navSelector: ".tabs", contentSelector: ".tab-body", initial: "SnA"}],
            dragDrop: [
                {dragSelector: ".item-list .item", dropSelector: null},
                {dragSelector: ".invocation-list .invocation", dropSelector: null}
            ]
        });
    }
    
    get template() {
        const char = (this.actor.isOwner) ? "character" : "Ncharacter";
        return `systems/hibern/templates/sheets/${char}-sheet.hbs`;
    }

    //#region Context Menus

    itemContextMenu = [
        {
            name: game.i18n.localize("hibern.ContextMenu.Editer"),
            icon: '<i class="fas fa-edit"></i>',
            callback: element => {
                const item = this.actor.items.get(element.data("item-id"));
                item.sheet.render(true);
            }
        },
        {
            name:game.i18n.localize("hibern.ContextMenu.Supprimer"),
            icon: '<i class="fas fa-trash"></i>',
            callback: element => {
                this.actor.deleteEmbeddedDocuments("Item", [element.data("item-id")]);
            }
        }
    ];

    //#endregion

    static TABS = [
        { tab: "SnA", label: "hibern.Tabs.SnA", icon: "fas fa-rug" },
        { tab: "Summons", label: "hibern.Tabs.Summons", icon: "fas fa-address-book" },
        { tab: "Inventory", label: "hibern.Tabs.Inventaire", icon: "fas fa-list" },
        { tab: "Details", label: "hibern.Tabs.Details", icon: "fas fa-feather-pointed"}
    ];
    
    getData() {
        const data = super.getData();

        const baseData = super.getData();

        let invocationList = [];
        try {
            baseData.actor.system.invocationList.forEach(actorId => {
                invocationList.push(game.actors.get(actorId));
            });
        } catch (err) {}

        let sheetData = {
            owner: this.actor.isOwner,
            editable: this.isEditable,
            actor: baseData.actor,
            system: baseData.actor.system,
            config: CONFIG.hibern,
            armes: data.items.filter(function (item) {return item.type == "Arme"}),
            armures: data.items.filter(function (item) {return item.type == "Armure"}),
            accessoires: data.items.filter(function (item) {return item.type == "Accessoire"}),
            spellcards: data.items.filter(function (item) {return item.type == "Spell Card"}),
            abilities: data.items.filter(function (item) {return item.type == "Capacité"}),
            objets: data.items.filter(function (item) {return item.type == "Objet"}),
            custom_gauges: data.items.filter(function (item) {return item.type == "Jauge"}),
            invocations: invocationList
        };

        const sidebarCollapsed = game.user.getFlag("hibern", `sheetPrefs.character.collapseSidebar`);
        sheetData.sidebarCollapsed = sidebarCollapsed;

        sheetData.PVpercentage = (baseData.actor.system.PV.value / baseData.actor.system.PV.max) * 100;
        sheetData.Willpercentage = (baseData.actor.system.WillPoints.value / baseData.actor.system.WillPoints.max) * 100;

        return sheetData;
    }

    async _renderOuter() {
        const html = await super._renderOuter();
        
        const nav = document.createElement("nav");
        nav.classList.add("tabs");
        nav.dataset.group = "primary-tabs";
        nav.append(...this.constructor.TABS.map(({ tab, label, icon, svg }) => {
            const item = document.createElement("a");
            item.classList.add("item", "control");
            item.dataset.group = "primary-tabs";
            item.dataset.tab = tab;
            item.dataset.tooltip = label;
            item.setAttribute("aria-label", label);
            if (icon) item.innerHTML = `<i class="${icon}"></i>`;
            else if (svg) item.innerHTML = `<b>a</b>`;
            return item;
        }));
        html[0].insertAdjacentElement("afterbegin", nav);
        this._tabs = this.options.tabs.map(t => {
            t.callback = this._onChangeTab.bind(this);
            if (this._tabs?.[0]?.active !== t.initial) t.initial = this._tabs?.[0]?.active ?? t.initial;
            return new TabsJustice(t);
        })

        return html;
    }

    activateListeners(html) {
        if (this.actor.isOwner) {
            html.find(".item-create").click(this._onItemCreate.bind(this));
            html.find(".item-delete").click(this._onItemDelete.bind(this));
            html.find(".inline-edit").change(this._onInlineEdit.bind(this));
            html.find(".item-edit").click(this._onItemEdit.bind(this));
            html.find(".stats-test").click(this._onStatTest.bind(this));
            html.find(".use-spellcard").click(this._useSpellCard.bind(this));
            html.find(".use-ability").click(this._useAbility.bind(this));
            html.find(".roll-weapon").click(this._useWeapon.bind(this));
            html.find(".roll-baseatk").click(this._rollBasicAtk.bind(this));
            html.find(".delete-summon-reference").click(this._onDeleteSummonReference.bind(this));
            html.find(".open-invocation-sheet").click(this._onOpenInvocationSheet.bind(this));
            html.find(".reset-all-fatigue").click(this._onResetAllFatigue.bind(this));
            html.find(".roll_esq").click(this._onRollEsqFromSheet.bind(this));
            html.find(".sidebar .collapser").on("click", this._onToggleSidebar.bind(this));

            html.find("input[data-update-item]").change(this.onUpdateJauge.bind(this));

            html.find(".life").on("click", event => this._toggleEditValue(event, ".life", true));
            html.find(".life > input").on("blur", event => this._toggleEditValue(event, ".life", false));
            html.find(".will").on("click", event => this._toggleEditValue(event, ".will", true));
            html.find(".will > input").on("blur", event => this._toggleEditValue(event, ".will", false));

            new ContextMenu(html, ".InventoryItem", this.itemContextMenu);
            //new ContextMene(html, ".item-context", this.itemContextMenu);
        }

        if (this.actor.type == "personnage") {
            Hooks.on("updateSummon", (actorId) => {
                if (this.actor.system.invocationList.includes(actorId) && this.actor.sheet.rendered) {
                    this.actor.sheet.render(true);
                }
            });
        }

        // Permettre aux capacités d'être des Postures custom et d'être lues dans le combat tracker

        super.activateListeners(html);
    }

    //#region Tabs

    _onChangeTab(event, tabs, active) {
        super._onChangeTab(event, tabs, active);
        this.form.className = this.form.className.replace(/tab-\w+/g, "");
        this.form.classList.add(`tab-${active}`);
    }

    //#endregion

    //#region Sidebar

    _onToggleSidebar() {
        console.log("toggle");
        const collapsed = this._toggleSidebar();
        game.user.setFlag("hibern", "sheetPrefs.character.collapseSidebar", collapsed);
    }

    _toggleSidebar(collapsed) {
        console.log("toggle");
        this.form.classList.toggle("collapsed", collapsed);
        collapsed = this.form.classList.contains("collapsed");
        const collapser = this.form.querySelector(".sidebar .collapser");
        const icon = collapser.querySelector("i");
        collapser.dataset.tooltip = "Placeholder";
        collapser.setAttribute("aria-label", game.i18n.localize(collapser.dataset.tooltip));
        icon.classList.remove("fa-caret-left", "fa-caret-right");
        icon.classList.add(`fa-caret-${collapsed ? "right" : "left"}`);
        return collapsed;
    }

    //#endregion

    //#region Dialogs

    async GetDiffRollOptions(needFatigue) {
        const template = "systems/hibern/templates/partials/diff-dialog.hbs";
        const htmlParams = {
            difficulties: CONFIG.hibern.rolldiff,
            NeedFatigue: needFatigue
        };
        const html = await renderTemplate(template, htmlParams);

        return new Promise(resolve => {
            const data = {
                title: game.i18n.localize(`hibern.rolls.Difficulty`),
                content: html,
                buttons: {
                    normal: {
                        label: game.i18n.localize(`hibern.Divers.Accepter`),
                        callback: html => resolve(_processDiffOptions(html[0].querySelector("form")))
                    },
                    cancel: {
                        label: game.i18n.localize(`hibern.Divers.Annuler`),
                        callback: html => resolve({cancelled: true})
                    }
                },
                default: "normal",
                close: () => resolve({cancelled: true})
            }
            new Dialog(data, null).render(true);
        });
    }

    async GetDeletionConfirmation(ObjectName) {
        const template = "systems/hibern/templates/partials/deletion-confirm.hbs";
        const htmlParams = {
            objName: ObjectName
        };
        const html = await renderTemplate(template, htmlParams);

        return new Promise(resolve => {
            const data = {
                title: game.i18n.localize(`hibern.Divers.Deletion`),
                content: html,
                buttons: {
                    normal: {
                        label: game.i18n.localize(`hibern.Divers.Accepter`),
                        callback: html => resolve({cancelled: false})
                    },
                    cancel: {
                        label: game.i18n.localize(`hibern.Divers.Annuler`),
                        callback: html => resolve({cancelled: true})
                    }
                },
                default: "cancel",
                close: () => resolve({cancelled: true})
            }
            new Dialog(data, null).render(true);
        });
    }

    async GetResetConfirmation() {
        const template = "systems/hibern/templates/partials/reset-fatigue-confirm.hbs";
        const html = await renderTemplate(template, {});

        return new Promise(resolve => {
            const data = {
                title: "Fatigue Reset",
                content: html,
                buttons: {
                    normal: {
                        label: game.i18n.localize(`hibern.Divers.Accepter`),
                        callback: html => resolve({cancelled: false})
                    },
                    cancel: {
                        label: game.i18n.localize(`hibern.Divers.Annuler`),
                        callback: html => resolve({cancelled: true})
                    }
                },
                default: "cancel",
                close: () => resolve({cancelled: true})
            }
            new Dialog(data, null).render(true);
        });
    }

    async GetWeaponRollOptions() {
        const template = "systems/hibern/templates/partials/weapon-dialog.hbs";
        const htmlParams = {
            difficulties: CONFIG.hibern.rolldiff,
            actor: this.actor
        };
        const html = await renderTemplate(template, htmlParams);

        return new Promise(resolve => {
            const data = {
                title: game.i18n.localize(`hibern.rolls.Difficulty`),
                content: html,
                buttons: {
                    normal: {
                        label: game.i18n.localize(`hibern.Divers.Accepter`),
                        callback: html => resolve(_processWeaponOptions(html[0].querySelector("form")))
                    },
                    cancel: {
                        label: game.i18n.localize(`hibern.Divers.Annuler`),
                        callback: html => resolve({cancelled: true})
                    }
                },
                default: "normal",
                close: () => resolve({cancelled: true})
            }
            new Dialog(data, null).render(true);
        });
    }

    //#endregion

    //#region Item related

    _onItemCreate(event) {
        event.preventDefault();
        let element = event.currentTarget;

        let itemData = {
            name: element.dataset.itemname,
            type: element.dataset.type
        }

        return this.actor.createEmbeddedDocuments("Item", [itemData]);
    }

    async _onItemDelete(event) {
        event.preventDefault();
        let element = event.currentTarget;
        let itemid = element.closest(".item-delete").dataset.itemid;

        let checkOptions = await this.GetDeletionConfirmation(this.actor.items.get(itemid).name);
        if (checkOptions.cancelled) {
            return;
        }

        return this.actor.deleteEmbeddedDocuments("Item", [itemid]);
    }

    _onInlineEdit(event) {
        event.preventDefault();
        let element = event.currentTarget;
        let itemid = element.closest(".item").dataset.itemid;
        let item = this.actor.items.get(itemid);
        let field = element.dataset.field;

        return item.update({[field]: element.value});
    }

    async _onItemEdit(event) {
        const itemId = event.currentTarget.closest(".item-edit").dataset.itemid;
        let item = this.actor.items.get(itemId);
        item.sheet.render(true);
    }

    checkIfHasItemType(type) {
        let items = this.actor.items.filter(function (item) {return item.type == type});
        return (items.length == 0) ? false : true;
    }

    async _onResetAllFatigue(event) {
        let checkOptions = await this.GetResetConfirmation();
        if (checkOptions.cancelled) {
            return;
        }

        lowerAllOtherFatigue("Spell Card", this.actor, null, 100);
        lowerAllOtherFatigue("Capacité", this.actor, null, 100);
        this.actor.sheet.render();
        ui.notifications.info("Les valeurs de Fatigue ont été remises à 0.");
    }

    //#endregion

    //#region Stat related

    _toggleEditValue(event, selector, edit) {
        const target = event.currentTarget.closest(selector);
        const label = target.querySelector(":scope > .label");
        const input = target.querySelector(":scope > input");
        label.hidden = edit;
        input.hidden = !edit;
        if (edit)
            input.focus();
    }

    async _onStatTest(event) {
        const statName = event.currentTarget.closest(".stats-test").dataset.statname;
        const testStat = event.currentTarget.closest(".stats-test").dataset.stat;

        let checkOptions = await this.GetDiffRollOptions(false);
        if (checkOptions.cancelled) {
            return;
        }

        let chatData = {
            user: game.user.id,
            speaker: ChatMessage.getSpeaker()
        };

        let rollResult = new Roll(`1d20`);
        rollResult = await rollResult.evaluate({async:true});

        let successtype;
        let localRes;
        if (rollResult._total == 20) {
            successtype = "CritSuccess";
        } else if (rollResult._total+Number(testStat) >= checkOptions.Diff) {
            successtype = "Success";
        } else if (rollResult._total == 1) {
            successtype = "CritFailure";
        } else {
            successtype = "Failure";
        }
        localRes = successtype;

        let rollResult2 = rollResult._total + Number(testStat);
        let cardData = {
            StatName: statName,
            rollResult: rollResult2,
            rollResultFormula: `${rollResult.formula}(${rollResult.terms[0].results[0].result})+${Number(testStat)} = ${rollResult2}/${checkOptions.Diff}`,
            Successtype: successtype,
            localizeResult: game.i18n.localize(`hibern.rolls.${localRes}`),
        };

        chatData.content = await renderTemplate("systems/hibern/templates/partials/test-card.hbs", cardData);
        return rollResult.toMessage(chatData);
    }

    async _onRollEsqFromSheet(event) {
        const type = event.currentTarget.closest(".roll_esq").dataset.rolltype;
        _rollEsq(type, this.actor);
    }

    //#endregion

    //#region Spell related

    async _useSpellCard(event, newThisBase) {
        const newThis = (newThisBase === undefined) ? this : newThisBase;
        const itemId = event.currentTarget.closest(".use-spellcard").dataset.itemid;
        const item = newThis.actor.items.get(itemId);
        const rollStat = newThis.actor.system[item.system.stat].value;
        let RollBonus = 0;
        if (item.system.Composante != "None") {
            const Composante = newThis.actor.items.get(item.system.Composante);
            let RollBonus = Composante.system.Spécialisation;
            const CompoStat = newThis.actor.system[Composante.system.stat].value;
            if (RollBonus >= CompoStat)
                RollBonus = CompoStat;
        }

        let checkOptions = await this.GetDiffRollOptions(true);
        if (checkOptions.cancelled) {
            return;
        }
        const newDiff = getAdjustedDiff(checkOptions.Diff, item.system.Fatigue);

        if (checkOptions.AffectFatigue == true) {
            const ftg = item.system.Fatigue += (IsCharInAS(newThis.actor) && newThis.actor.type == "personnage") ? 2 : 1;
            item.update({
                system: {
                    Fatigue: ftg
                }
            }, {diff: false, render: true});
            lowerAllOtherFatigue(item.type, newThis.actor, item._id);
        }
        
        let chatData = {
            user: game.user.id,
            speaker: ChatMessage.getSpeaker()
        };
            
        let damageRoll = new Roll(item.system.Degats != "" ? item.system.Degats : "0");
        damageRoll = await damageRoll.evaluate({async:true});

        let successtype;
        let rollResult;
        let rollResult2;
        let rollResult2Formula;
        if (item.system.ReussiteAuto == false)
        {
            rollResult = new Roll(`1d20`);
            rollResult = await rollResult.evaluate({async:true});
            if (rollResult._total == 20) {
                successtype = "CritSuccess";
            } else if (rollResult._total + rollStat + RollBonus >= newDiff) {
                successtype = "Success";
            } else if (rollResult._total == 1) {
                successtype = "CritFailure";
            } else {
                successtype = "Failure";
            }
            rollResult2 = rollResult._total + rollStat + RollBonus;
            rollResult2Formula = `${rollResult.formula}(${rollResult.terms[0].results[0].result})+${rollStat}+${RollBonus} = ${rollResult2}/${newDiff}`;
        }
        else {
            successtype = "Success";
            rollResult2 = -1;
            rollResult2Formula = "";
        }
        
        let cardData = {
            isAS: IsSpellAS(newThis.actor, item),
            Degats: damageRoll.total,
            DegatsFormula: damageRoll.formula,
            spell: item,
            rollResult: rollResult2,
            rollResultFormula: rollResult2Formula,
            Successtype: successtype,
            localizeResult: game.i18n.localize(`hibern.rolls.${successtype}`),
            localizeActionType: game.i18n.localize(`hibern.actions.${item.system.ActionType}`),
            Cost: parseInt(item.system.Cout)
        }

        chatData.content = await renderTemplate("systems/hibern/templates/partials/spell-card.hbs", cardData);
        if (item.system.ReussiteAuto == false)
            return rollResult.toMessage(chatData);
        else
            return damageRoll.toMessage(chatData);
    }
    
    //#endregion

    //#region Ability related

    async _useAbility(event, newThisBase) {
        const newThis = (newThisBase === undefined) ? this : newThisBase;
        const capaID = event.currentTarget.closest(".use-ability").dataset.itemid;
        const ability = newThis.actor.items.get(capaID);
        const IsActive = ability.system.Actif;
        const rollStat = newThis.actor.system[ability.system.stat].value;
        let newDiff;
        let rollResult;
        let rollResult2;
        let rollResultFormula2 = "";
        let localRes;
        let successtype;

        let chatData = {
            user: game.user.id,
            speaker: ChatMessage.getSpeaker()
        };

        if ((IsActive || ability.system.ReussiteAuto) && ability.system.PostureCustom == false) {
            let checkOptions = await this.GetDiffRollOptions(true);
            if (checkOptions.cancelled) {
                return;
            }
            newDiff = getAdjustedDiff(checkOptions.Diff, ability.system.Fatigue);

            if (checkOptions.AffectFatigue == true) {
                const ftg = ability.system.Fatigue += (IsCharInAS(newThis.actor) && newThis.actor.type == "personnage") ? 2 : 1;
                ability.update({
                    system: {
                        Fatigue: ftg
                    }
                }, {diff: false, render: true});
                lowerAllOtherFatigue(ability.type, newThis.actor, ability._id);
            }

            if (ability.system.ReussiteAuto == false)
            {
                rollResult = new Roll(`1d20`);
                rollResult = await rollResult.evaluate({async:true});
    
                if (rollResult._total == 20) {
                    successtype = "CritSuccess";
                } else if (rollResult._total + rollStat + ability.system.Spécialisation >= newDiff) {
                    successtype = "Success";
                } else if (rollResult._total == 1) {
                    successtype = "CritFailure";
                } else {
                    successtype = "Failure";
                }
                rollResult2 = rollResult._total + rollStat + ability.system.Spécialisation;
                rollResultFormula2 = `${rollResult.formula}(${rollResult.terms[0].results[0].result})+${rollStat}+${ability.system.Spécialisation} = ${rollResult2}/${newDiff}`;
            }
            else
            {
                successtype = "Success";
                rollResult2 = -1;
                rollResultFormula2 = "";
            }
            
        }

        let cardData = {
            ability: ability,
            isActive: IsActive,
            isPosture: ability.system.PostureCustom,
            rollResult: rollResult2,
            rollResultFormula: rollResultFormula2,
            Successtype: successtype,
            localizeResult: game.i18n.localize(`hibern.rolls.${successtype}`),
        }

        chatData.content = await renderTemplate("systems/hibern/templates/partials/ability-card.hbs", cardData);
        /*if (ChatMessage.getSpeaker().isGM()) {
            chatData.whisper = ChatMessage.getWhisperRecipients("GM")
        }*/

        if (IsActive == true && ability.system.ReussiteAuto == false) {
            return rollResult.toMessage(chatData);
        } else {
            return ChatMessage.create(chatData);
        }
    }

    //#endregion

    //#region Weapon related
    
    async _useWeapon(event) {
        const weaponID = event.currentTarget.closest(".roll-weapon").dataset.itemid;
        const weapon = this.actor.items.get(weaponID);
        let checkOptions = await this.GetWeaponRollOptions();
        if (checkOptions.cancelled) {
            return;
        }
        const Modifier = checkOptions.Stat;

        let rollResult = new Roll(`1d20`);
        rollResult = await rollResult.evaluate({async:true});
        let damageRoll = new Roll(weapon.system.Damage);
        damageRoll = await damageRoll.evaluate({async:true});

        let successtype;
        let localRes;
        if (rollResult._total == 20) {
            successtype = "CritSuccess";
        } else if (rollResult._total+Modifier >= checkOptions.Diff) {
            successtype = "Success";
        } else if (rollResult._total == 1) {
            successtype = "CritFailure";
        } else {
            successtype = "Failure";
        }
        localRes = successtype;
        
        let rollResult2 = rollResult._total + Modifier;
        let chatData = {
            user: game.user.id,
            speaker: ChatMessage.getSpeaker()
        };
        let cardData = {
            Degats: damageRoll._total,
            DegatsFormula: damageRoll.formula,
            Weapon: weapon,
            rollResult: rollResult2,
            rollResultFormula: `${rollResult.formula}(${rollResult.terms[0].results[0].result})+${Modifier} = ${rollResult2}/${checkOptions.Diff}`,
            Successtype: successtype,
            localizeResult: game.i18n.localize(`hibern.rolls.${localRes}`)
        }

        chatData.content = await renderTemplate("systems/hibern/templates/partials/weapon-card.hbs", cardData);
        return rollResult.toMessage(chatData);
    }
    
    //#endregion

    //#region Basic attacks

    async _rollBasicAtk(event) {
        const atkType = event.currentTarget.closest(".roll-baseatk").dataset.type;
        const context = event.currentTarget.closest(".roll-baseatk").dataset.ctx;
        let stat;
        let localAtk;
        let checkOptions;
        if (context == "Atk") {
            localAtk = game.i18n.localize(`hibern.chars.atk${atkType}`);
            checkOptions = await this.GetDiffRollOptions(true);
            if (checkOptions.cancelled) {
                return;
            }
        }
        else {
            localAtk = game.i18n.localize(`hibern.chars.dmg${atkType}`);
        }

        stat = (atkType == "Magic") ? this.actor.system.MAG.value : this.actor.system.FOR.value;

        if (context == "Atk" && checkOptions.AffectFatigue == true) {
            lowerAllOtherFatigue("Spell Card", this.actor, null);
            lowerAllOtherFatigue("Capacité", this.actor, null);
        }

        let rollResult;
        if (context == "Atk") {
            rollResult = new Roll(`1d20`);
            rollResult = await rollResult.evaluate({async:true});
        }
        let damageRoll = new Roll(`1d4+3`);
        damageRoll = await damageRoll.evaluate({async:true});

        let successtype;
        let localRes;
        if (context == "Atk") {
            if (rollResult._total == 20) {
                successtype = "CritSuccess";
            } else if (rollResult._total+stat >= checkOptions.Diff) {
                successtype = "Success";
            } else if (rollResult._total == 1) {
                successtype = "CritFailure";
            } else {
                successtype = "Failure";
            }
            localRes = successtype;
        }
        
        let rollResult2;
        let rollResultFormula2;
        if (context == "Atk")
        {
            rollResult2 = rollResult._total + stat;
            rollResultFormula2 = `${rollResult.formula}(${rollResult.terms[0].results[0].result})+${stat} = ${rollResult2}/${checkOptions.Diff}`;
        }

        let chatData = {
            user: game.user.id,
            speaker: ChatMessage.getSpeaker()
        };
        let cardData = {
            context: context,
            Degats: damageRoll._total,
            DegatsFormula: damageRoll.formula,
            rollResult: rollResult2,
            rollResultFormula: rollResultFormula2,
            Successtype: successtype,
            localizeResult: game.i18n.localize(`hibern.rolls.${localRes}`),
            localizeAtk: localAtk
        }

        chatData.content = await renderTemplate("systems/hibern/templates/partials/basicatk-card.hbs", cardData);
        if (context == "Atk")
            return rollResult.toMessage(chatData);
        else
            return damageRoll.toMessage(chatData);
    }

    //#endregion

    //#region invocations

    async _onDeleteSummonReference(event) {
        const summonIndex = event.currentTarget.closest(".delete-summon-reference").dataset.index;

        let checkOptions = await this.GetDeletionConfirmation(game.actors.get(this.actor.system.invocationList[summonIndex]).name);
        if (checkOptions.cancelled) {
            return;
        }

        let newSummonlist = this.actor.system.invocationList;
        newSummonlist.splice(summonIndex, 1);
        await this.actor.update({
            system: {
                invocationList: newSummonlist
            }
        }, {diff: false, render: true});
    }

    async _onOpenInvocationSheet(event) {
        const summonIndex = event.currentTarget.closest(".open-invocation-sheet").dataset.index;
        const actor = game.actors.get(this.actor.system.invocationList[summonIndex]);
        actor.sheet.render(true);
    }

    //#endregion

    //#region DragDrop

    _onDragStart(event) {
        const li = event.target;
        if (!event.target.classList.contains("invocation")) {
            super._onDragStart(event);
        } else {
            const actor = game.actors.get(event.target.dataset.summonid);

            const dragData = actor.toDragData();
            event.dataTransfer.setData("text/plain", JSON.stringify(dragData));

            if ( actor && canvas.ready ) {
                const img = li.querySelector("img");
                const pt = actor.prototypeToken;
                const w = pt.width * canvas.dimensions.size * Math.abs(pt.texture.scaleX) * canvas.stage.scale.x;
                const h = pt.height * canvas.dimensions.size * Math.abs(pt.texture.scaleY) * canvas.stage.scale.y;
                const preview = DragDrop.createDragImage(img, w, h);
                event.dataTransfer.setDragImage(preview, w / 2, h / 2);
            }
        }
    }

    async _onDrop(event) {
        const data = TextEditor.getDragEventData(event);
        switch (data.type) {
            case "Actor":
                const DraggedActor = await Actor.implementation.fromDropData(data);
                if (this.actor.system.invocationList.includes(DraggedActor._id) == true) { return; }
                let newSummonlist = this.actor.system.invocationList;
                newSummonlist.push(DraggedActor._id);
                await this.actor.update({
                    system: {
                        invocationList: newSummonlist
                    }
                }, {diff: false, render: true});
            break;
            case "Item":
                const item = await Item.implementation.fromDropData(data);

                if (item.parent?._id == this.actor._id || item.parent == undefined) {
                    super._onDrop(event);
                } else {
                    CONFIG.hibern.socket.executeAsGM("CreateGMItem", item.parent._id, this.actor._id, item._id);
                    CONFIG.hibern.socket.executeAsGM("DeleteGMItem", item.parent, item);
                }
            break;
            default:
                super._onDrop(event);
                break;
        }
    }

    //#endregion

    //#region Jauge

    onUpdateJauge(event) {
        console.log(event.target.value);
        const { itemId, updateItem } = event.currentTarget.dataset;
        const item = this.actor.items.get(itemId);
        console.log(item.system);
        const item_result = item.update({
            [updateItem]: event.target.value,
        })
        item_result.then(function(result) {
            item.update({
                system: {
                    percentage: (result.system.value / result.system.max) * 100
                }
            });
        });
        
        console.log(item.system);
    }

    //#endregion
}

//#region Hooks

Hooks.on("renderActorSheet", (app, html, data) => {
    let actor = game.actors.get(data.actor._id);
    if (actor.isOwner) {
        let title = html.find(".window-title");

        /*let ResetFatigueButton = $(`<a id="reset-fatigue"><i class="fas fa-cog"></i>${game.i18n.localize("hibern.chars.ResetFatigue")}</a>`);
        ResetFatigueButton.click(function() {
            lowerAllOtherFatigue("Spell Card", this.actor, null, 100);
            lowerAllOtherFatigue("Capacité", this.actor, null, 100);
            app.render();
        })
        title.after(ResetFatigueButton);*/

        /*let MetaButton = $(`<a id="meta-attr"><i class="fas fa-cog"></i>${game.i18n.localize("hibern.chars.Meta")}</a>`);
        MetaButton.click(function() {
            // Faire apparaitre une autre fenêtre avec les attributs meta du perso (une augmentation flat de vie, de volonté, de stat ou autre, même des effets de statut et leur description (brûlé, glacé, etc))
            Meta_HUD.show({inFocus: true, act: actor});
        });
        title.after(MetaButton);*/

        let EditModeButton = $(`<a id="edit-mode"><i class="fas fa-cog"></i>${game.i18n.localize("hibern.chars.EditMode")}</a>`);
        EditModeButton.click(function() {
            actor.update({system: {EditModeOn: !actor.system.EditModeOn}});
            app.render();
        });
        title.after(EditModeButton);
    }
});

// Faire des calculs sur les stats modifiées automatiquement.
Hooks.on("updateActor", (actor, sysdiff, diffrender, id) => {
    if (actor.canUserModify(game.user, "update")) {
        if (diffrender.diff == true) {
            actor.update({
                system: {
                    PV: {
                        //max: Math.floor((actor.system.CON.value+30))
                        max: Math.floor((10+actor.system.CON.value*4))
                    },
                    WillPoints: {
                        max: actor.system.CON.value+2
                    },
                    //lwready: (actor.system.PV.value <= actor.system.PV.max-CONFIG.hibern.ASSeuil)
                    lwready: (actor.system.PV.value <= actor.system.CON.value+4)
                }
            }, {diff: false, render: true});
        }
    }

    if (actor.type == "invocation") {
        Hooks.callAll("updateSummon", actor._id);
    }
});

Hooks.on("renderTokenHUD", (app, html, data) => {
    const token = app?.object?.document;
    if (!token) return; 

    const far_right = $(`<div class="col far-right"></div>`);
    html.append(far_right);

    _addHudButton(html, token, game.i18n.localize("hibern.chars.Esquive"), 'wing', "far-right",
    (event)=>{ _rollEsq("Esquive", token.actor) });

    _addHudButton(html, token, game.i18n.localize("hibern.chars.Parade"), 'sword', "far-right",
    (event)=>{ _rollEsq("Parade", token.actor) });

    const statusEffects = html.find(".status-effects");
    statusEffects.css({
        left: "111px"
    });
});

//#endregion

//#region Proccessors

function _processDiffOptions(form) {
    try {
        return {
            Diff: parseInt(form.Diff.value),
            AffectFatigue: form.AffectFatigue.checked
        }
    } catch(err) {
        return {
            Diff: parseInt(form.Diff.value)
        }
    }
}

function _processWeaponOptions(form) {
    return {
        Diff: parseInt(form.Diff.value),
        Stat: parseInt(form.Stat.value)
    }
}

function _processEsquiveOptions(form) {
    return {
        Seuil: parseInt(form.Seuil.value)
    }
}

//#endregion

//#region fonctions pratiques

function _addHudButton(html, selectedToken, title, icon, position, clickEvent) {
    if (!selectedToken) return;
    const button = $(`<div class="control-icon" title="${title}"><img src="icons/svg/${icon}.svg" width="36" height="36"></div>`);
    button.click(clickEvent);
    const column = `.col.${position}`;
    html.find(column).append(button);
}

function IsSpellAS(actor, spell) {
    if (IsCharInAS(actor) && spell.system.AS == true)
        return true;
    return false;
}

function IsCharInAS(actor) {
    return (actor.system.PV.value <= actor.system.CON.value+4);
}

// type, actor, item_id
function lowerAllOtherFatigue(type, actor, item_id, amount=1) {
    let object_array = actor.items.filter(function (item) {return item.type == type});

    object_array.filter(obj => obj._id != item_id).forEach(object => {
        if (object.system.Fatigue <= 0)
            return;
        const ftg = Math.min(Math.max(object.system.Fatigue - amount, 0), Infinity);
        object.update({
            system: {
                Fatigue: ftg
            }
        }, {diff: false, render: true});
    });
}

function getAdjustedDiff(baseDiffNum, ftg) {
    let newDiff = baseDiffNum;
    const diffKey = getKeyByValue(CONFIG.hibern.rolldiff, newDiff);
    if (ftg >= 7) {
        switch (diffKey) {
            case "veryeasy":
                newDiff += CONFIG.hibern.rolldiff.hard - CONFIG.hibern.rolldiff.veryeasy;
                break;
            case "easy":
                newDiff += CONFIG.hibern.rolldiff.veryhard - CONFIG.hibern.rolldiff.easy;
                break;
            default:
                newDiff = CONFIG.hibern.rolldiff.veryhard;
                break;
        }
    } else if (ftg >= 5) {
        switch (diffKey) {
            case "veryeasy":
                newDiff += CONFIG.hibern.rolldiff.normal - CONFIG.hibern.rolldiff.veryeasy;
                break;
            case "hard":
                newDiff = CONFIG.hibern.rolldiff.veryhard;
                break;
            case "veryhard":
                break;
            default:
                newDiff += CONFIG.hibern.rolldiff.hard - CONFIG.hibern.rolldiff.easy;
                break;
        }
    } else if (ftg >= 3) {
        switch (diffKey) {
            case "veryeasy":
                newDiff += CONFIG.hibern.rolldiff.easy - CONFIG.hibern.rolldiff.veryeasy;
                break;
            case "veryhard":
                break;
            default:
                newDiff += CONFIG.hibern.rolldiff.normal - CONFIG.hibern.rolldiff.easy;
                break;
        }
    }
    return newDiff;
}

function getKeyByValue(object, value) {
    return Object.keys(object).find(key => object[key] === value);
}

//#endregion

//#region Esquive et autre

async function GetEsquiveRollOptions(type) {
    const template = "systems/hibern/templates/partials/esquive-dialog.hbs";
    const html = await renderTemplate(template);

    return new Promise(resolve => {
        const data = {
            title: game.i18n.localize(`hibern.chars.${type}`),
            content: html,
            buttons: {
                normal: {
                    label: game.i18n.localize(`hibern.Divers.Accepter`),
                    callback: html => resolve(_processEsquiveOptions(html[0].querySelector("form")))
                },
                cancel: {
                    label: game.i18n.localize(`hibern.Divers.Annuler`),
                    callback: html => resolve({cancelled: true})
                }
            },
            default: "normal",
            close: () => resolve({cancelled: true})
        }
        new Dialog(data, null).render(true);
    });
}

async function _rollEsq(type, actor) {
    const checkOptions = await GetEsquiveRollOptions(type);
    if (checkOptions.cancelled)
        return;
    const stat = (type == "Esquive") ? actor.system.DEX.value : actor.system.CON.value;

    let rollResult = new Roll(`1d20`);
    rollResult = await rollResult.evaluate({async:true});

    let successtype;
    let localRes;
    if (rollResult._total == 20) {
        successtype = "CritSuccess";
    } else if (rollResult._total+stat >= checkOptions.Seuil-stat) {
        successtype = "Success";
    } else if (rollResult._total == 1) {
        successtype = "CritFailure";
    } else {
        successtype = "Failure";
    }
    localRes = successtype;
    
    let rollResult2 = rollResult._total+stat;

    let chatData = {
        user: game.user.id,
        speaker: ChatMessage.getSpeaker()
    };
    let cardData = {
        rollResult: rollResult2,
        rollResultFormula: `${rollResult.formula}(${rollResult.terms[0].results[0].result})+${stat} = ${rollResult2}/${checkOptions.Seuil}-${stat}(${checkOptions.Seuil-stat})`,
        Successtype: successtype,
        localizeResult: game.i18n.localize(`hibern.rolls.${localRes}`),
        type: game.i18n.localize(`hibern.chars.${type}`)
    }

    chatData.content = await renderTemplate("systems/hibern/templates/partials/esquive-card.hbs", cardData);
    return rollResult.toMessage(chatData);
}

//#endregion
