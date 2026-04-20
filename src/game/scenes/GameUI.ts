import {Scene} from "phaser";
import * as Phaser from 'phaser';
import {CFG} from "../config.ts";
import {T} from "../i18n.ts";
import {Game} from "./Game.ts";
import DEG_TO_RAD = Phaser.Math.DEG_TO_RAD;

export class GameUI extends Scene {

	tScore: Phaser.GameObjects.Text;
	tDebug: Phaser.GameObjects.Text;
	tLog: Phaser.GameObjects.Text;
	scoreText = '';
	debugText = '';
	logText = [] as string[];
	tTutorial: Phaser.GameObjects.Text;
	minimapPoint: Phaser.GameObjects.Rectangle;
	tHint: Phaser.GameObjects.Text;
	hintText = '';

	constructor() {
		super('GameUI');
	}

	create() {
		this.scoreText = '';
		this.debugText = '';
		this.logText = [];

		this.tScore = this.add.text(0, 0, `0`, {
			fontFamily: 'Arial Black, sans-serif', fontSize: 20, color: '#ffffa0',
			stroke: '#000000', strokeThickness: 8,
			align: 'left'
		});
		this.tScore.setOrigin(0);
		this.tDebug = this.add.text(CFG.width, 0, `DEBUG`, {
			fontFamily: 'Courier, Noto Sans Mono, monospace', fontSize: 14, color: '#ffffff',
			stroke: '#000000', strokeThickness: 2,
			align: 'right'
		})
		this.tDebug.setOrigin(1, 0);

		this.tLog = this.add.text(CFG.width, CFG.height, `DEBUG`, {
			fontFamily: 'Courier, Noto Sans Mono, monospace', fontSize: 32, color: '#ffffff',
			stroke: '#000000', strokeThickness: 2,
			align: 'right'
		})
		this.tLog.setOrigin(1, 1);

		this.tTutorial = this.add.text(CFG.width/2,CFG.height/2,T.tutorialText,{
			fontFamily: 'Arial Black, Arial, sans-serif',
			fontSize: 32,
			color: '#ffffff',
			stroke: '#000000', strokeThickness: 8,
			align: 'center'
		}).setOrigin(0.5,0.5).setAlpha(0.75);

		this.tHint = this.add.text(CFG.width/2,CFG.height/2+100,'',{
			fontFamily: 'Arial Black, Arial, sans-serif',
			fontSize: 32,
			color: '#ffffff',
			stroke: '#000000', strokeThickness: 8,
			align: 'center'
		}).setOrigin(0.5,0.5).setAlpha(0.75);

		this.add.rectangle(0, CFG.height, 128, 128, 0).setOrigin(0, 1);
		this.add.circle(0, CFG.height, 64, 0x008000).setOrigin(0, 1);
		let cx = 64;
		let cy = CFG.height-64;
		for (let i = 0; i < 360; i+=60) {
			let x2 = 64*Math.cos(DEG_TO_RAD*i);
			let y2 = 64*Math.sin(DEG_TO_RAD*i);
			// console.log(x2,y2);
			this.add.line(cx,cy,
				0,0,
				x2,
				y2,
				0x00ff00).setOrigin(0,0);
		}
		this.minimapPoint = this.add.rectangle(0, CFG.height, 8, 8, 0xffffa0).setOrigin(0.5, 0.5);
	}

	update(_time:number, _delta:number) {
		this.tScore.setText(this.scoreText);
		this.tDebug.setText(this.debugText);
		this.tLog.setText(this.logText.join('\n'));
		this.tHint.setText(this.hintText);

		if (_time > 15000) {
			this.tTutorial.visible = false;
		}

		let game = this.scene.get<Game>("Game");
		if (game) {
			this.minimapPoint.x = 64+64*game.player.x/CFG.worldRadius;
			this.minimapPoint.y = CFG.height-64+64*game.player.y/CFG.worldRadius;
		}
	}
}