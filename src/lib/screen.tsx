// A capture (public/screens/<src>.jpg) as an <Img>, with the studio's one status bar (./statusbar.ts). Use it wherever a whole
// screen with its top edge is drawn; a crop of a row below the bar may keep staticFile(`screens/<src>.jpg`).
import React from 'react';
import {Img} from 'remotion';
import {useScreenUrl} from './statusbar';

export const ScreenImg: React.FC<{src: string; style?: React.CSSProperties}> = ({src, style}) => {
  const url = useScreenUrl(src);
  return url ? <Img src={url} style={style} /> : null;
};
