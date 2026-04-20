import {Boot} from './scenes/Boot';
import {GameOver} from './scenes/GameOver';
import {Game as MainGame} from './scenes/Game';
import {MainMenu} from './scenes/MainMenu';
import {AUTO, Game} from 'phaser';
import {Preloader} from './scenes/Preloader';
import {CFG} from "./config.ts";
import {GameUI} from "./scenes/GameUI.ts";
import {MerchantUI} from "./scenes/MerchantUI.ts";

//  Find out more information about the Game Config at:
//  https://docs.phaser.io/api-documentation/typedef/types-core#gameconfig
const config: Phaser.Types.Core.GameConfig = {
    type: AUTO,
    width: CFG.width,
    height: CFG.height,
    parent: 'game-container',
    backgroundColor: CFG.backgroundColor,
    pixelArt: true,
    physics: {
        default: 'arcade',
    },
    audio: {
        disableWebAudio: true,
        // noAudio: true
    },
    scene: [
        Boot,
        Preloader,
        MainMenu,
        MainGame,
        GameUI,
        MerchantUI,
        GameOver
    ]
};

const StartGame = (parent: string) => {

    return new Game({ ...config, parent });

}

export default StartGame;
