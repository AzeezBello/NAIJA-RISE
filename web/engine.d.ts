// Minimal typings for the JavaScript engine in ../src until it is ported to TypeScript.
declare module '@engine/game.js' {
  export function createGame(opts: { mount: HTMLElement; ui: HTMLElement; startScene?: 'title' | 'city' }): { stop: () => void; G?: any };
  export function stopGame(): void;
}
