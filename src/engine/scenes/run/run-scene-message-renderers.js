import Phaser from "phaser";
import { createGradientButton, setGradientButtonSize } from "../ui/gradient-button.js";
import { RUN_MODAL_BASE_DEPTH, RUN_MODAL_CONTENT_OFFSET } from "./run-scene-config.js";

export function drawRunSceneMessages(
  scene,
  {
    snapshot,
    width,
    height,
    layout = null,
    deferResolutionUi = false,
    styleSet,
    applyButtonStyle,
  }
) {
  const intro = snapshot?.intro || {};
  const enemy = snapshot?.enemy || {};
  const introTarget = intro.active ? 1 : 0;
  const introGraphics = scene.overlayGraphics || scene.graphics;
  scene.introOverlayProgress = introTarget;

  if (scene.introOverlayProgress > 0.02) {
    const overlayAlpha = 0.82 * scene.introOverlayProgress;
    introGraphics.fillStyle(0x000000, overlayAlpha);
    introGraphics.fillRect(0, 0, width, height);
  }

  if (intro.active || scene.introOverlayProgress > 0.02) {
    const compact = scene.isCompactLayout(width);
    const introContentDepth = RUN_MODAL_BASE_DEPTH + RUN_MODAL_CONTENT_OFFSET + 6;
    const introButtonDepth = introContentDepth + 8;
    const introScale = 1.725;
    const baseModalW = compact
      ? Math.max(320, Math.min(width - 22, Math.round(width * 0.94)))
      : Math.max(760, Math.min(1080, Math.round(width * 0.86)));
    const baseModalH = compact
      ? Math.max(190, Math.min(262, Math.round(height * 0.33)))
      : Math.max(238, Math.min(336, Math.round(height * 0.41)));
    const modalW = compact
      ? Math.max(208, Math.min(width - 20, Math.round(baseModalW * 0.5 * introScale)))
      : Math.max(384, Math.min(width - 28, Math.round(baseModalW * 0.5 * introScale)));
    const modalH = compact
      ? Math.max(126, Math.min(height - 20, Math.round(baseModalH * 0.5 * introScale)))
      : Math.max(170, Math.min(height - 24, Math.round(baseModalH * 0.5 * introScale)));
    const eased = Phaser.Math.Easing.Sine.InOut(scene.introOverlayProgress);
    const x = width * 0.5 - modalW * 0.5;
    const y = height * 0.5 - modalH * 0.5 + (1 - eased) * 20;
    const alpha = Math.min(1, scene.introOverlayProgress + 0.02);

    introGraphics.fillStyle(0x050b14, 0.48 * alpha);
    introGraphics.fillRoundedRect(x + 2, y + 4, modalW, modalH, compact ? 14 : 20);
    introGraphics.fillGradientStyle(0x1b2f47, 0x1c324a, 0x0f1f33, 0x102033, 0.96 * alpha, 0.96 * alpha, 0.96 * alpha, 0.96 * alpha);
    introGraphics.fillRoundedRect(x, y, modalW, modalH, compact ? 12 : 18);
    introGraphics.lineStyle(2.2, 0x7097bb, 0.56 * alpha);
    introGraphics.strokeRoundedRect(x, y, modalW, modalH, compact ? 12 : 18);
    introGraphics.lineStyle(1.3, 0xc9def1, 0.2 * alpha);
    introGraphics.strokeRoundedRect(x + 4, y + 4, modalW - 8, modalH - 8, compact ? 8 : 12);

    const modalPad = compact ? 10 : 14;
    const avatarOuter = compact
      ? Math.max(56, Math.min(72, modalH - modalPad * 2))
      : Math.max(90, Math.min(122, modalH - modalPad * 2));
    const avatarOuterX = x + modalPad;
    const avatarOuterY = y + modalPad;
    introGraphics.fillStyle(0x223953, 0.96 * alpha);
    introGraphics.fillRoundedRect(avatarOuterX, avatarOuterY, avatarOuter, avatarOuter, compact ? 10 : 14);
    introGraphics.lineStyle(2.2, 0x6d95ba, 0.68 * alpha);
    introGraphics.strokeRoundedRect(avatarOuterX, avatarOuterY, avatarOuter, avatarOuter, compact ? 10 : 14);

    const avatarPad = compact ? 5 : 7;
    const avatarInnerX = avatarOuterX + avatarPad;
    const avatarInnerY = avatarOuterY + avatarPad;
    const avatarInnerW = avatarOuter - avatarPad * 2;
    const avatarInnerH = avatarOuter - avatarPad * 2;

    if (scene.introPortraitMaskShape) {
      scene.introPortraitMaskShape.clear();
      scene.introPortraitMaskShape.fillStyle(0xffffff, 1);
      scene.introPortraitMaskShape.fillRoundedRect(avatarInnerX, avatarInnerY, avatarInnerW, avatarInnerH, compact ? 8 : 10);
    }

    const introAvatarTexture = scene.resolveEnemyAvatarTexture(enemy);
    if (introAvatarTexture && scene.introPortrait) {
      scene.introPortrait.setTexture(introAvatarTexture);
      const cover = scene.coverSizeForTexture(introAvatarTexture, avatarInnerW, avatarInnerH);
      scene.introPortrait.setDisplaySize(cover.width, cover.height);
      scene.introPortrait.setPosition(avatarOuterX + avatarOuter * 0.5, avatarOuterY + avatarOuter * 0.5);
      scene.introPortrait.setDepth(introContentDepth + 2);
      scene.introPortrait.setVisible(true);
      scene.introPortrait.setAlpha(alpha);
      const fallbackNode = scene.textNodes.get("intro-avatar-fallback");
      if (fallbackNode) {
        fallbackNode.setVisible(false);
      }
    } else {
      if (scene.introPortrait) {
        scene.introPortrait.setVisible(false);
      }
      introGraphics.fillStyle(0x1a3146, 0.94 * alpha);
      introGraphics.fillRoundedRect(avatarInnerX, avatarInnerY, avatarInnerW, avatarInnerH, compact ? 8 : 10);
      const fallbackNode = scene.drawText("intro-avatar-fallback", "?", avatarOuterX + avatarOuter * 0.5, avatarOuterY + avatarOuter * 0.56, {
        fontFamily: '"Chakra Petch", "Sora", sans-serif',
        fontSize: compact ? "36px" : "46px",
        color: "#bed6eb",
      });
      fallbackNode.setDepth(introContentDepth + 2);
    }

    const textX = avatarOuterX + avatarOuter + (compact ? 8 : 14);
    const textW = Math.max(70, modalW - (textX - x) - (compact ? 10 : 16));
    const title = String(enemy.name || "ENEMY").toUpperCase();
    const encounterType = scene.getEncounterTypeLabel(enemy.type);
    const bodyText = intro.text || "";
    const typeCursor = !intro.ready && Math.floor(scene.time.now / 220) % 2 === 0 ? "|" : "";
    const titleSize = Math.round((compact ? 10 : 24) * introScale);
    const typeSize = Math.round((compact ? 7 : 12) * introScale);
    const bodySize = Math.round((compact ? 10 : 13) * introScale);
    const textTopY = y + modalPad + (compact ? 8 : 12);
    const titleY = textTopY;
    const typeY = titleY + Math.round(titleSize * 0.92) + (compact ? 6 : 10);
    const bodyY = typeY + Math.round(typeSize * 1.04) + (compact ? 8 : 12);

    if (intro.active) {
      const titleNode = scene.drawText("intro-title", title, textX, titleY, {
        fontFamily: '"Chakra Petch", "Sora", sans-serif',
        fontSize: `${titleSize}px`,
        color: "#84b7f8",
        fontStyle: "700",
      }, { x: 0, y: 0.5 });
      titleNode.setDepth(introContentDepth + 2);
      const typeNode = scene.drawText("intro-type", encounterType, textX, typeY, {
        fontFamily: '"Chakra Petch", "Sora", sans-serif',
        fontSize: `${typeSize}px`,
        color: "#9ab5d2",
        fontStyle: "600",
      }, { x: 0, y: 0.5 });
      typeNode.setDepth(introContentDepth + 2);
      const bodyNode = scene.drawText("intro-body", `${bodyText}${typeCursor}`, textX, bodyY, {
        fontFamily: '"Sora", "Segoe UI", sans-serif',
        fontSize: `${bodySize}px`,
        color: "#d8e5f4",
        align: "left",
        lineSpacing: compact ? 4 : 6,
        wordWrap: { width: textW },
      }, { x: 0, y: 0 });
      bodyNode.setDepth(introContentDepth + 2);
    }

    if (!scene.introCtaButton) {
      scene.introCtaButton = createGradientButton(scene, {
        id: "intro-cta",
        label: "LET'S GO!",
        styleSet,
        onPress: () => {
          if (scene.lastSnapshot?.intro?.active && scene.lastSnapshot?.intro?.ready) {
            scene.invokeAction("confirmIntro");
          }
        },
        width: 196,
        height: 44,
        fontSize: 18,
        hoverScale: 1,
        pressedScale: 0.98,
      });
    }
    scene.introCtaButton.container.setDepth(introButtonDepth);
    const ctaW = compact ? 118 : 170;
    const ctaH = compact ? 32 : 42;
    const ctaX = x + modalW - modalPad - ctaW * 0.5;
    const ctaY = y + modalH - modalPad - ctaH * 0.5;
    setGradientButtonSize(scene.introCtaButton, ctaW, ctaH);
    scene.introCtaButton.container.setPosition(ctaX, ctaY);
    scene.introCtaButton.text.setFontSize(compact ? 12 : 16);
    scene.introCtaButton.text.setText("LET'S GO!");
    scene.introCtaButton.enabled = Boolean(intro.active && intro.ready);
    applyButtonStyle(scene.introCtaButton, scene.introCtaButton.enabled ? "idle" : "disabled");
    scene.introCtaButton.container.setVisible(Boolean(intro.active));
    return;
  }

  if (scene.introPortrait) {
    scene.introPortrait.setVisible(false);
  }
  const introFallback = scene.textNodes.get("intro-avatar-fallback");
  if (introFallback) {
    introFallback.setVisible(false);
  }
  if (scene.introCtaButton) {
    scene.introCtaButton.container.setVisible(false);
  }

  if (deferResolutionUi) {
    scene.lastResultSignature = "";
    return;
  }
  const transitionState = scene.getTransitionState(snapshot);
  const enemyDefeatActive = Boolean(transitionState && transitionState.target === "enemy" && !transitionState.waiting);
  const resultText = enemyDefeatActive ? "Defeated Opponent" : snapshot?.resultText || snapshot?.announcement || "";
  if (!resultText) {
    scene.lastResultSignature = "";
    return;
  }

  const tone = enemyDefeatActive ? "win" : snapshot?.resultTone || "neutral";
  const panelY = Math.round(layout?.messageY || height * 0.507);
  const maxPanelW = Math.round(layout?.messagePanelW || Phaser.Math.Clamp(Math.round(width * 0.44), 500, 640));
  const panelH = Math.round(layout?.messagePanelH || 60);
  const compact = scene.isCompactLayout(width);
  const minPanelW = compact ? 220 : 300;
  const panelPadX = compact ? 20 : 26;
  const panelPadY = compact ? 12 : 14;
  let messageFontSize = compact ? 16 : 20;
  const minMessageFontSize = compact ? 13 : 15;
  const measureStyle = {
    fontFamily: '"Cinzel", "Chakra Petch", "Sora", sans-serif',
    fontSize: `${messageFontSize}px`,
    color: "#e8e2d2",
    fontStyle: "700",
  };
  const measureNode = scene.drawText("run-result-measure", resultText, -4000, -4000, measureStyle, { x: 0, y: 0 });
  while (measureNode.width > maxPanelW - panelPadX * 2 && messageFontSize > minMessageFontSize) {
    messageFontSize -= 1;
    measureNode.setFontSize(messageFontSize);
  }
  const panelW = Phaser.Math.Clamp(
    Math.round(measureNode.width + panelPadX * 2),
    minPanelW,
    maxPanelW
  );
  measureNode.setVisible(false);
  const toneFill =
    tone === "good" || tone === "win"
      ? 0x184b3d
      : tone === "bad" || tone === "loss"
        ? 0x4a2323
        : 0x3f3321;
  const toneStroke =
    tone === "good" || tone === "win"
      ? 0x76cfad
      : tone === "bad" || tone === "loss"
        ? 0xd98b8a
        : 0xd8b780;
  scene.graphics.fillStyle(toneFill, 0.95);
  scene.graphics.fillRoundedRect(width * 0.5 - panelW * 0.5, panelY - panelH * 0.5, panelW, panelH, 16);
  scene.graphics.lineStyle(2.2, toneStroke, 0.85);
  scene.graphics.strokeRoundedRect(width * 0.5 - panelW * 0.5, panelY - panelH * 0.5, panelW, panelH, 16);
  const node = scene.drawText("run-result", resultText, width * 0.5, panelY + Math.round(panelPadY * 0.04), {
    fontFamily: '"Cinzel", "Chakra Petch", "Sora", sans-serif',
    fontSize: `${messageFontSize}px`,
    color: "#e8e2d2",
    fontStyle: "700",
    align: "center",
  });

  const signature = `${tone}|${resultText}`;
  if (signature !== scene.lastResultSignature) {
    scene.lastResultSignature = signature;
    scene.animateResultMessage(node, tone);
  }
}
