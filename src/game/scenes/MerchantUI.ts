import {Scene} from "phaser";
import {CFG} from "../config.ts";
import {type Game} from "./Game.ts";
import {T} from "../i18n.ts";

export class MerchantUI extends Scene {

	panelBg: Phaser.GameObjects.Rectangle;
	btnClose: Phaser.GameObjects.Sprite;
	btnBuySpeed: Phaser.GameObjects.Sprite;
	tSpeedUpgrade: Phaser.GameObjects.Text;
	btnBuyRepair: Phaser.GameObjects.Sprite;
	tRepair: Phaser.GameObjects.Text;
	btnBuyHP: Phaser.GameObjects.Sprite;
	tHPUpgrade: Phaser.GameObjects.Text;
	btnBuyDmg: Phaser.GameObjects.Sprite;
	tDmgUpgrade: Phaser.GameObjects.Text;
	btnBuyView: Phaser.GameObjects.Sprite;
	tBuyView: Phaser.GameObjects.Text;

	constructor() {
		super('MerchantUI');
	}

	create(): void {
		const w = 512;
		const h = 512;
		const x = CFG.width/2-w/2;
		const y = CFG.height/2-h/2;

		const textStyle: Partial<Phaser.GameObjects.TextStyle> = {
			fontFamily: 'Terminal, Courier, Noto Sans Mono, monospace',
			fontSize: 20,
			color: '#ffff80',
			stroke: '#000000',
			strokeThickness: 2,
			align: 'center',
		};

		this.panelBg = this.add.rectangle(x, y, w, h, 0x888888);
		this.panelBg.setOrigin(0,0);

		this.btnClose = this.add.sprite(x+w,y, 'btnclose');

		this.btnClose.setOrigin(1,0);
		this.btnClose.setInteractive();
		this.btnClose.setScale(4);
		this.btnClose.on('pointerdown',()=>{
			console.log('exiting merchant ui');
			this.scene.get<Game>('Game').paused = false;
			this.scene.stop();
		});

		const makeButtonAndText = (row:number, callback:()=>void):[Phaser.GameObjects.Sprite,Phaser.GameObjects.Text] => {
			let btn = this.add.sprite(x+32, y+32+36*row, 'btnplus');
			btn.setOrigin(0,0);
			btn.setInteractive();
			btn.setScale(2);
			btn.on('pointerdown',callback);

			let text = this.add.text(x+w-64,y+32+36*row, '', textStyle);
			text.setOrigin(1,0);
			return [btn,text];
		}

		[this.btnBuyRepair, this.tRepair] = makeButtonAndText(0, ()=>this.tryBuy('repair'));
		[this.btnBuyHP, this.tHPUpgrade] = makeButtonAndText(1, ()=>this.tryBuy('hp'));
		[this.btnBuySpeed, this.tSpeedUpgrade] = makeButtonAndText(2, ()=>this.tryBuy('speed'));
		[this.btnBuyDmg, this.tDmgUpgrade] = makeButtonAndText(3, ()=>this.tryBuy('dmg'));
		[this.btnBuyView, this.tBuyView] = makeButtonAndText(4, ()=>this.tryBuy('view'));
		/*
		this.btnBuySpeed = this.add.sprite(x+32, y+32, 'btnplus');
		this.btnBuySpeed.setOrigin(0, 0);
		this.btnBuySpeed.setInteractive();
		this.btnBuySpeed.setScale(4);
		this.btnBuySpeed.on('pointerdown', ()=>{
			this.tryBuySpeed();
		});

		this.tSpeedUpgrade = this.add.text(x+w-64, y+32, 'tSpeedUpgrade', textStyle);
		this.tSpeedUpgrade.setOrigin(1, 0);
		*/

		// todo не работает почему-то
		this.input.keyboard!.addKey('E').on('keydown', () => {
			console.log('exiting merchant ui');
			this.scene.get<Game>('Game').paused = false;
			this.scene.stop();
		});
	}

