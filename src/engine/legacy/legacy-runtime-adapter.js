const EXTERNAL_RENDER_MODES = new Set(["menu", "playing", "reward", "shop", "collection", "gameover", "victory"]);

export class LegacyRuntimeAdapter {
  constructor() {
    this.game = null;
    this.stepHandler = null;
    this.inputHandlers = null;
    this.mode = "menu";
    this.modeHandler = null;
    this.menuActions = null;
    this.runApi = null;
    this.rewardApi = null;
    this.shopApi = null;
    this.overlayApi = null;
    this.externalRenderModes = new Set(EXTERNAL_RENDER_MODES);
    this.renderCanvas = null;
    this.canvasProxy = null;
    this.bridge = {
      setStepHandler: (handler) => {
        this.stepHandler = typeof handler === "function" ? handler : null;
      },
      getCanvas: () => this.canvasProxy || this.game?.canvas || null,
      setInputHandlers: (handlers) => {
        if (!handlers || typeof handlers !== "object") {
          this.inputHandlers = null;
          return;
        }
        this.inputHandlers = {
          pointerDown: typeof handlers.pointerDown === "function" ? handlers.pointerDown : null,
          pointerMove: typeof handlers.pointerMove === "function" ? handlers.pointerMove : null,
          pointerUp: typeof handlers.pointerUp === "function" ? handlers.pointerUp : null,
          pointerCancel: typeof handlers.pointerCancel === "function" ? handlers.pointerCancel : null,
          keyDown: typeof handlers.keyDown === "function" ? handlers.keyDown : null,
        };
      },
      reportMode: (mode) => {
        this.setMode(mode);
      },
      setModeHandler: (handler) => {
        this.modeHandler = typeof handler === "function" ? handler : null;
        if (this.modeHandler) {
          this.modeHandler(this.mode);
        }
      },
      setMenuActions: (actions) => {
        if (!actions || typeof actions !== "object") {
          this.menuActions = null;
          return;
        }
        this.menuActions = {
          startRun: typeof actions.startRun === "function" ? actions.startRun : null,
          resumeRun: typeof actions.resumeRun === "function" ? actions.resumeRun : null,
          openCollection: typeof actions.openCollection === "function" ? actions.openCollection : null,
          hasSavedRun: typeof actions.hasSavedRun === "function" ? actions.hasSavedRun : null,
        };
      },
      getMenuActions: () => this.menuActions,
      setRunApi: (api) => {
        if (!api || typeof api !== "object") {
          this.runApi = null;
          return;
        }
        this.runApi = {
          getSnapshot: typeof api.getSnapshot === "function" ? api.getSnapshot : null,
          hit: typeof api.hit === "function" ? api.hit : null,
          stand: typeof api.stand === "function" ? api.stand : null,
          doubleDown: typeof api.doubleDown === "function" ? api.doubleDown : null,
          split: typeof api.split === "function" ? api.split : null,
          deal: typeof api.deal === "function" ? api.deal : null,
          confirmIntro: typeof api.confirmIntro === "function" ? api.confirmIntro : null,
          fireballLaunch: typeof api.fireballLaunch === "function" ? api.fireballLaunch : null,
          fireballImpact: typeof api.fireballImpact === "function" ? api.fireballImpact : null,
          goHome: typeof api.goHome === "function" ? api.goHome : null,
        };
      },
      getRunApi: () => this.runApi,
      setRewardApi: (api) => {
        if (!api || typeof api !== "object") {
          this.rewardApi = null;
          return;
        }
        this.rewardApi = {
          getSnapshot: typeof api.getSnapshot === "function" ? api.getSnapshot : null,
          prev: typeof api.prev === "function" ? api.prev : null,
          next: typeof api.next === "function" ? api.next : null,
          claim: typeof api.claim === "function" ? api.claim : null,
          selectIndex: typeof api.selectIndex === "function" ? api.selectIndex : null,
          goHome: typeof api.goHome === "function" ? api.goHome : null,
        };
      },
      getRewardApi: () => this.rewardApi,
      setShopApi: (api) => {
        if (!api || typeof api !== "object") {
          this.shopApi = null;
          return;
        }
        this.shopApi = {
          getSnapshot: typeof api.getSnapshot === "function" ? api.getSnapshot : null,
          prev: typeof api.prev === "function" ? api.prev : null,
          next: typeof api.next === "function" ? api.next : null,
          buy: typeof api.buy === "function" ? api.buy : null,
          continueRun: typeof api.continueRun === "function" ? api.continueRun : null,
          selectIndex: typeof api.selectIndex === "function" ? api.selectIndex : null,
          goHome: typeof api.goHome === "function" ? api.goHome : null,
        };
      },
      getShopApi: () => this.shopApi,
      setOverlayApi: (api) => {
        if (!api || typeof api !== "object") {
          this.overlayApi = null;
          return;
        }
        this.overlayApi = {
          getSnapshot: typeof api.getSnapshot === "function" ? api.getSnapshot : null,
          prevPage: typeof api.prevPage === "function" ? api.prevPage : null,
          nextPage: typeof api.nextPage === "function" ? api.nextPage : null,
          backToMenu: typeof api.backToMenu === "function" ? api.backToMenu : null,
          restart: typeof api.restart === "function" ? api.restart : null,
          confirm: typeof api.confirm === "function" ? api.confirm : null,
        };
      },
      getOverlayApi: () => this.overlayApi,
      isExternalRendererActive: (mode) => {
        return typeof mode === "string" && this.externalRenderModes.has(mode);
      },
    };
  }

