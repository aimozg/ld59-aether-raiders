import {randInt} from "./utils.ts";

export const CFG = new class {
    width = window.innerWidth; // 1024;
    height = window.innerHeight; // 600;
    backgroundColor =  '#000002';

    defaultLocale = 'en';
    soundEnabled = true;

    zoomInitial = -3;
    zoomMin = -10;
    zoomMax = +10;
    zoomFactor = 1.25;

    frequencies = [0, 60, 120, 180, 240, 300];

    bgStarCount = 1000;
    bgStarMinSize = 0.5;
    bgStarMaxSize = 2.0;

    maxLogMsg = 10;

    npcFactor = 0.25;
    worldSizeFactor = 0.5; // linear!

    // ========== //
    // WORLD SIZE //
    // ========== //

    sectorSize = 6*this.width*this.worldSizeFactor;
    // world = 4x4 sectors
    worldSize = 4*this.sectorSize;
    worldRadius = this.worldSize/2;
    minX = -this.worldSize/2;
    minY = -this.worldSize/2;
    maxX = +this.worldSize/2;
    maxY = +this.worldSize/2;

    // tag: ()=>string = ()=>`НЖТИ`;
    tag: ()=>string = ()=>randInt(0,0x10000).toString(16).toUpperCase().padStart(4,'0');

    // ============ //
    // PLAYER STATS //
    // ============ //
    playerPresets = {
        pirate: {
            speed: 150,
            speedUpgrades: [{
                speed: 180,
                cost: 300
            }, {
                speed: 210,
                cost: 900,
            }, {
                speed: 240,
                cost: 3000,
            }],
            size: 32,
            hp: 100,
            repairCost: 250,
            hpUpgrades: [{
                hp: 200,
                cost: 500,
            }, {
                hp: 300,
                cost: 1500,
            }, {
                hp: 400,
                cost: 4000,
            }],
            damage: 1,
            dmgUpgrades: [{
                dmg: 2,
                cost: 1000,
            }, {
                dmg: 3,
                cost: 3000
            }],
            radarPulseRadius: 2000,
            radarPulseSpeed: 750,
            viewDistance: 200,
            viewUpgrades: [{
                distance: 250,
                cost: 100,
            }, {
                distance: 300,
                cost: 500,
            }, {
                distance: 350,
                cost: 1500,
            }]
        },
    }

    // ========= //
    // NPC SPAWN //
    // ========= //

    flowerInFlowerSector = 300*this.npcFactor;
    flowerInRandomSector = 100*this.npcFactor;
    medusaInFlowerSector = 200*this.npcFactor;
    medusaInMedusaSector = 100*this.npcFactor;
    medusaInRandomSector = 100*this.npcFactor;
    merchantsTotal = 48*this.npcFactor;
    mothsInOwnSector = 200*this.npcFactor;
    mothsInRandomSector = 200*this.npcFactor;
    krakensInOwnSector = 50*this.npcFactor;
    krakensInRandomSector = 250*this.npcFactor;
    mimicsInRandomSector = 100*this.npcFactor;

    // ========= //
    // NPC STATS //
    // ========= //

    medusaSize = [16, 32];
    medusaSpeed = [80, 80];
    medusaHpFactor = 1;
    medusaWanderTime = [3, 6];
    medusaScore = 100;
    medusaDmg = 1;

    flowerSize = [8, 32];
    flowerHpFactor = 0.25;
    flowerScoreFactor = 1;
    flowerEchoChance = 0.01; // шанс в тик (100 мс) что издаст эхо
    flowerEchoTTL = [0, 3];

    mothSize = [8, 16];
    mothSpeed = [180, 360];
    mothHpBase = 1;
    mothHpFactor = 0;
    mothScoreFactor = 2;
    // mothEchoChance
    // mothEchoTTL

    merchantSize = [64, 64];
    // merchantSpeed = [60, 90];
    merchantHp = 100;
    merchantScore1 = 250;
    merchantScore2 = 1000;
    merchantDmg = 4;

    policeSize = [64, 64];
    policeSpeed = [150, 200];
    policeHp = 40;
    policeDmg = 2;
    policeTicksPerFrequencyChange = 2;

    krakenSize = [32, 96];
    krakenSpeed = [180, 240];
    krakenHpFactor = 2;
    krakenViewDistance = 0; // 0: слепой >0: видит игрока и идёт за ним
    krakenScore = 400;
    krakenDmg = 2;

    mimicSize = [16, 64];
    mimicSpeed = [60, 240];
    mimicHpFactor = 0.5;
    mimicRevealChance = 0.9; // шанс что тег мимика будет МИМИ
    mimicScore = 200;
    mimicDmg = 4;
    mimicStarChance = 0.1;
};
