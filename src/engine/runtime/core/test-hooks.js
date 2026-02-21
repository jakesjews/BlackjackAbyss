export function installRuntimeTestHooks({ publishRuntimeTestHooks, renderGameToText, advanceTime }) {
  publishRuntimeTestHooks({
    renderGameToText,
    advanceTime,
  });
}