  attachGame(game) {
    this.game = game || null;
    this.ensureRenderSurface();
    return this.bridge;
  }

  tick(deltaMs, timeMs) {
    if (typeof this.stepHandler !== "function") {
      return;
    }
    this.syncRenderCanvasSizeFromGameCanvas();
    const safeDeltaSeconds = Math.max(0, Number.isFinite(deltaMs) ? deltaMs : 0) / 1000;
    this.stepHandler(safeDeltaSeconds, Number.isFinite(timeMs) ? timeMs : performance.now());
  }

  setMode(mode) {
    if (typeof mode !== "string" || mode.length === 0 || this.mode === mode) {
      return;
    }
    this.mode = mode;
    if (typeof this.modeHandler === "function") {
      this.modeHandler(mode);
    }
  }

  dispatchPointerDown(pointer) {
    this.dispatchInput("pointerDown", this.pointerEventFromPhaser(pointer));
  }

  dispatchPointerMove(pointer) {
    this.dispatchInput("pointerMove", this.pointerEventFromPhaser(pointer));
  }

  dispatchPointerUp(pointer) {
    this.dispatchInput("pointerUp", this.pointerEventFromPhaser(pointer));
  }

  dispatchPointerCancel(pointer) {
    this.dispatchInput("pointerCancel", this.pointerEventFromPhaser(pointer));
  }

  dispatchKeyDown(event) {
    this.dispatchInput("keyDown", event);
  }

  dispatchInput(type, event) {
    if (!this.inputHandlers) {
      return;
    }
    const handler = this.inputHandlers[type];
    if (typeof handler !== "function") {
      return;
    }
    try {
      handler(event);
    } catch {
      // Keep runtime stable if legacy input callback throws.
    }
  }

  pointerEventFromPhaser(pointer) {
    const nativeEvent = pointer?.event;
    if (nativeEvent && typeof nativeEvent === "object") {
      const synthesized = this.synthPointerCoordinates(pointer);
      return {
        clientX: Number.isFinite(nativeEvent.clientX) ? nativeEvent.clientX : synthesized.clientX,
        clientY: Number.isFinite(nativeEvent.clientY) ? nativeEvent.clientY : synthesized.clientY,
        pointerId: Number.isFinite(nativeEvent.pointerId)
          ? nativeEvent.pointerId
          : Number.isFinite(pointer?.id)
            ? pointer.id
            : 0,
        pointerType: typeof nativeEvent.pointerType === "string" ? nativeEvent.pointerType : "mouse",
        button: Number.isFinite(nativeEvent.button) ? nativeEvent.button : Number.isFinite(pointer?.button) ? pointer.button : 0,
        buttons: Number.isFinite(nativeEvent.buttons) ? nativeEvent.buttons : Number.isFinite(pointer?.buttons) ? pointer.buttons : 1,
        preventDefault: typeof nativeEvent.preventDefault === "function" ? () => nativeEvent.preventDefault() : () => {},
      };
    }

    const synthesized = this.synthPointerCoordinates(pointer);
    return {
      clientX: synthesized.clientX,
      clientY: synthesized.clientY,
      pointerId: Number.isFinite(pointer?.id) ? pointer.id : 0,
      pointerType: "mouse",
      button: Number.isFinite(pointer?.button) ? pointer.button : 0,
      buttons: Number.isFinite(pointer?.buttons) ? pointer.buttons : 1,
      preventDefault() {},
    };
  }

