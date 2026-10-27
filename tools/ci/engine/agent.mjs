// The Agent SDK for tools/ci/claude-run.mjs, loaded from here so it resolves from tools/ci/engine/node_modules (installed
// only in the cloud by tools/ci/setup.sh: the Mac never needs it). A missing install makes the import throw, and the
// script step then runs on the Claude token as before.
export {query} from '@anthropic-ai/claude-agent-sdk';
