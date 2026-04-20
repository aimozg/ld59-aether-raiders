import { Scene } from 'phaser';
import {CFG} from "../config.ts";

export class Preloader extends Scene
{
    constructor ()
    {
        super('Preloader');
    }

    init ()
    {
        //  We loaded this image in our Boot Scene, so we can display it here
        this.add.image(CFG.width/2, CFG.height/2, 'background');

        //  A simple progress bar. This is the outline of the bar.
        this.add.rectangle(CFG.width/2, CFG.height/2, CFG.width/2-32, 32).setStrokeStyle(1, 0xffffff);

        //  This is the progress bar itself. It will increase in size from the left based on the % of progress.
        const bar = this.add.rectangle(CFG.width/2-230, CFG.height/2, 4, 28, 0xffffff);

        //  Use the 'progress' event emitted by the LoaderPlugin to update the loading bar
        this.load.on('progress', (progress: number) => {

            //  Update the progress bar (our bar is 464px wide, so 100% = 464px)
            bar.width = 4 + (460 * progress);

        });
    }

    preload ()
    {
        //  Load the assets for the game - Replace with your own assets
        this.load.crossOrigin = 'anonymous';
        this.load.setPath('assets');

        for (let img of [
            'btnclose', 'btnplus', 'borders1',

            'bg-clouds-1', 'bg-clouds-2', 'bg-clouds-3',

            'blob','star',

            'flower','medusa','playership','merchant','moth','kraken','mimic','police',
        ]) {
            this.load.image(img, `${img}.png`);
        }
        this.load.audio('playerhurt', [
            'sound/PlayerHurt.wav',
            // 'sound/Select.ogg',
            // 'sound/Select.mp3',
        ]);
        this.load.audio('radarpulse', [
            'sound/RadarScan.wav',
            // 'sound/Select.ogg',
            // 'sound/Select.mp3',
        ]);
        this.load.audio('radarhit', [
            'sound/RadarHit.wav',
            // 'sound/Shoot.ogg',
        ]);
        this.load.audio('pickupcoin', [
            'sound/PickupCoin.wav',
            // 'sound/Shoot.ogg',
        ]);
    }

    create ()
    {
        //  When all the assets have loaded, it's often worth creating global objects here that the rest of the game can use.
        //  For example, you can define global animations here, so we can use them in other scenes.

        //  Move to the MainMenu. You could also swap this for a Scene Transition, such as a camera fade.
        this.scene.start('MainMenu');
    }
}
