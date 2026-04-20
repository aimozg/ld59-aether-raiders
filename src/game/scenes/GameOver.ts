import { Scene } from 'phaser';
import {CFG} from "../config.ts";

export class GameOver extends Scene
{
    camera: Phaser.Cameras.Scene2D.Camera;
    background: Phaser.GameObjects.Image;
    tGameOver : Phaser.GameObjects.Text;

    gameover_text = 'Game Over';

    constructor ()
    {
        super('GameOver');
    }

    create ()
    {
        this.camera = this.cameras.main
        this.camera.setBackgroundColor(0xff0000);

        this.background = this.add.image(CFG.width/2, CFG.height/2, 'background');
        this.background.setAlpha(0.5);

        this.tGameOver = this.add.text(CFG.width/2, CFG.height/2, 'Game Over', {
            fontFamily: 'Arial Black', fontSize: 42, color: '#ffffff',
            stroke: '#000000', strokeThickness: 8,
            align: 'center'
        });
        this.tGameOver.setOrigin(0.5);

        this.input.once('pointerdown', () => {

            this.scene.start('MainMenu');

        });
    }

    update(time: number, delta: number) {
        super.update(time, delta);
        this.tGameOver.setText(this.gameover_text);
    }
}