  synthPointerCoordinates(pointer) {
    const canvas = this.game?.canvas || null;
    const rect = canvas ? canvas.getBoundingClientRect() : { left: 0, top: 0 };
    const x = Number.isFinite(pointer?.x) ? pointer.x : 0;
    const y = Number.isFinite(pointer?.y) ? pointer.y : 0;
    return {
      clientX: rect.left + x,
      clientY: rect.top + y,
    };
  }

  ensureRenderSurface() {
    if (!this.game?.canvas || this.renderCanvas) {
      return;
    }
    const visibleCanvas = this.game.canvas;
    const width = Math.max(1, Number(visibleCanvas.width) || 1);
    const height = Math.max(1, Number(visibleCanvas.height) || 1);
    const surface = document.createElement("canvas");
    surface.width = width;
    surface.height = height;
    const context = surface.getContext("2d");
    if (!context) {
      this.renderCanvas = visibleCanvas;
      this.canvasProxy = visibleCanvas;
      return;
    }

    this.renderCanvas = surface;
    this.canvasProxy = this.createCanvasProxy(visibleCanvas, surface);
  }

  syncRenderCanvasSizeFromGameCanvas() {
    if (!this.game?.canvas || !this.renderCanvas) {
      return;
    }
    const targetWidth = Math.max(1, Number(this.game.canvas.width) || this.renderCanvas.width);
    const targetHeight = Math.max(1, Number(this.game.canvas.height) || this.renderCanvas.height);
    if (this.renderCanvas.width !== targetWidth) {
      this.renderCanvas.width = targetWidth;
    }
    if (this.renderCanvas.height !== targetHeight) {
      this.renderCanvas.height = targetHeight;
    }
  }

  createCanvasProxy(visibleCanvas, surfaceCanvas) {
    const proxy = {
      getContext: (type, options) => surfaceCanvas.getContext(type, options),
      getBoundingClientRect: () => visibleCanvas.getBoundingClientRect(),
      setPointerCapture: (...args) => visibleCanvas.setPointerCapture?.(...args),
      releasePointerCapture: (...args) => visibleCanvas.releasePointerCapture?.(...args),
      requestFullscreen: (...args) => visibleCanvas.requestFullscreen?.(...args),
      addEventListener: (...args) => visibleCanvas.addEventListener?.(...args),
      removeEventListener: (...args) => visibleCanvas.removeEventListener?.(...args),
      dispatchEvent: (...args) => visibleCanvas.dispatchEvent?.(...args),
      setAttribute: (...args) => visibleCanvas.setAttribute?.(...args),
      focus: (...args) => visibleCanvas.focus?.(...args),
      blur: (...args) => visibleCanvas.blur?.(...args),
      get ownerDocument() {
        return visibleCanvas.ownerDocument;
      },
      get parentElement() {
        return visibleCanvas.parentElement;
      },
      get classList() {
        return visibleCanvas.classList;
      },
      get dataset() {
        return visibleCanvas.dataset;
      },
      get style() {
        return visibleCanvas.style;
      },
    };

    Object.defineProperty(proxy, "id", {
      configurable: true,
      enumerable: true,
      get() {
        return visibleCanvas.id;
      },
      set(value) {
        visibleCanvas.id = value;
      },
    });

    Object.defineProperty(proxy, "width", {
      configurable: true,
      enumerable: true,
      get() {
        return surfaceCanvas.width;
      },
      set(value) {
        const next = Math.max(1, Number(value) || surfaceCanvas.width);
        surfaceCanvas.width = next;
      },
    });

    Object.defineProperty(proxy, "height", {
      configurable: true,
      enumerable: true,
      get() {
        return surfaceCanvas.height;
      },
      set(value) {
        const next = Math.max(1, Number(value) || surfaceCanvas.height);
        surfaceCanvas.height = next;
      },
    });

    return proxy;
  }
}
