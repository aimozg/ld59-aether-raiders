import {createNoise2D, createNoise3D, createNoise4D} from "simplex-noise";

export function random() {
    return Math.random();
}
export function randInt(min:number, max:number):number {
    return Math.floor(random() * (max - min)) + min;
}
export function randFloat(min:number, max:number):number {
    return (random() * (max - min)) + min;
}
export function randBool(trueChance=0.5) {
    return random()<=trueChance;
}
export function randItem<T>(items: T[]):T {
    return items[Math.floor(random() * items.length)];
}
export function randWeightedFn<T>(items: T[], wfn:(item:T)=>number):T {
    let sum = 0;
    for (let item of items) sum += wfn(item);
    let x = random()*sum;
    for (let item of items) {
        x -= wfn(item);
        if (x <= 0) return item;
    }
    return items[0];
}
export function shuffle<T extends any[]>(items: T): T {
    for (let i = items.length - 1; i > 0; i--) {
        let j = randInt(0, i+1);
        [items[i], items[j]] = [items[j], items[i]];
    }
    return items;
}
export function clamp(min:number, x:number, max:number):number {
    return x < min ? min : x > max ? max : x;
}
export function rand2Normal(mean:number=0, variance:number=1):{x:number,y:number} {
    while(true) {
        const u = 2 * Math.random() - 1.0;
        const v = 2 * Math.random() - 1.0;
        let s = Math.pow(u, 2) + Math.pow(v, 2);
        if(s > 0.0 && s < 1.0) {
            const p = Math.sqrt(-2.0 * Math.log(s) / s);
            let z0 = u * p;
            let z1 = v * p;
            return {x:z0*variance+mean,y:z1*variance+mean};
        }
    }
}
/**
 * Linear Interpolation (Lerp)
 * Calculates a point between two values based on a factor 't'.
 * @param {number} a - Start value
 * @param {number} b - End value
 * @param {number} t - Interpolation factor (0.0 to 1.0)
 * @returns {number} The interpolated value
 */
export function lerp(a:number, b:number, t:number) { return a + t * (b - a); }

/**
 * The Smoothing/Fade Function (Quintic Curve)
 * f(t) = 6t^5 - 15t^4 + 10t^3
 * This ensures the noise curve is C2 continuous (smooth second derivative).
 * @param {number} t - Input factor (0.0 to 1.0)
 * @returns {number} The smoothed factor
 */
export function fade(t:number) { return t * t * t * (t * (t * 6 - 15) + 10); }

export const noise2D = createNoise2D();
export const noise3D = createNoise3D();
export const noise4D = createNoise4D();