import { Scene, GameObjects } from 'phaser';
import {CFG} from "../config.ts";
import {I18Cfg, setLocale, T} from "../i18n.ts";

export class MainMenu extends Scene
{
    background: GameObjects.Image;
    logo: GameObjects.Image;
    title: GameObjects.Text;

    constructor ()
    {
        super('MainMenu');
    }

    create ()
    {
        this.background = this.add.image(CFG.width/2, CFG.height/2, 'background');

        let x0 = CFG.width/2;
        let y0 = CFG.height/2-100;

        this.title = this.add.text(x0,y0, T.uiMainMenuTitle, {
            fontFamily: 'Arial Black, Arial, sans-serif',
            fontSize: 38,
            color: '#ffffff',
            stroke: '#000000', strokeThickness: 8,
            align: 'center'
        }).setOrigin(0.5, 1);

        let btnTextStyle = {
            fontFamily: 'Arial Black, Arial, sans-serif',
            fontSize: 20,
            color: '#ffffff',
            stroke: '#000000', strokeThickness: 8,
            align: 'center'
        };

        y0 += 64;
        this.add.nineslice(x0, y0, 'borders1',0, 384,64, 16, 16, 16, 16)
            .setInteractive()
            .once('pointerdown', () => {
            this.scene.start('Game');
        });
        this.add.text(x0,y0, T.uiMainMenuStart, btnTextStyle).setOrigin(0.5, 0.5);

        y0 += 64+8;
        this.add.nineslice(x0, y0, 'borders1',0, 384,64, 16, 16, 16, 16)
            .setInteractive()
            .once('pointerdown', () => {
                setLocale({
                    'ru': 'en',
                    'en': 'ru',
                }[I18Cfg.current] as any);
                this.scene.start('MainMenu');
            });
        this.add.text(x0,y0, T.uiMainMenuSwitchLocale, btnTextStyle).setOrigin(0.5, 0.5);

        y0 += 64+8;
        this.add.nineslice(x0, y0, 'borders1',0, 384,64, 16, 16, 16, 16)
            .setInteractive()
            .once('pointerdown', () => {
                CFG.soundEnabled = !CFG.soundEnabled;
                this.scene.start('MainMenu');
            });
        this.add.text(x0,y0, CFG.soundEnabled ? T.uiMainMenuSoundOff : T.uiMainMenuSoundOn, btnTextStyle).setOrigin(0.5, 0.5);
    }
}
