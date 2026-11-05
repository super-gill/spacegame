/**
 * Suggested character names, to fill the name box (Jason: "suggested
 * names can fill the boxes"). Two made-up parts from short syllables; the
 * player can type over it. Not lore: just something to start from.
 */

const FIRST = ['Ash', 'Bren', 'Cal', 'Dara', 'Esk', 'Fen', 'Garr', 'Hale', 'Ines', 'Jory', 'Kael', 'Lio', 'Mara', 'Nox', 'Orin', 'Pell', 'Quin', 'Rhea', 'Sol', 'Tamsin', 'Ulo', 'Vesh', 'Wren', 'Yara', 'Zeph'];
const LAST_START = ['Brack', 'Cor', 'Dun', 'Fal', 'Gree', 'Hart', 'Kest', 'Lom', 'Mor', 'Nell', 'Ost', 'Pry', 'Rook', 'Stav', 'Tor', 'Vane'];
const LAST_END = ['well', 'by', 'ford', 'stone', 'mere', 'ick', 'ard', 'ley', 'win', 'holt', 'ane', 'ow'];

const pick = <T>(list: readonly T[]): T => list[Math.floor(Math.random() * list.length)]!;

export function suggestName(): string {
  return `${pick(FIRST)} ${pick(LAST_START)}${pick(LAST_END)}`;
}
