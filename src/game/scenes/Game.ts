import * as Phaser from 'phaser';
import {Scene} from 'phaser';
import {clamp, noise2D, rand2Normal, randBool, randFloat, randInt, random, randWeightedFn, shuffle} from "../utils.ts";
import {CFG} from "../config.ts";
import {GameUI} from "./GameUI.ts";
import {GameOver} from "./GameOver.ts";
import DEG_TO_RAD = Phaser.Math.DEG_TO_RAD;
import RAD_TO_DEG = Phaser.Math.RAD_TO_DEG;
import {T} from "../i18n.ts";

let game: Game;

export type MoveBehavior = MBIdle | MBGoTo | MBWaypoints | MBWander | MBFlee | MBChase;

export type MBIdle = {
    kind: 'idle';
}
export type MBGoTo = {
    kind: 'goto';
    x: number;
    y: number;
    speed: number;
}
export type MBWaypoints = {
    kind: 'waypoints';
    pos: number;
    speed: number;
    waypoints: {x:number,y:number}[];
}
export type MBWander = {
    kind: 'wander';
    speed: number;
    angle: number;
    time_left: number;
    period: number;
}
export type MBFlee = {
    kind: 'flee';
    from: Thing;
    speed: number;
}
export type MBChase = {
    kind: 'chase';
    whom: Thing;
    speed: number;
}

export abstract class Thing {
    id: string;
    alive: boolean = true;
    box: Phaser.GameObjects.Container;
    sprite: Phaser.GameObjects.Sprite;
    // body: Phaser.Physics.Arcade.Body;
    speed: number = 0;
    size: number;
    angle: number = 0;
    abstract x: number;
    abstract y: number;
    hp: number;
    hpmax: number;
    hpBar: Phaser.GameObjects.Graphics;

    frequency: number = 0;
    defaultTint = 0xffffff;
    /**
     * цвет сущности (зависит от частоты)
     * @param s насыщенность 0..1
     * @param l яркость 0..1, 0 - чёрный, 0.5 - цветной. 1 - белый.
     */
    frequencyColor(s=0.7, l=0.7) {
        return Phaser.Display.Color.HSLToColor(this.frequency/360, s, l);
    }

    // транспондер/текстовый тег
    textTag: string;
    textTagNode: Phaser.GameObjects.Text;

    distanceTo(other: Thing) {
        return ((this.x-other.x)**2+(this.y-other.y)**2)**0.5;
    }
    distanceToXY(x: number, y: number) {
        return ((this.x-x)**2+(this.y-y)**2)**0.5;
    }
    createHpBar() {
        this.hpBar = game.add.graphics();
        this.box.add(this.hpBar);
    }
    updateHpBar() {
        this.hpBar.x = -this.size/game.camera.zoom;
        this.hpBar.y = -this.size-4;
        this.hpBar.scale = 1/game.camera.zoom;
        this.hpBar.clear();
        this.hpBar.fillStyle(0x888888, 1);
        this.hpBar.fillRect(0, 0, this.size*2, 4);
        this.hpBar.fillStyle(0x880000, 1);
        this.hpBar.fillRect(1, 1, this.size*2-2, 2);
        this.hpBar.fillStyle(0x00aa00, 10);
        this.hpBar.fillRect(1, 1, (this.size*2-2)*clamp(0, this.hp/this.hpmax, 1), 2)
    }
    updateTextTag() {
        this.textTagNode.setText(this.textTag);
        this.textTagNode.x = 0;
        this.textTagNode.y = this.size/2;
        this.textTagNode.scale = 1/game.camera.zoom;
        this.textTagNode.setStyle({
            fontFamily: 'Terminal, Courier, Noto Sans Mono, monospace',
            fontSize: 14,
            fontStyle: 'bold',
            color: this.frequencyColor(1,0.5).rgba,
            align: 'center',
        });
    }

    constructor(id: string) {
        this.id = id;
        this.box = game.add.container(0,0);
        this.textTag = randInt(0,0x10000).toString(16).toUpperCase().padStart(4,'0');
        this.textTagNode = game.add.text(0,0,this.textTag,{
            fontFamily: 'Terminal, Courier, Noto Sans Mono, monospace',
            fontSize: 14,
            color: '#000000',
            align: 'center',
        });
        this.textTagNode.setOrigin(0.5,0);
        this.textTagNode.visible = false;
        this.box.add(this.textTagNode);
    }

    destroy() {
        this.box.destroy();
    }
}

export type PlayerType = 'pirate'; // | 'kraken' | 'mimic';
export class Player extends Thing {
    type: PlayerType;
    sprite: Phaser.GameObjects.Sprite;
    speed = 150;
    max_speed = 150;
    angle = 45;
    viewDistance = 200;
    viewDistanceGeom: Phaser.GameObjects.Graphics;
    score = 0;
    hurtSound: Phaser.Sound.BaseSound;
    dmg = 1;

    radarOn = false;
    radarPulseX = 0;
    radarPulseY = 0;
    radarPulseR = 0;
    radarPulseSpeed = 1000;
    radarPulseMax = 2000;
    radarPulseOn = false;
    radarPulseGeom: Phaser.GameObjects.Graphics;
    radarPulseSound
    radarHitSound

    // Пират: score = деньги, способность телепорт
    cargo = {
        flowers: 0,
        moths: 0,
    };
    teleportDistance = 500;
    teleportCooldown = 6;
    teleportCurrentCooldown = 0;
    nextSpeedUpgrade():{speed:number,cost:number}|undefined {
        return CFG.playerPresets.pirate.speedUpgrades.find(upgrade=>upgrade.speed>this.max_speed);
    }
    nextHpUpgrade():{hp:number,cost:number}|undefined {
        return CFG.playerPresets.pirate.hpUpgrades.find(upgrade=>upgrade.hp>this.hpmax);
    }
    nextDmgUpgrade():{dmg:number,cost:number}|undefined {
        return CFG.playerPresets.pirate.dmgUpgrades.find(upgrade=>upgrade.dmg>this.dmg);
    }
    nextViewUpgrade():{distance:number,cost:number}|undefined {
        return CFG.playerPresets.pirate.viewUpgrades.find(upgrade=>upgrade.distance>this.viewDistance);
    }

