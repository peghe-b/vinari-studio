// The physics scenes' names, with no imports at all (2026-10-27, r3x round 1: tools/ci/catalog.mjs took PHYS_SCENES from
// tools/ci/physlint.mjs, which loads src/lib/physics.mjs and so matter-js; the studio's "brief" step runs
// tools/ci/prompt.mjs -> catalog.mjs BEFORE npm ci, and every film type died there with ERR_MODULE_NOT_FOUND).
// Anything the brief reaches must stay free of npm packages: tools/ci/briefdeps.mjs walks prompt.mjs's imports and fails
// on one (the brief step and p2-check run it).
export const PHYS_SCENES = new Set(['PhysJar', 'PhysStack', 'PhysCount']);
