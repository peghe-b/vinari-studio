import React from 'react';

// What a scene may know about the film it is in (Promo provides it in an fx film): a Callback replays the hook.
export type FilmInfo = {
  /** scene k of the film, frozen on its own frame f, muted (Promo builds it: its camera, its context) */
  frozen: (k: number, f: number) => React.ReactNode;
  /** scene 0's length and the cover's frame inside it, if the cover shows scene 0 */
  hook: {dur: number; cover: number | null; webgl: boolean};
};
export const FilmCtx = React.createContext<FilmInfo | null>(null);