    constructor(id:string, type:PlayerType, x:number, y:number) {
        super(id);
        this.type = type;
        console.log(CFG);
        let preset = CFG.playerPresets[type];
        this.hpmax = preset.hp;
        this.hp = preset.hp;
        this.size = preset.size;
        this.max_speed = preset.speed;
        this.radarPulseMax = preset.radarPulseRadius;
        this.radarPulseSpeed = preset.radarPulseSpeed;
        this.viewDistance = preset.viewDistance;
        this.dmg = preset.damage;

        this.sprite = game.add.sprite(0,0, 'playership');
        this.box.add(this.sprite);
        this.box.setPosition(x,y);
        // scene.physics.add.existing(this.sprite, false);
        // this.body = this.sprite.body as Phaser.Physics.Arcade.Body;
        // this.body.onOverlap = true;
        // scene.physics.world.add(this.body);
        this.sprite.scale = 4;
        this.viewDistanceGeom = game.add.graphics({lineStyle:{width:1,color:Phaser.Display.Color.HexStringToColor('#00ff00').color32}});
        this.box.add(this.viewDistanceGeom);
        // this.viewDistanceGeom.strokeCircle(0, 0, this.viewDistance);
        this.radarPulseGeom = game.add.graphics({
            lineStyle: {
                width: 4,
                color: 0xff0000,
            }
        });

        this.hurtSound = game.sound.add('playerhurt');
        this.radarPulseSound = game.sound.add("radarpulse");
        this.radarHitSound = game.sound.add("radarhit");

        this.createHpBar();
    }

    get x() { return this.box.x; }
    get y() { return this.box.y; }
    set x(x) {
        this.box.x = x;
    }
    set y(y) {
        this.box.y = y;
    }


    destroy() {
        super.destroy();
        this.radarPulseGeom.destroy();
    }
}
export abstract class NPC extends Thing {
    // отладочный кружок
    debugG: Phaser.GameObjects.Graphics;

    // "радиоэхо"
    echo: Phaser.GameObjects.Sprite;
    echoLive = 0;
    echoLiveMax = 1;
    echoAlwaysOn = false; // эхо постоянно светит и синхронно с позицией
    echoSeed:number; // случайное зерно для искажения сканирования, -1..+1



    get alwaysOn(): boolean { return false }
    on: boolean = false; // "активный" NPC (рядом с игроком)
    size: number;
    speed: number = 0;
    angle: number = 0;
    moveBehavior: MoveBehavior = {kind:'idle'};

    distanceToPlayer = -1; // cached value


    echoRealScale() {
        return this.size/16;
    }

    constructor(
        id: string,
        frequency: number,
        size: number,
        x: number,
        y: number,
    ) {
        super(id);
        console.log(`created ${id} at ${x} ${y} size ${size}`)
        this.box.x = x;
        this.box.y = y;
        this.echoSeed = (randBool() ? -1 : +1) * random();
        this.frequency = frequency;
        this.size = size;

        // const circle = new Phaser.Geom.Circle(0, 0, 100);
        // const color = Phaser.Display.Color.HSLToColor(frequency/360, 0.7, 0.7);
        this.echo = game.add.sprite(0,0,'blob');
        this.echo.alpha = 0.0;
        let color1 = this.frequencyColor(1,0.5);
        this.debugG = game.add.graphics({fillStyle:{color:color1.color32}});
        this.debugG.fillCircle(0, 0, 5);
        this.debugG.visible = game.debugMode;
        this.box.add(this.debugG);

        // this.body = game.physics.add.body(x,y,size,size);
        // this.body.onOverlap = true;
        // game.physics.world.add(this.body);
    }

    get x() { return this.box.x }
    get y() { return this.box.y }

    set x(value: number) {
        this.box.x = value;
    }

    set y(value: number) {
        this.box.y = value;
    }

    destroy() {
        super.destroy();
        this.echo.destroy();
    }
    updateAI() {}

    abstract collideWithPlayer(player:Player):void;

    // @ts-ignore
    collideWithOther(other:NPC){}

    // @ts-ignore
    onPingByPlayer(player:Player):void{}
}
export class MerchantNpc extends NPC {
    static FREQUENCY = 240;
    aggroed = false;
    constructor(id:string,x:number,y:number) {
        super(id, MerchantNpc.FREQUENCY, randInt(CFG.merchantSize[0], CFG.merchantSize[1]+1), x, y);
        this.textTag = `${CFG.tag()}-${T.tagMerchant}-${this.textTag}`;
        this.hpmax = CFG.merchantHp;
        this.hp = this.hpmax;
        this.sprite = game.add.sprite(0,0,'merchant');
        this.sprite.scale = this.size/8;
        this.box.add(this.sprite);
        this.moveBehavior = {kind:'idle'};
        this.echoSeed = 1;
        this.createHpBar();
    }

    // @ts-ignore
    collideWithPlayer(player: Player): void {
        if (player.type === "pirate" && !this.aggroed) {
            // game.paused = true;
            // game.scene.launch("MerchantUI");
            game.interactingWith = this;
            return;
        }
        this.hp -= player.dmg;
        if (this.hp < 0) {
            game.logMsg(`${T.logMerchantDie} (+${CFG.merchantScore2})`);
            player.score += CFG.merchantScore2;
            game.spawnPolice();
            game.removeFromGame(this);
            return;
        }
        player.hp -= CFG.merchantDmg;
        if (CFG.soundEnabled) player.hurtSound.play();
        if (player.hp < 0) {
            game.handleGameover(T.logMerchantWon);
            return;
        }
    }

    updateAI() {
        if (!this.echoAlwaysOn) {
            game.createEcho(this, -1);
        }
        if (this.aggroed) {
            this.defaultTint = 0xff8080;
        }
    }
}
export class PoliceNpc extends NPC {
    static FREQUENCY1 = 0;
    static FREQUENCY2 = 240;
    phase = 0;
    ttp2 = CFG.policeTicksPerFrequencyChange;
    max_speed;
    constructor(id:string, x:number, y:number) {
        let size = randInt(CFG.policeSize[0], CFG.policeSize[1]+1);
        super(id, PoliceNpc.FREQUENCY1, size, x, y);
        this.max_speed = randInt(CFG.policeSpeed[0], CFG.policeSpeed[1]+1);
        this.textTag = `${CFG.tag()}-${T.tagPolice}-${this.textTag}`;
        this.hpmax = this.hp = Math.ceil(CFG.policeHp);
        this.sprite = game.add.sprite(0, 0, 'police');
        this.sprite.scale = size/8;
        this.box.add(this.sprite);
        this.createHpBar();
        this.moveBehavior = {kind:'chase',whom:game.player,speed:this.max_speed};
        this.echoSeed = 1;
    }

    get alwaysOn(): boolean {
        return true;
    }

