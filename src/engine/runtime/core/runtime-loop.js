export function createRuntimeLoop({
  state,
  width,
  height,
  gameShell,
  canvas,
  runtimeContext,
  phaserGame,
  globalWindow,
  globalDocument,
  update,
  render,
  performanceNow = () => performance.now(),
  requestAnimationFrameFn = (callback) => globalWindow.requestAnimationFrame(callback),
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
    const viewportWidth = Math.max(
      1,
      Math.floor(
        globalWindow.visualViewport?.width ||
          globalDocument.documentElement.clientWidth ||
          globalWindow.innerWidth ||
          width
      )
    );
    const viewportHeight = Math.max(
      120,
      Math.floor(
        globalWindow.visualViewport?.height ||
          globalDocument.documentElement.clientHeight ||
          globalWindow.innerHeight ||
          height
      )
    );
    gameShell.style.width = `${viewportWidth}px`;
    gameShell.style.height = `${viewportHeight}px`;
    canvas.style.width = `${viewportWidth}px`;
    canvas.style.height = `${viewportHeight}px`;
    canvas.style.left = "0px";
    canvas.style.top = "0px";
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

  let lastFrame = performanceNow();
  function gameLoop(now) {
    const dt = Math.min(0.05, Math.max(0, (now - lastFrame) / 1000));
    lastFrame = now;
    tickFrame(dt);
    requestAnimationFrameFn(gameLoop);
  }

  function startRuntimeLoop() {
    resizeCanvas();
    render();
    if (runtimeContext && typeof runtimeContext.setStepHandler === "function") {
      let priorTime = performanceNow();
      runtimeContext.setStepHandler((dtSeconds, timeMs) => {
        let dt = dtSeconds;
        if (!Number.isFinite(dt) || dt < 0) {
          const now = Number.isFinite(timeMs) ? timeMs : performanceNow();
          dt = Math.max(0, (now - priorTime) / 1000);
          priorTime = now;
        } else if (Number.isFinite(timeMs)) {
          priorTime = timeMs;
        }
        tickFrame(Math.min(0.05, Math.max(0, dt)));
      });
      return;
    }
    requestAnimationFrameFn(gameLoop);
  }

  return {
    advanceTime,
    resizeCanvas,
    startRuntimeLoop,
  };
}
