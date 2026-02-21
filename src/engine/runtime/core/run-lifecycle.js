export function goHomeFromActiveRun({ state, playUiSfx, saveRunSnapshot }) {
  if (!state?.run || state.mode === "menu" || state.mode === "collection") {
    return;
  }
  playUiSfx("confirm");
  saveRunSnapshot();
  state.mode = "menu";
}
