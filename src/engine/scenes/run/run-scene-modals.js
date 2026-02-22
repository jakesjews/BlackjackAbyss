const RUN_MODAL_IDS = Object.freeze(["logs", "relics"]);

export function setRunSceneLogsScroll(scene, next) {
  if (!scene) {
    return;
  }
  const max = Math.max(0, Number(scene.logsScrollMax) || 0);
  const clamped = Math.min(max, Math.max(0, Math.round(Number(next) || 0)));
  scene.logsScrollIndex = clamped;
  scene.logsPinnedToBottom = clamped >= max;
}

export function isRunSceneModalOpen(scene, modalId) {
  if (!scene) {
    return false;
  }
  if (modalId === "logs") {
    return Boolean(scene.logsModalOpen);
  }
  if (modalId === "relics") {
    return Boolean(scene.relicModalOpen);
  }
  return false;
}

export function getRunSceneModalOpenOrder(scene) {
  if (!scene) {
    return [];
  }
  const ordered = Array.isArray(scene.modalOpenOrder)
    ? scene.modalOpenOrder.filter((id) => RUN_MODAL_IDS.includes(id))
    : [];
  if (scene.logsModalOpen && !ordered.includes("logs")) {
    ordered.push("logs");
  }
  if (scene.relicModalOpen && !ordered.includes("relics")) {
    ordered.push("relics");
  }
  return ordered.filter((id) => isRunSceneModalOpen(scene, id));
}

export function setRunSceneModalOpen(scene, modalId, isOpen) {
  if (!scene || !RUN_MODAL_IDS.includes(modalId)) {
    return;
  }
  const next = Boolean(isOpen);
  if (modalId === "logs") {
    scene.logsModalOpen = next;
  } else if (modalId === "relics") {
    scene.relicModalOpen = next;
  }
  const currentOrder = getRunSceneModalOpenOrder(scene).filter((id) => id !== modalId);
  if (next) {
    currentOrder.push(modalId);
  }
  scene.modalOpenOrder = currentOrder;
}

export function toggleRunSceneModal(scene, modalId) {
  if (!scene || !RUN_MODAL_IDS.includes(modalId)) {
    return;
  }
  if (isRunSceneModalOpen(scene, modalId)) {
    const openOrder = getRunSceneModalOpenOrder(scene);
    const topId = openOrder[openOrder.length - 1];
    if (openOrder.length > 1 && topId !== modalId) {
      setRunSceneModalOpen(scene, modalId, true);
      return;
    }
    setRunSceneModalOpen(scene, modalId, false);
    return;
  }
  setRunSceneModalOpen(scene, modalId, true);
}

export function closeRunSceneTopModal(scene) {
  const openOrder = getRunSceneModalOpenOrder(scene);
  const topModalId = openOrder[openOrder.length - 1];
  if (!topModalId) {
    return false;
  }
  setRunSceneModalOpen(scene, topModalId, false);
  return true;
}

export function closeRunSceneModals(scene) {
  setRunSceneModalOpen(scene, "logs", false);
  setRunSceneModalOpen(scene, "relics", false);
}

export function syncRunSceneModalBlocker(scene, width, height) {
  if (!scene?.modalBlocker) {
    return;
  }
  const modalOpen = Boolean(scene.logsModalOpen || scene.relicModalOpen);
  scene.modalBlocker.setSize(width, height);
  scene.modalBlocker.setVisible(modalOpen);
  scene.modalBlocker.active = modalOpen;
}
