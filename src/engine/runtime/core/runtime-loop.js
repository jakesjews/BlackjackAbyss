export function createRuntimeLoop({
  state,
  width,
  height,
  runtimeContext,
  phaserGame,
  update,
  render,
}) {
  function tickFrame(dt) {
    update(dt);
    render();
  }

  function advanceTime(ms) {
    const step = 1000 / 60;
    const steps = Math.max(1, Math.round(ms / step));
    for (let i = 0; i < steps; i += 1) {
      update(1 / 60);
    }
    render();
  }

  function resizeCanvas() {
    const parentWidth = Number(phaserGame?.scale?.parentSize?.width) || 0;
    const parentHeight = Number(phaserGame?.scale?.parentSize?.height) || 0;
    const gameWidth = Number(phaserGame?.scale?.gameSize?.width) || 0;
    const gameHeight = Number(phaserGame?.scale?.gameSize?.height) || 0;
    const viewportWidth = Math.max(
      1,
      Math.floor(parentWidth || gameWidth || width)
    );
    const viewportHeight = Math.max(
      120,
      Math.floor(parentHeight || gameHeight || height)
    );

    state.viewport = {
      width: viewportWidth,
      height: viewportHeight,
      scale: 1,
      cropWorldX: 0,
      portraitZoomed: false,
    };

    if (phaserGame?.scale && typeof phaserGame.scale.resize === "function") {
      const currentW = Math.round(phaserGame.scale.gameSize?.width || 0);
      const currentH = Math.round(phaserGame.scale.gameSize?.height || 0);
      if (currentW !== viewportWidth || currentH !== viewportHeight) {
        phaserGame.scale.resize(viewportWidth, viewportHeight);
      }
    }
  }

  function startRuntimeLoop() {
    resizeCanvas();
    render();
    if (runtimeContext && typeof runtimeContext.setStepHandler === "function") {
      let priorTime = null;
      runtimeContext.setStepHandler((dtSeconds, timeMs) => {
        let dt = dtSeconds;
        if (!Number.isFinite(dt) || dt < 0) {
          if (Number.isFinite(timeMs) && Number.isFinite(priorTime)) {
            dt = Math.max(0, (timeMs - priorTime) / 1000);
          } else {
            dt = 1 / 60;
          }
        }
        if (Number.isFinite(timeMs)) {
          priorTime = timeMs;
        }
        tickFrame(Math.min(0.05, Math.max(0, dt)));
      });
      return;
    }
    throw new Error("Runtime loop requires runtimeContext.setStepHandler.");
  }

  return {
    advanceTime,
    resizeCanvas,
    startRuntimeLoop,
  };
}