    collideWithPlayer(player: Player) {
        this.hp -= player.dmg;
        if (this.hp <= 0) {
            game.logMsg(T.logPoliceDie);
            game.removeFromGame(this);
            return;
        }
        player.hp -= CFG.policeDmg;
        if (CFG.soundEnabled) player.hurtSound.play();
        if (player.hp <= 0) {
            game.handleGameover(T.logPoliceWon)
            return;
        }
    }

    updateAI() {
        if (!this.echoAlwaysOn) {
            game.createEcho(this, -1);
        }
        this.echo.x = this.x;
        this.echo.y = this.y;
        this.ttp2--;
        if (this.ttp2 <= 0) {
            this.ttp2 = CFG.policeTicksPerFrequencyChange;
            this.phase = 1 - this.phase;
            this.frequency = this.phase === 0 ? PoliceNpc.FREQUENCY1 : PoliceNpc.FREQUENCY2;
        }
    }
}
export class MedusaNpc extends NPC {
    static FREQUENCY = 0;
    damagedBy: Thing|null = null;
    max_speed = randInt(CFG.medusaSpeed[0], CFG.medusaSpeed[1]+1);
    constructor(id:string, realX: number, realY: number) {
        let size = randInt(CFG.medusaSize[0], CFG.medusaSize[1]+1);
        super(id, MedusaNpc.FREQUENCY, size, realX, realY);
        this.textTag = `${CFG.tag()}-${T.tagMedusa}-${this.textTag}`;
        this.hpmax = this.hp = Math.ceil(this.size*CFG.medusaHpFactor);
        this.sprite = game.add.sprite(0,0, 'medusa');
        this.sprite.scale = size/8;
        this.box.add(this.sprite);
        /*
        this.moveBehavior = {
            kind: 'waypoints',
            pos: 0,
            speed: this.max_speed/2,
            waypoints: [{x: realX-250, y:realY},{x:realX+250, y:realY}],
        };*/
        this.moveBehavior = {
            kind: 'wander',
            speed: this.max_speed/2,
            angle: randFloat(0, 360),
            time_left: 0,
            period: randFloat(CFG.medusaWanderTime[0], CFG.medusaWanderTime[1]),
        }
        this.createHpBar();
    }

    collideWithPlayer(player: Player) {
        this.hp-=player.dmg;
        this.damagedBy = player;
        if (this.hp <= 0) {
            game.logMsg(`${T.logMedusaDie} (+${CFG.medusaScore})`);
            game.player.score+=CFG.medusaScore;
            game.removeFromGame(this);
        }

        player.hp-=CFG.medusaDmg;
        if (CFG.soundEnabled) player.hurtSound.play();
        if (player.hp <= 0) {
            game.handleGameover(T.logMedusaWon);
            return;
        }
    }

    updateAI() {
        if (this.moveBehavior.kind === 'flee') {
            if (this.moveBehavior.from.distanceTo(this) >= 1000) {
                this.damagedBy = null;
                this.moveBehavior = {
                    kind:'wander',
                    speed:this.max_speed/2,
                    angle: randFloat(0,360),
                    time_left: 3,
                    period: 3,
                }
            }
        }
        if (this.damagedBy != null) {
             this.moveBehavior = {kind: 'flee', from: this.damagedBy, speed: this.max_speed};
        }
    }
    onPingByPlayer(player: Player) {
        // todo if looks peaceful - approach, else flee
        this.moveBehavior = {kind:'flee', from:player, speed: this.max_speed};
    }
}
export class FlowerNpc extends NPC {
    static FREQUENCY = 120;
    static SIZE_MIN = 8;
    static SIZE_MAX = 32;
    constructor(id:string, realX: number, realY: number) {
        let size = randInt(CFG.flowerSize[0],CFG.flowerSize[1]+1);
        super(id, FlowerNpc.FREQUENCY, size, realX, realY);
        this.textTag = `${CFG.tag()}-${T.tagFlower}-${this.textTag}`;
        this.hpmax = this.hp = Math.ceil(this.size*CFG.flowerHpFactor);
        this.sprite = game.add.sprite(0, 0, 'flower');
        this.sprite.scale = size/8;
        this.box.add(this.sprite);
        this.createHpBar();
    }

    collideWithPlayer(player: Player) {
        switch (player.type) {
            case "pirate": {
                // game.logMsg(`Вы подобрали лилию`);
                // player.cargo.flowers++;
                player.score+=this.size*CFG.flowerScoreFactor;
                if (CFG.soundEnabled) game.pickupSound.play();
                game.removeFromGame(this);
                break;
            }/* TODO игрок кракен ест лилию
            case 'kraken':
                this.hp-=player.dmg;
                if (player.hp < player.hpmax) {
                    player.hp++;
                }
                if (this.hp <= 0) {
                    game.handlePcKill(this);
                }
                break;*/
        }
    }

    updateAI() {
        if (this.echoLive <= 0 && randBool(CFG.flowerEchoChance)) {
            game.createEcho(this, randFloat(CFG.flowerEchoTTL[0], CFG.flowerEchoTTL[1]));
        }
    }

}
export class MothNpc extends NPC {
    static FREQUENCY = 180;
    constructor(id:string, realX: number, realY: number) {
        let size = randInt(CFG.mothSize[0], CFG.mothSize[1]+1);
        super(id, MothNpc.FREQUENCY, size, realX, realY);
        this.textTag = `${CFG.tag()}-${T.tagMoth}-${this.textTag}`;
        this.hpmax = this.hp = Math.ceil(CFG.mothHpBase+this.size*CFG.mothHpFactor);
        this.sprite = game.add.sprite(0, 0, 'moth');
        this.sprite.scale = size/8;
        this.box.add(this.sprite);
        this.moveBehavior = {kind:'wander',speed:randInt(CFG.mothSpeed[0], CFG.mothSpeed[1]),period:1,time_left:1,angle:randFloat(0,360)};
        this.createHpBar();
    }

    collideWithPlayer(player: Player) {
        // todo kraken eat moths
        /*
        this.hp-=player.dmg;
        if (player.hp < player.hpmax) {
            player.hp++;
        }
        if (this.hp <= 0) {
            game.removeFromGame(this);
        }
         */
        switch (player.type) {
            case "pirate": {
                // game.player.cargo.moths++;
                game.player.score += this.size*CFG.mothScoreFactor;
                if (CFG.soundEnabled) game.pickupSound.play();
                game.removeFromGame(this);
                break;
            }
        }
    }

