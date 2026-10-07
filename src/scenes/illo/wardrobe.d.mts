// Types of src/scenes/illo/wardrobe.mjs (the people of the kit: who they are and what they wear; the file's header).
export type Role =
  | 'me' | 'friend' | 'girl' | 'mom' | 'grandpa' | 'mechanic' | 'seller' | 'officer' | 'boss' | 'crowd'
  | 'ex' | 'man' | 'woman' | 'dad' | 'grandma' | 'buyer' | 'neighbour';
export type Outfit =
  | 'suit' | 'suitOpen' | 'blazer' | 'leather' | 'bomber' | 'denim' | 'trench' | 'overcoat' | 'puffer' | 'shirt' | 'polo'
  | 'turtleneck' | 'knit' | 'hoodie' | 'tee' | 'cardigan' | 'blouse' | 'dress' | 'coverall' | 'uniform';
export type HairStyle =
  | 'crop' | 'side' | 'quiff' | 'slick' | 'fade' | 'buzz' | 'curly' | 'wavy' | 'manbun' | 'textured' | 'receding' | 'bald'
  | 'long' | 'waves' | 'bob' | 'lob' | 'pixie' | 'pony' | 'bun' | 'curls' | 'lowbun';
export type Beard = 'stubble' | 'short' | 'full' | 'tache' | 'goatee';
export type Shoe = 'sneaker' | 'derby' | 'loafer' | 'chelsea' | 'boot' | 'heel' | 'flat';
export type Bottom = 'trousers' | 'jeans' | 'chinos' | 'skirt' | 'none';
export type Glasses = 'round' | 'rect' | 'shades' | 'aviator' | 'shadesUp';
export type Hat = 'cap' | 'capBack' | 'beanie' | 'flatCap' | 'peaked';
export type Inner = 'none' | 'shirt' | 'tee' | 'turtleneck' | 'knit' | 'blouse';

/** A person's resolved look: every tone a step of the kit's grey ramp (0 lightest .. 7 darkest). */
export type Dress = {
  role: Role;
  fem: boolean;
  age: number; // 0 young adult, 1 in the fifties, 2 older
  skin: number; // 0 fair .. 3 olive / tan
  build: number; // the shoulders' width, about 0.96 .. 1.06
  hair: HairStyle;
  hairTone: number;
  beard: Beard | null;
  outfit: Outfit;
  tone: number;
  inner: Inner;
  innerTone: number;
  tie: number | null;
  bottom: Bottom;
  legs: number;
  shoe: Shoe;
  shoeTone: number;
  sole: number | null;
  glasses: Glasses | null;
  hat: Hat | null;
  hatTone: number;
  watch: boolean;
  chain: boolean;
  earrings: 'stud' | 'hoop' | null;
  bag: boolean;
  scarf: number | null;
  sleeve: 'long' | 'short' | 'rolled';
  tucked: boolean;
};

/** What a spec may pick for a person (everything else is the role's look in the film). */
export type CastPick = {
  outfit?: Outfit | string;
  hair?: HairStyle | string;
  hairTone?: number;
  skin?: number;
  tone?: number;
  legs?: number;
  beard?: Beard | 'none' | null;
  glasses?: Glasses | 'none' | null;
  hat?: Hat | 'none' | null;
  shoe?: Shoe;
  bottom?: Bottom;
  gender?: 'm' | 'f';
  age?: 'young' | 'adult' | 'old';
  extras?: readonly ('watch' | 'chain' | 'earrings' | 'hoops' | 'bag' | 'scarf' | 'tie')[];
  look?: number;
};

export declare const ROLES: readonly Role[];
export declare const OUTFITS: readonly Outfit[];
export declare const HAIRS: readonly HairStyle[];
export declare const BEARDS: readonly Beard[];
export declare const SHOES: readonly Shoe[];
export declare const BOTTOMS: readonly Bottom[];
export declare const GLASSES: readonly Glasses[];
export declare const HATS: readonly Hat[];
export declare const filmKey: (id: string | number | null | undefined) => number;
export declare const dressOf: (role: Role | string, key?: number, o?: {variant?: number; voice?: string; gender?: 'm' | 'f'; age?: number}) => Dress;
export declare const castDress: (cast: unknown, key?: number, o?: {voice?: string}) => Dress;
export declare const lookLine: (d: Dress | null | undefined) => string;
export declare const lookKey: (d: Dress | null | undefined) => string;
