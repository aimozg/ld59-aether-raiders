import {CFG} from "./config.ts";

export type GameLocale = 'ru'|'en';

let translations = {
	uiMainMenuTitle:{ru:'Эфирные Рейдеры',en:`Aether Raiders`},
	uiMainMenuStart:{ru:'Начать игру',en:`New Game`},
	uiMainMenuSwitchLocale:{ru:'Switch to English',en:`Переключить на русский`},
	uiMainMenuSoundOn:{ru:'Включить звук',en:`Enable sound`},
	uiMainMenuSoundOff:{ru:'Выключить звук',en:`Disable sound`},
	uiRadarOn:{ru:`Радар: ВКЛ (пробел)`,en:`Radar: ON (spacebar)`},
	uiRadarOff:{ru:`Радар: ВЫКЛ (пробел)`,en:`Radar: OFF (spacebar)`},
	uiTeleport:{ru:`Тепепорт (ЛКМ)`,en:`Teleport (LMB)`},
	uiMoney:{ru:`Деньги:`,en:`Money`},
	uiTradeButton:{ru:`ПРОБЕЛ: Торговать`,en:`SPACEBAR: Trade`},
	uiPlunderButton:{ru:`Q: Грабить`,en:`Q: Plunder`},
	uiGameOverLabel:{ru:`кликните чтобы начать новую игру`,en:`click to start new game`},

	tutorialText:{
		ru:`Пробел переключает радар\nВраги реагируют на включенный радар!\n\n\n\nСобирай лилии, лови медуз\nУбегай от кракенов, ищи торговцев\nКолесо мыши - зум, клик - телепорт`,
		en:`Toggle radar with spacebar\nEnemies react to active radar!\n\n\n\nCollect lilies, catch medusas\nAvoid krakens, seek merchants\nMousewheel to zoom, click to teleport`
	},

	shopRepair: {ru:'Ремонт',en:'Repair'},
	shopUpgradeHP: {ru:'Улучшить прочность',en:'Upgrade durability'},
	shopUpgradeSpeed: {ru:'Улучшить скорость',en:'Upgrade speed'},
	shopUpgradeDmg: {ru:'Улучшить урон',en:'Upgrade damage'},
	shopUpgradeView: {ru:'Улучшить обзор',en:'Upgrade view distance'},

	tagMerchant: {ru:'КРВН',en:'CRVN'},
	logMerchantAggroed: {ru:`Караван частично разграблен!`, en:`Caravan robbed!`},
	logMerchantDie: {ru:`Караван разграблен ПОЛНОСТЬЮ!`,en:`Caravan PLUNDERED!`},
	logMerchantWon: {ru:`Караван ограбил вас...`, en:`Plundered by a caravan...`},
	tagPolice: {ru:`ЭЦИЛОПП`,en:`ECILOPP`},
	logPoliceDie: {ru:`Вы отбились от зондер-группы`,en:`Space police defeated`},
	logPoliceWon: {
		ru:`Вас поймали, повесили,\nрасстреляли, и осудили...`,
		en:`Caught by the space police and executed...`,
	},
	tagMedusa: {ru:`МДЗА`,en:`MDSA`},
	logMedusaDie: {ru:`Вы убили медузу!`, en:`Medusa defeated!`},
	logMedusaWon: {ru:`Вас съела медуза!`, en:`Eaten by a medusa!`},
	tagFlower: {ru:`ЛИЛИ`,en:`LILY`},
	tagMoth: {ru:`СВТЛ`,en:`FFLY`},
	tagKraken: {ru:`КРКН`,en:`KRKN`},
	logKrakenDie: {ru: `Вы убили кракена!`, en:`Kraken defeated!`},
	logKrakenWon: {ru: `Вас сожрал кракен!`, en:`Devoured by a kraken!`},
	tagMimic: {ru:`МИМИ`,en:`MIMI`},
	tagMimicStar: {ru:`ЗВЕЗДА`,en:`STAR`},
	logMimicStarAchievement: {
		ru: `Достижение получено:\n* ФАЛЬШИВАЯ ЗВЕЗДА *`,
		en: `Achievement:\n* FAKE STAR *`,
	},
	logMimicDie: {ru:`Вы победили мимика!`, en:`Mimic defeated!`},
	logMimicWon: {ru:`Вас поймал мимик!`, en:`Caught my a mimic`},
} satisfies Record<string,Record<GameLocale,string>>;

export type I18nKeys = keyof typeof translations;

export let I18Cfg = {
	current: CFG.defaultLocale as GameLocale
}
export let T: Record<I18nKeys, string> = Object.fromEntries(
	Object.entries(translations).map(t=>[t[0],t[1][I18Cfg.current]])
) as any;

export function setLocale(locale:GameLocale) {
	I18Cfg.current = locale;
	for (let [k,trs] of Object.entries(translations)) {
		T[k as I18nKeys] = trs[locale];
	}
}