	update(time:number,delta:number ): void {
		super.update(time,delta);

		let game = this.scene.get<Game>('Game');
		if (game) {
			let player = game.player;
			if (player.hp < player.hpmax) {
				this.btnBuyRepair.visible = true;
				this.btnBuyRepair.alpha = player.score >= CFG.playerPresets.pirate.repairCost ? 1 : 0.4;
				this.tRepair.visible = true;
				this.tRepair.text = `${T.shopRepair} (\$${CFG.playerPresets.pirate.repairCost})`
			} else {
				this.tRepair.visible = false;
				this.btnBuyRepair.visible = false;
			}
			let hpUpgrade = player.nextHpUpgrade();
			if (hpUpgrade) {
				this.btnBuyHP.visible = true;
				this.btnBuyHP.alpha = player.score >= hpUpgrade.cost ? 1 : 0.4;
				this.tHPUpgrade.visible = true;
				this.tHPUpgrade.text = `${T.shopUpgradeHP} (\$${hpUpgrade.cost})`;
			} else {
				this.btnBuyHP.visible = false;
				this.tHPUpgrade.visible = false;
			}
			let speedUpgrade = player.nextSpeedUpgrade();
			if (speedUpgrade) {
				this.btnBuySpeed.visible = true;
				this.btnBuySpeed.alpha = player.score >= speedUpgrade.cost ? 1 : 0.4;
				this.tSpeedUpgrade.visible = true;
				this.tSpeedUpgrade.text = `${T.shopUpgradeSpeed} (\$${speedUpgrade.cost})`
			} else {
				this.btnBuySpeed.visible = false;
				this.tSpeedUpgrade.visible = false;
			}
			let dmgUpgrade = player.nextDmgUpgrade();
			if (dmgUpgrade) {
				this.btnBuyDmg.visible = true;
				this.btnBuyDmg.alpha = player.score >= dmgUpgrade.cost ? 1 : 0.4;
				this.tDmgUpgrade.visible = true;
				this.tDmgUpgrade.text = `${T.shopUpgradeDmg} (\$${dmgUpgrade.cost})`;
			} else {
				this.btnBuyDmg.visible = false;
				this.tDmgUpgrade.visible = false;
			}
			let viewUpgrade = player.nextViewUpgrade();
			if (viewUpgrade) {
				this.btnBuyView.visible = true;
				this.btnBuyView.alpha = player.score >= viewUpgrade.cost ? 1 : 0.4;
				this.tBuyView.visible = true;
				this.tBuyView.text = `${T.shopUpgradeView} (\$${viewUpgrade.cost})`;
			} else {
				this.btnBuyView.visible = false;
				this.tBuyView.visible = false;
			}
		}
	}

	tryBuy(upgrade:'repair'|'hp'|'speed'|'dmg'|'view'){

		let game = this.scene.get<Game>('Game');
		if (!game) return;
		switch (upgrade) {
			case "view":{
				let upgrade = game.player.nextViewUpgrade();
				if (upgrade && game.player.score >= upgrade.cost) {
					game.player.score -= upgrade.cost;
					game.player.viewDistance = upgrade.distance;
				}
				break;
			}
			case "dmg":{
				let upgrade = game.player.nextDmgUpgrade();
				if (upgrade && game.player.score >= upgrade.cost) {
					game.player.score -= upgrade.cost;
					game.player.dmg = upgrade.dmg;
				}
				break;
			}
			case 'repair': {
				if (game.player.score >= CFG.playerPresets.pirate.repairCost) {
					game.player.score -= CFG.playerPresets.pirate.repairCost;
					game.player.hp = game.player.hpmax;
				}
				break;
			}
			case 'hp': {
				let hpUpgrade = game.player.nextHpUpgrade();
				if (hpUpgrade && game.player.score >= hpUpgrade.cost) {
					game.player.score -= hpUpgrade.cost;
					game.player.hp += hpUpgrade.hp - game.player.hpmax;
					game.player.hpmax = hpUpgrade.hp;
				}
				break;
			}
			case 'speed': {
				let speedUpgrade = game?.player?.nextSpeedUpgrade();
				if (speedUpgrade && game.player.score >= speedUpgrade.cost) {
					game.player.score -= speedUpgrade.cost;
					game.player.max_speed = speedUpgrade.speed;
				}
				break;
			}
		}
	}
}