    updateAI() {
        /*
        if (this.echoLive <= 0 && randBool(0.01)) {
            game.createEcho(this, randFloat(0, 3));
        }
        */
    }

}

export class KrakenNpc extends NPC {
    static FREQUENCY = 240;
    max_speed = randInt(CFG.krakenSpeed[0], CFG.krakenSpeed[1]+1);
    view_player_at = CFG.krakenViewDistance;
    constructor(id:string, x:number, y:number) {
        let size = randInt(CFG.krakenSize[0], CFG.krakenSize[1]+1);
        super(id, KrakenNpc.FREQUENCY, size, x, y);
        this.textTag = `${CFG.tag()}-${T.tagKraken}-${this.textTag}`;
        this.hpmax = this.hp = Math.ceil(this.size*CFG.krakenHpFactor);
        this.sprite = game.add.sprite(0, 0, 'kraken');
        this.sprite.scale = size/8;
        this.box.add(this.sprite);
        this.createHpBar();
    }

    collideWithPlayer(player: Player) {
        this.hp-=player.dmg;
        if (this.hp <= 0) {
            game.logMsg(`${T.logKrakenDie} (+${CFG.krakenScore})`);
            game.player.score+=CFG.krakenScore;
            game.removeFromGame(this);
            return;
        }
        player.hp -= CFG.krakenDmg;
        if (CFG.soundEnabled) player.hurtSound.play();
        if (player.hp <= 0) {
            game.handleGameover(T.logKrakenWon);
            return;
        }
    }

    // @ts-ignore
    onPingByPlayer(player: Player) {
        /*
        this.moveBehavior = {
            kind: "goto",
            speed: this.max_speed,
            x: player.radarPulseX,
            y: player.radarPulseY,
        }

         */
    }

    updateAI() {
        if (this.distanceToPlayer <= this.view_player_at) {
            // Увидел игрока - следует за ним
            this.moveBehavior = {kind:'chase', speed:this.max_speed, whom:game.player};
        } else if (this.moveBehavior.kind === 'chase') {
            // Потерял игрока - идёт в последнее известное место
            this.moveBehavior = {kind:'goto', speed:this.max_speed, x:game.player.x, y:game.player.y};
        } else if (this.moveBehavior.kind === 'goto') {
            let d = this.distanceToXY(this.moveBehavior.x, this.moveBehavior.y);
            // console.log(`${this.id} goto ${this.moveBehavior.x|0}, ${this.moveBehavior.y|0} d=${d}`)
            if (d < this.moveBehavior.speed/2) {
                // Дошёл до точки назначения - сидим в засаде
                // todo подождать, потом начать слоняться
                // this.moveBehavior = {kind:'idle'};
                this.moveBehavior = {kind:'wander',speed:this.max_speed/2,angle:randFloat(0,360),time_left:5,period:5};
            }
        }
        if (game.player.radarOn && this.distanceToPlayer <= game.player.radarPulseMax) {
            this.moveBehavior = {kind:'goto', speed:this.max_speed, x:game.player.x, y:game.player.y};
        }
    }
}

export class MimicNPC extends NPC {
    max_speed = 0;
    view_player_at = 300; // расстояние на котором мимик бросается на игрока
    fakeas;
    constructor(id:string, x:number, y:number) {
        let size = randInt(CFG.mimicSize[0], CFG.mimicSize[1]+1);
        super(id, randInt(0, 360), size, x, y);
        this.max_speed = randInt(CFG.mimicSpeed[0], CFG.mimicSpeed[1]+1);
        this.fakeas = randWeightedFn(['flower','medusa','kraken','moth','merchant','star'], item=>{
            if (item === 'star') return CFG.mimicStarChance;
            return 1;
        });
        this.moveBehavior = {kind:'idle'};
        if (randBool(CFG.mimicRevealChance)) {
            switch (this.fakeas) {
                case 'flower':
                    this.textTag = `${CFG.tag()}-${T.tagFlower}-${this.textTag}`;
                    break;
                case 'medusa':
                    this.textTag = `${CFG.tag()}-${T.tagMedusa}-${this.textTag}`;
                    break;
                case 'kraken':
                    this.textTag = `${CFG.tag()}-${T.tagKraken}-${this.textTag}`;
                    break;
                case 'moth':
                    this.textTag = `${CFG.tag()}-${T.tagMoth}-${this.textTag}`;
                    break;
                case 'merchant':
                    this.textTag = `${CFG.tag()}-${T.tagMerchant}-${this.textTag}`;
                    break;
                case 'star':
                    if (randBool()) {
                        this.textTag = `${T.tagMimicStar}-${this.textTag}`;
                    } else {
                        this.textTag = ``;
                    }
                    break;
                default:
                    this.textTag = `${CFG.tag()}-${T.tagMimic}-${this.textTag}`;
            }
        } else {
            this.textTag = `${CFG.tag()}-${T.tagMimic}-${this.textTag}`;
        }
        if (this.fakeas === 'medusa' || this.fakeas === 'kraken' || this.fakeas === 'moth') {
            this.moveBehavior = {kind:'wander',speed:this.max_speed/4,angle:randInt(0,360),period:5,time_left:5};
        }
        this.hpmax = this.hp = Math.ceil(this.size*CFG.mimicHpFactor);
        this.sprite = game.add.sprite(0, 0, this.fakeas);
        this.sprite.scale = size/8;
        this.box.add(this.sprite);
        this.createHpBar();
        if (this.fakeas === 'star') {
            this.hpBar.visible = false;
        }
    }

    collideWithPlayer(player: Player) {
        if (this.fakeas !== 'mimic') {
            this.hpBar.visible = true;
            if (this.fakeas === 'star' && !game.achivementMimicStar) {
                game.achivementMimicStar = true;
                game.logMsg(T.logMimicStarAchievement)
            }
            this.fakeas = 'mimic';
            this.sprite.setTexture('mimic');
            this.moveBehavior = {kind:'idle'};
            // this.moveBehavior = {kind:'chase',whom:player,speed:this.max_speed};
        }
        this.hp-=player.dmg;
        if (this.hp <= 0) {
            game.removeFromGame(this);
            game.player.score+=CFG.mimicScore;
            game.logMsg(`${T.logMimicDie} (+${CFG.mimicScore})`);
            return;
        }
        player.hp-=CFG.mimicDmg;
        if (CFG.soundEnabled) player.hurtSound.play();
        if (player.hp <= 0) {
            game.handleGameover(T.logMimicWon);
            return;
        }
    }
}

