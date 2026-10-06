// The illustration ramp ("Graphite", src/scenes/illo/): a neutral grey ramp (R = G = B, never bluish, never beige) that
// carries every drawn object of the illustrated scenes, for both looks. tokens.ts spreads these tables into its DARK and
// LIGHT palettes, so C.il0 .. C.ilNight work everywhere C does (scenes AND Film scenes) and follow setTheme(); setMono()
// leaves them alone (they are grey already). Kept in its own file so the ramp can change without touching tokens.ts.
// Read them only through C at render time (src/scenes/illo/palette.ts has the helpers); never copy a value into a scene.
//
//   il0..il7   lightest .. darkest object tone (highlights, light surfaces, mid paint, jeans, jackets, tyres, deepest)
//   ilSkin(2)  skin base and its shade (a neutral grey, like the whole brand ramp)
//   ilFeature  eyes, brows, mouth;  ilGlass: car glass and dark screens
//   ilRim      the rim light stroke on lit edges;  ilEdge: the outer contour (light film only: newspaper print)
//   ilCut      the 1.5 px gap line between overlapping parts (a cel cut: the field's own colour)
//   ilNight    the night plate (on paper a night picture sits on this plate inside the picture band)

export const IL_DARK = {
  il0: '#F5F5F5',
  il1: '#D4D4D4',
  il2: '#ABABAB',
  il3: '#858585',
  il4: '#616161',
  il5: '#454545',
  il6: '#2E2E2E',
  il7: '#1C1C1C',
  ilSkin: '#C7C7C7',
  ilSkin2: '#9C9C9C',
  ilFeature: '#0F0F0F',
  ilGlass: '#0E0E0E',
  ilRim: 'rgba(245,245,245,0.38)',
  ilEdge: 'rgba(0,0,0,0)',
  ilCut: '#000000',
  ilNight: '#000000',
};

export const IL_LIGHT: typeof IL_DARK = {
  il0: '#FFFFFF',
  il1: '#E9E9E9',
  il2: '#D2D2D2',
  il3: '#B4B4B4',
  il4: '#8E8E8E',
  il5: '#666666',
  il6: '#3F3F3F',
  il7: '#1E1E1E',
  ilSkin: '#E6E6E6',
  ilSkin2: '#C9C9C9',
  ilFeature: '#0B0B0B',
  ilGlass: '#2A2A2A',
  ilRim: 'rgba(255,255,255,0.9)',
  ilEdge: '#0B0B0B',
  ilCut: '#F3F3F3',
  ilNight: '#141414',
};
