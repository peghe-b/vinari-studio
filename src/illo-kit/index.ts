// The illustration kit's own bundle (tools/illo-gallery.mjs --kit): the kit's parts on their own, outside the studio
// bundle (src/index.ts), so no film and no cloud run ever sees these demo compositions.
import {registerRoot} from 'remotion';
import {KitRoot} from './Kit';

registerRoot(KitRoot);