export class Game extends Scene
{
    camera: Phaser.Cameras.Scene2D.Camera;

    paused = false;
    debugMode = false;
    static updateTime = 100; // 100 ms per logic update (damage etc)
    timeToUpdate = 100;

    backgroundMask: Phaser.GameObjects.Graphics;
    background: Phaser.GameObjects.Container;
    background1: Phaser.GameObjects.TileSprite;
    background2: Phaser.GameObjects.TileSprite;
    background3: Phaser.GameObjects.TileSprite;

    zoomLevel = 0;

    player: Player;
    npcs: NPC[] = [];
    interactingWith: NPC|null;
    achivementMimicStar = false;
    pickupSound: Phaser.Sound.BaseSound;

    constructor ()
    {
        super('Game');
        (window as any).game = game = this;
    }

    create ()
    {
        this.scene.launch('GameUI');
        this.timeToUpdate = 100;
        this.paused = false;
        this.zoomLevel = 0;
        this.npcs = [];
        this.interactingWith = null;
        this.achivementMimicStar = false;
        // Shuffle frequencies
        let frequencies = shuffle([...CFG.frequencies]);
        FlowerNpc.FREQUENCY = frequencies.pop()!;
        MedusaNpc.FREQUENCY = frequencies.pop()!;
        MerchantNpc.FREQUENCY = frequencies.pop()!;
        MothNpc.FREQUENCY = frequencies.pop()!;
        KrakenNpc.FREQUENCY = frequencies.pop()!;

        this.pickupSound = this.sound.add('pickupcoin');

        this.camera = this.cameras.main;
        this.camera.setBackgroundColor(0x000000);

        this.background = this.add.container();

        this.background1 = this.add.tileSprite(CFG.minX, CFG.minY, CFG.worldSize, CFG.worldSize, 'bg-clouds-1');
        this.background1.scale = 4;
        this.background1.setOrigin(0, 0);
        this.background.add(this.background1);
        // this.background1.enableFilters().filters!.external.addBarrel(1);
        // this.background1.enableFilters().filters!.external.addBarrel(1);

        this.background2 = this.add.tileSprite(CFG.minX, CFG.minY, CFG.worldSize, CFG.worldSize, 'bg-clouds-2');
        this.background2.scale = 4;
        this.background2.setOrigin(0, 0);
        this.background2.blendMode = Phaser.BlendModes.ADD;
        this.background.add(this.background2);

        this.background3 = this.add.tileSprite(CFG.minX, CFG.minY, CFG.worldSize, CFG.worldSize, 'bg-clouds-3');
        this.background3.scale = 4;
        this.background3.setOrigin(0, 0);
        this.background.add(this.background3);

        this.backgroundMask = this.make.graphics();
        this.backgroundMask.setBlendMode(Phaser.BlendModes.MULTIPLY);
        this.background.add(this.backgroundMask);

        for (let i = 0; i < CFG.bgStarCount; i++) {
            let starxy = rand2Normal();
            let star = this.add.sprite(
                starxy.x*CFG.sectorSize,
                starxy.y*CFG.sectorSize,
                'star'
            );
            star.setScale(randFloat(CFG.bgStarMinSize, CFG.bgStarMaxSize));
            let color = Phaser.Display.Color.HSLToColor(
                randFloat(0, 1),
                randFloat(0.75, 1.0),
                randFloat(0.5, 1.0),
            );
            let alpha = randFloat(0.10,0.75);
            color.alpha = alpha;
            star.setTint(color.color32);
            star.setAlpha(alpha);
            this.background.add(
                star
            );
        }
        
        // this.background = this.add.image(CFG.width/2, CFG.height/2, 'background');
        // this.background.setAlpha(0.0);
        // this.background.setTint(0.5);
        // this.guiCamera.

        let sectors = shuffle([0,60,120,180,240,300]);
        let sectorOffset = randInt(-30, 30);
        for (let i = 0; i < sectors.length; i++) sectors[i] += sectorOffset;
        // 1. Spawn flowers
        let flowerSector = sectors.pop()!;
        for (let i = 0; i < CFG.flowerInFlowerSector + CFG.flowerInRandomSector; i++) {
            let worldAngle;
            if (i < CFG.flowerInFlowerSector) worldAngle = randFloat(flowerSector, flowerSector+60);
            else worldAngle = randFloat(0, 360);
            worldAngle *= DEG_TO_RAD;
            // stick to middle
            let worldRadius = (random()*0.5+random()*0.5)*CFG.worldRadius;
            this.npcs.push(new FlowerNpc(`flower${i}`, worldRadius*Math.cos(worldAngle), worldRadius*Math.sin(worldAngle)));
        }
        // 2. Spawn medusas
        let medusaSector = sectors.pop()!;
        for (let i = 0; i < CFG.medusaInFlowerSector+CFG.medusaInRandomSector+CFG.medusaInMedusaSector; i++) {
            let worldAngle;
            if (i < CFG.medusaInMedusaSector) worldAngle = randFloat(medusaSector, medusaSector+60);
            else if (i < CFG.medusaInMedusaSector+CFG.medusaInFlowerSector) worldAngle = randFloat(flowerSector, flowerSector+60);
            else worldAngle = randFloat(0, 360);
            worldAngle *= DEG_TO_RAD;
            // stick to middle
            let worldRadius = (random()*0.5+random()*0.5)*CFG.worldRadius;
            this.npcs.push(new MedusaNpc(`medusa${i}`, worldRadius*Math.cos(worldAngle), worldRadius*Math.sin(worldAngle)));
        }
        // 3. Spawn merchants
        for (let i = 0; i < CFG.merchantsTotal; i++) {
            let worldAngle = randFloat(0, 360);
            worldAngle *= DEG_TO_RAD;
            // spread evenly
            let worldRadius = random()*CFG.worldRadius;
            this.npcs.push(new MerchantNpc(`merchant${i}`, worldRadius*Math.cos(worldAngle), worldRadius*Math.sin(worldAngle)));
        }
        // 4. Spawn 400 moths (1/2 in own sector, 1/2 in random)
        let mothSector = sectors.pop()!;
        for (let i = 0; i < CFG.mothsInOwnSector+CFG.mothsInRandomSector; i++) {
            let worldAngle;
            if (i < CFG.mothsInOwnSector) worldAngle = randFloat(mothSector, mothSector+60);
            else worldAngle = randFloat(0, 360);
            worldAngle *= DEG_TO_RAD;
            // stick to outer
            let worldRadius = (1-random()*random())*CFG.worldRadius;
            this.npcs.push(new MothNpc(`moth${i}`, worldRadius*Math.cos(worldAngle), worldRadius*Math.sin(worldAngle)));
        }
        // 5. Spawn krakens
        let krakenSector = sectors.pop()!;
        for (let i = 0; i < CFG.krakensInOwnSector+CFG.krakensInRandomSector; i++) {
            let worldAngle;
            if (i < CFG.krakensInOwnSector) worldAngle = randFloat(krakenSector, krakenSector+60);
            else worldAngle = randFloat(0, 360);
            worldAngle *= DEG_TO_RAD;
            // stick to outer
            let worldRadius = (1-random()*random())*CFG.worldRadius;
            this.npcs.push(new KrakenNpc(`kraken${i}`, worldRadius*Math.cos(worldAngle), worldRadius*Math.sin(worldAngle)));
        }
        // 6. Spawn mimics
        for (let i = 0; i < CFG.mimicsInRandomSector; i++) {
            let worldAngle;
            worldAngle = randFloat(0, 360);
            worldAngle *= DEG_TO_RAD;
            // spread evenly
            let worldRadius = random()*CFG.worldRadius;
            this.npcs.push(new MimicNPC(`mimic${i}`,worldRadius*Math.cos(worldAngle), worldRadius*Math.sin(worldAngle)));
        }

        let worldAngle = randFloat(flowerSector+15, flowerSector+45);
        worldAngle *= DEG_TO_RAD;
        let worldRadius = (random()+0.5)*CFG.sectorSize/2;
        this.player = new Player("player", "pirate", worldRadius*Math.cos(worldAngle), worldRadius*Math.sin(worldAngle));
        this.camera.startFollow(this.player, true, 0.02, 0.02);

        for (let npc of this.npcs) {
            let d = npc.distanceTo(this.player);
            if (d < this.player.viewDistance && !(npc instanceof FlowerNpc)) {
                let angle = Math.atan2(npc.y-this.player.y, npc.x-this.player.x);
                npc.x += 300*Math.cos(angle);
                npc.y += 300*Math.sin(angle);
            }
        }

        // ===== //
        // INPUT //
        // ===== //

        let koSpace = this.input.keyboard!.addKey("SPACE");
        koSpace.on("down", () => {
            if (this.paused) return;
            if (this.player.type === 'pirate' && this.interactingWith instanceof MerchantNpc && !this.interactingWith.aggroed) {
                this.paused = true;
                this.scene.launch('MerchantUI');
            } else {
                this.player.radarOn = !this.player.radarOn;
                // this.activeRadarScan();
            }
        });

        let koQ = this.input.keyboard!.addKey("Q");
        koQ.on("down", ()=>{
            if (this.paused) return;
            if (this.player.type === 'pirate' && this.interactingWith instanceof MerchantNpc && !this.interactingWith.aggroed) {
                this.interactingWith.aggroed = true;
                this.spawnPolice();
                this.logMsg(`${T.logMerchantAggroed} (+${CFG.merchantScore1})`);
                this.player.score += CFG.merchantScore1;
            }
        });

        let koE = this.input.keyboard!.addKey("E");
        koE.on("down", ()=>{
            if (this.paused) return;
            this.spawnPolice();
        })

        let koD = this.input.keyboard!.addKey("D");
        koD.on("down", () => {
            if (this.paused) return;
            this.debugMode = !this.debugMode;
            for (let npc of this.npcs) {
                if (this.debugMode) {
                    npc.debugG.visible = true;
                } else {
                    npc.debugG.visible = false;
                }
            }
        });

        this.input.on('wheel', (_pointer:any, _gameObjects:any, _deltaX:number, deltaY:number, _deltaZ:number) => {
            if (this.paused) return;
            this.updateZoom(deltaY > 0 ? -1 : 1);
        });

        this.input.on('pointerdown', () => {
            if (this.paused) return;
            let mousexy = this.cursorWorldXY();
            if (this.debugMode) {
                this.player.x = mousexy.x;
                this.player.y = mousexy.y;
                return;
            }
            switch (this.player.type) {
                case "pirate":
                    this.tryTeleportTo(mousexy.x,mousexy.y);
                    break;
            }

        });

        this.updateZoom(CFG.zoomInitial);
    }


