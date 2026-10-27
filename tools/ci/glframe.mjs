// GL_PLATE's view of a shot (src/lib/gltrans.mjs glRefusal `frameOf`), with the photo catalogue the browser-side default
// cannot read: 'plate' when the shot's picture is a framed photo on the field (a PhotoStory print or window, a Photo in its
// default frame mode, any full-bleed staging whose photo does not fit the frame and is shown whole: tools/ci/stories.mjs
// fitMisses, the same numbers as src/lib/bleed.ts), else null (a full-bleed photo, a chart, a map, an object). Two plates
// never line up (their own aspect, their own camera push), so a GL edge between them shows both frames (the r3 review: the
// soft wipe from the car lift into the night panorama, a corner of the old plate sticking out of the new one).
import {plateOf} from '../../src/lib/gltrans.mjs';
import {fitMisses} from './stories.mjs';

export const photoFrame = (sc) => {
  if (!sc || typeof sc !== 'object') return null;
  if (plateOf(sc)) return 'plate';
  if (sc.type === 'Photo' && sc.src && !['bleed', 'cover'].includes(sc.mode)) return 'plate';
  return fitMisses(sc).length ? 'plate' : null;
};