    cursorWorldXY() {
        return this.camera.getWorldPoint(this.input.activePointer.x, this.input.activePointer.y)
    }

    update(time: number, delta: number) {
        let t0 = performance.now();
        super.update(time, delta);

        let activeList: NPC[] = [];
        let player = this.player;
        if (!this.paused) {
            this.timeToUpdate -= delta;
            let logicUpdate = false;
            if (this.timeToUpdate <= 0) {
                this.timeToUpdate = Game.updateTime;
                logicUpdate = true;
            }
            let ds = Math.min(delta / 1000, Game.updateTime / 1000);
            let mousexy = this.cursorWorldXY();

            // ================== //
            // SELECT ACTIVE NPCS //
            // ================== //
            const px = player.x,
                py = player.y,
                activeDistance = player.radarPulseMax * 2,
                activeDistance2 = activeDistance ** 2;
            for (let n of this.npcs) {
                if (n.alwaysOn) {
                    n.on = true;
                    activeList.push(n);
                    n.distanceToPlayer = n.distanceToXY(px, py);
                }
                let dx = Math.abs(n.x - px),
                    dy = Math.abs(n.y - py);

                // Fast-track: Chebyshev distance
                if (Math.max(dx, dy) > activeDistance) {
                    n.on = false;
                    if (n.box.visible) {
                        n.box.setVisible(false);
                    }
                    continue;
                }
                let d2 = dx ** 2 + dy ** 2;
                if (d2 > activeDistance2) {
                    n.on = false;
                    if (n.box.visible) {
                        n.box.setVisible(false);
                    }
                    continue;
                }
                n.on = true;
                activeList.push(n);
                n.distanceToPlayer = Math.sqrt(d2);
            }
            // console.log(...activeList.map(n=>n.id));

            // ============= //
            // UPDATE PLAYER //
            // ============= //

            player.teleportCurrentCooldown = Math.max(0, player.teleportCurrentCooldown - ds);
            let dx = mousexy.x - player.x;
            let dy = mousexy.y - player.y;
            if (dx ** 2 + dy ** 2 <= player.size ** 2) {
                player.speed = 0;
            } else {
                player.angle = RAD_TO_DEG * Math.atan2(dy, dx);
                player.speed = Math.min(player.max_speed, (dx * dx + dy * dy));
            }

            player.x += ds * Math.cos(DEG_TO_RAD * player.angle) * player.speed;
            player.y += ds * Math.sin(DEG_TO_RAD * player.angle) * player.speed;

            // Radar pulse
            if (player.radarPulseOn) {
                let r1 = player.radarPulseR;
                player.radarPulseR += player.radarPulseSpeed * ds;
                let r2 = player.radarPulseR;

                player.radarPulseGeom.clear();
                let radarPulseAlpha = (1 - (r2 / player.radarPulseMax) ** 4);
                player.radarPulseGeom.lineStyle(4, 0xff0000, radarPulseAlpha);
                if (r2 >= player.radarPulseMax) {
                    player.radarPulseOn = false;
                } else {
                    player.radarPulseGeom.strokeCircle(player.radarPulseX, player.radarPulseY, r2);
                }

                // Reveal npcs with r1 <= d <= r2
                for (let npc of activeList) {
                    let d = npc.distanceToXY(player.radarPulseX, player.radarPulseY);
                    if (r1 <= d && d <= r2) {
                        this.activeRadarHit(npc);
                    }
                }
            } else if (player.radarOn) {
                this.activeRadarScan();
            }

            // =========== //
            // UPDATE NPCS //
            // =========== //

            for (let npc of activeList) {
                if (logicUpdate) {
                    npc.updateAI();
                }

                // Toggle visibility
                let d = npc.distanceToPlayer - npc.size;
                if (npc.sprite) {
                    if (d <= player.viewDistance) {
                        npc.box.visible = true;
                        npc.echo.x = npc.x;
                        npc.echo.y = npc.y;
                        npc.echo.scale = npc.echoRealScale();
                        npc.textTagNode.visible = player.radarOn;
                        npc.updateTextTag();
                    } else {
                        npc.box.visible = false;
                        npc.textTagNode.visible = false;
                    }
                }

                // MOVEMENT AI
                // -----------
                let mb = npc.moveBehavior;
                // набор переменных для шаблона "идти в точку"
                let mbgoto = false, mbgotox = 0, mbgotoy = 0, mbgotospeed = 0;

                switch (mb.kind) {
                    case "idle":
                        npc.speed = 0;
                        break;
                    case "goto": {
                        mbgoto = true;
                        mbgotox = mb.x;
                        mbgotoy = mb.y;
                        mbgotospeed = mb.speed;
                        break;
                    }
                    case "chase": {
                        mbgoto = true;
                        mbgotox = mb.whom.x;
                        mbgotoy = mb.whom.y;
                        mbgotospeed = mb.speed;
                        break;
                    }
                    case "waypoints": {
                        let {x, y} = mb.waypoints[mb.pos];
                        let dx = x - npc.x;
                        let dy = y - npc.y;
                        let d = (dx * dx + dy * dy) ** 0.5;
                        mbgoto = true;
                        mbgotox = x;
                        mbgotoy = y;
                        mbgotospeed = mb.speed;
                        if (d < npc.speed * ds) {
                            mb.pos = (mb.pos + 1) % mb.waypoints.length;
                        }
                        break;
                    }
                    case "wander": {
                        mb.time_left -= ds;
                        if (mb.time_left <= 0) {
                            mb.time_left = mb.period; // randomize?
                            mb.angle = randFloat(0, 360);
                        }
                        npc.speed = mb.speed;
                        npc.angle = mb.angle;
                        break;
                    }
                    case "flee": {
                        let x = mb.from.x;
                        let y = mb.from.y;
                        let dx = npc.x - x;
                        let dy = npc.y - y;
                        npc.speed = mb.speed;
                        npc.angle = RAD_TO_DEG * Math.atan2(dy, dx);
                        break;
                    }
                }
                if (mbgoto) {
                    npc.speed = mbgotospeed;
                    let dy = mbgotoy - npc.y;
                    let dx = mbgotox - npc.x;
                    npc.angle = RAD_TO_DEG * Math.atan2(dy, dx);
                    let d = dy * dy + dx * dx;
                    let s2 = (npc.speed * ds) ** 2;
                    if (s2 > d) {
                        // если мы подходим к цели, замедлиться
                        npc.speed = Math.sqrt(d) / ds;
                    }
                }

                npc.x += ds * Math.cos(DEG_TO_RAD * npc.angle) * npc.speed;
                npc.y += ds * Math.sin(DEG_TO_RAD * npc.angle) * npc.speed;

                if (npc.echoLive > 0 || npc.echoAlwaysOn) {
                    if (!npc.echoAlwaysOn) {
                        npc.echoLive -= ds;
                        npc.echo.alpha = 1 - (1 - npc.echoLive / npc.echoLiveMax) ** 4;
                    } else {
                        npc.echo.alpha = 1;
                    }
                    npc.echo.alpha *= 0.25 * (3 + Math.sin(3 * Math.PI * time / 1000));
                    // npc.echo.clear();
                    let echoColor = npc.frequencyColor();
                    echoColor.alpha = npc.echo.alpha;
                    npc.echo.setTint(echoColor.color32);
                    // npc.echo.fillStyle(echoColor.color32, npc.echoLive/2000);
                    // npc.echo.fillCircle(0, 0, 100);

                    if (!npc.echoAlwaysOn && npc.echoLive <= 0) {
                        npc.echo.alpha = 0;
                    }
                }
            }

            // ================ //
            // CHECK COLLISIONS //
            // ================ //
            let things = [player, ...activeList];

            let collisions: [Thing, Thing][] = []; // array of pairs
            for (let i = 0; i < things.length; i++) {
                if (things[i].sprite) things[i].sprite.tint = things[i].defaultTint;
            }
            for (let i = 0; i < things.length; i++) {
                let ta = things[i];
                let asz = ta.size;
                for (let j = i + 1; j < things.length; j++) {
                    let tb = things[j];
                    let bsz = tb.size;
                    let d2 = (ta.x - tb.x) ** 2 + (ta.y - tb.y) ** 2;
                    let absz = (asz + bsz) ** 2;
                    if (d2 <= absz) {
                        collisions.push([ta, tb]);
                        // console.log(`collision: ${ta.id}, ${tb.id}`);
                        // if (ta === player && tb.sprite) tb.sprite.tint = 0x00ff00;
                    }
                }
            }

            if (logicUpdate) {
                this.interactingWith = null as NPC | null;
                for (let [ta, tb] of collisions) {
                    if (ta instanceof Player && tb instanceof NPC) {
                        // console.log(`collide with player ${tb.id}`)
                        tb.collideWithPlayer(ta);
                    }
                }
            }

            // =========== //
            // UI ELEMENTS //
            // =========== //

            this.backgroundMask.x = player.x;
            this.backgroundMask.y = player.y;
            this.backgroundMask.clear();
            this.backgroundMask.fillStyle(0, 1);
            this.backgroundMask.fillCircle(0, 0, player.viewDistance);

            this.background1.tilePositionX += noise2D(time / 10_000, 10);
            this.background1.tilePositionY += noise2D(-time / 20_000, 20);
            this.background2.tilePositionX = this.background1.tilePositionX;
            this.background2.tilePositionY = this.background1.tilePositionY;
            this.background2.alpha = ((noise2D(time / 1000, 30) * 0.5 + 0.5) ** 6);
            this.background3.alpha = 0.4 * ((noise2D(time / 6_000, 40) * 0.5 + 0.5) ** 2);
            this.background3.tilePositionX = -this.background1.tilePositionX;
            this.background3.tilePositionY = -this.background1.tilePositionY;
            this.background1.alpha = 0.4 - this.background3.alpha;

            for (let thing of things) {
                thing.updateHpBar();
            }
        }
        let uiScene = this.scene.get<GameUI>('GameUI');

        let t1 = performance.now();
        uiScene.scoreText = player.radarOn ? T.uiRadarOn : T.uiRadarOff;
        uiScene.hintText = '';
        // uiScene.scoreText = `Очки: ${this.player.score}`;
        switch (player.type){
            case "pirate": {
                uiScene.scoreText += player.teleportCurrentCooldown > 0? '\n' : `\n${T.uiTeleport}`;
                uiScene.scoreText += `\n${T.uiMoney} ${player.score}`;
                if (player.cargo.flowers > 0) uiScene.scoreText += `\nЛилии: ${player.cargo.flowers}`;
                if (player.cargo.moths > 0) uiScene.scoreText += `\nСветлячки: ${player.cargo.moths}`;
                if (this.interactingWith instanceof MerchantNpc && !this.interactingWith.aggroed) {
                    uiScene.hintText = T.uiTradeButton+'\n'+T.uiPlunderButton;
                    // uiScene.scoreText += `\n${T.uiTradeButton}`;
                    // uiScene.scoreText += `\n${T.uiPlunderButton}`;
                }
                break;
            }

        }
        uiScene.debugText = `FPS: ${this.game.loop.actualFps.toFixed(1)}\n${activeList.length}/${this.npcs.length} NPC active\n${(t1-t0).toFixed(1)}ms update`;

    }
    handleGameover(reason:string='Game Over') {
        this.scene.stop('GameUI');
        this.scene.start('GameOver');
        let s = this.scene.get<GameOver>('GameOver');
        s.gameover_text = reason+'\n'+T.uiGameOverLabel;
    }
    removeFromGame(npc:NPC) {
        npc.alive = false;
        let i = this.npcs.indexOf(npc);
        if (i >= 0) {
            this.npcs.splice(i, 1);
            npc.destroy();
        }
    }
    spawnPolice() {
        let worldAngle;
        worldAngle = randFloat(0, 360);
        worldAngle *= DEG_TO_RAD;
        // stick to inner
        let worldRadius = random()*random()*CFG.worldRadius;
        this.npcs.push(new PoliceNpc(`police`, worldRadius*Math.cos(worldAngle), worldRadius*Math.sin(worldAngle)));
    }

    activeRadarScan() {
        if (!this.player.radarPulseOn) {
            if (CFG.soundEnabled) this.player.radarPulseSound.play();
            this.player.radarPulseOn = true;
            this.player.radarPulseX = this.player.x;
            this.player.radarPulseY = this.player.y;
            this.player.radarPulseR = 0;
        }
    }

    tryTeleportTo(x:number, y:number) {
        let player = this.player;
        if (player.type === "pirate" && player.teleportCurrentCooldown <= 0) {
            player.teleportCurrentCooldown = player.teleportCooldown;
            let az = Math.atan2(y-player.y, x-player.x);
            let d = player.distanceToXY(x,y);
            if (d <= player.teleportDistance) {
                player.x = x;
                player.y = y;
            } else {
                player.x += player.teleportDistance*Math.cos(az);
                player.y += player.teleportDistance*Math.sin(az);
            }
        }
    }

    createEcho(npc:NPC, timeToLive:number) {
        if (timeToLive < 0) {
            npc.echoAlwaysOn = true;
            npc.echoLive = npc.echoLiveMax = 1;
        } else {
            npc.echoAlwaysOn = false;
            npc.echoLive = npc.echoLiveMax = timeToLive;
        }
        npc.echo.alpha = 1;
        npc.echo.x = npc.x;
        npc.echo.y = npc.y;
        let d = this.player.distanceTo(npc);
        let distortion: number;
        if (d < this.player.viewDistance) {
            distortion = 1;
        } else {
            // distSpread = 1 at d=viewDistance, = 1/X at d=2*viewDistance, = 2/X at d=3*viewDistance
            let distSpread = Math.pow(1.25, (d - this.player.viewDistance) / this.player.viewDistance);
            let shrinkFactor = Math.abs(npc.echoSeed) * (1 - distSpread) + distSpread;
            if (npc.echoSeed >= 0) {
                distortion = shrinkFactor;
            } else {
                distortion = (1 / shrinkFactor);
            }
            distortion = Math.min(4, distortion);
        }
        npc.echo.scale = distortion * npc.echoRealScale();
        // console.log(`created echo for ${npc.id} with distortion ${distortion} scale ${npc.echo.scale}`);
    }
    activeRadarHit(npc: NPC) {
        if (CFG.soundEnabled) this.player.radarHitSound.play({
            volume: 0.75 + npc.frequency/720,
            rate: 1,
        });
        if (!npc.echoAlwaysOn && npc.distanceTo(this.player) > this.player.viewDistance) {
            this.createEcho(npc, 10);
        }
        npc.onPingByPlayer(this.player);
    }

    updateZoom(delta: number) {
        this.zoomLevel = clamp(CFG.zoomMin, this.zoomLevel+delta, CFG.zoomMax);
        this.camera.zoom = CFG.zoomFactor**this.zoomLevel;
        // this.uiContainer.setScale(1/this.camera.zoom);
    }

    logMsg(msg: string) {
        let ui = this.scene.get<GameUI>("GameUI");
        if (ui) {
            ui.logText.push(msg);
            while (ui.logText.length > CFG.maxLogMsg) ui.logText.shift();
        }
    }
}
