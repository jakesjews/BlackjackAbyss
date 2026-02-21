export function createRuntimeUpdater({
  state,
  width,
  height,
  ambientOrbs,
  menuMotes,
  updateMusic,
  updateEncounterIntroTyping,
  saveRunSnapshot,
  onEncounterWin,
  finalizeRun,
  hidePassiveTooltip,
  triggerImpactBurstAt,
  playGruntSfx,
  applyImpactDamage,
  spawnSparkBurst,
  easeOutCubic,
  lerp,
  random = Math.random,
}) {
  function update(dt) {
    state.worldTime += dt;
    updateMusic(dt);

    for (const orb of ambientOrbs) {
      orb.y += orb.speed * dt;
      if (orb.y > height + 12) {
        orb.y = -12;
        orb.x = random() * width;
      }
    }

    if (state.mode === "menu") {
      for (const mote of menuMotes) {
        const speedScale = mote.speedScale || 1;
        const turbulence = Math.sin(state.worldTime * (1.6 + mote.swirl) + mote.phase) * (18 * mote.drift * speedScale);
        const flutter = Math.cos(state.worldTime * (2.3 + mote.swirl * 0.7) + mote.phase * 0.7) * (8 * mote.drift * speedScale);
        mote.x += (mote.vx * speedScale + turbulence) * dt;
        mote.y += (mote.vy * speedScale + flutter) * dt;
        if (mote.x < -48) {
          mote.x = width + 48;
        } else if (mote.x > width + 48) {
          mote.x = -48;
        }
        if (mote.y < -48) {
          mote.y = height + 48;
        } else if (mote.y > height + 48) {
          mote.y = -48;
        }
      }

      if (random() < dt * 1.8) {
        const dir = random() > 0.5 ? 1 : -1;
        const life = 1.2 + random() * 1.25;
        state.menuSparks.push({
          x: dir > 0 ? -24 : width + 24,
          y: height * (0.54 + random() * 0.42),
          vx: dir * (68 + random() * 126),
          vy: -38 - random() * 42,
          life,
          maxLife: life,
          size: 0.9 + random() * 1.35,
        });
      }
    } else {
      state.menuSparks = [];
    }

    state.floatingTexts = state.floatingTexts.filter((entry) => {
      entry.life -= dt;
      entry.y -= entry.vy * dt;
      return entry.life > 0;
    });

    state.cardBursts = state.cardBursts.filter((burst) => {
      burst.life -= dt;
      return burst.life > 0;
    });

    state.sparkParticles = state.sparkParticles.filter((spark) => {
      spark.life -= dt;
      spark.x += spark.vx * dt;
      spark.y += spark.vy * dt;
      spark.vx *= Math.max(0, 1 - dt * 3.5);
      spark.vy += 180 * dt;
      return spark.life > 0;
    });

    state.handTackles = state.handTackles.filter((tackle) => {
      tackle.elapsed += dt;
      const progress = Math.max(0, Math.min(1, tackle.elapsed / Math.max(0.01, tackle.duration)));
      const travel = Math.max(0, Math.min(1, progress / Math.max(0.01, tackle.impactAt)));
      const eased = easeOutCubic(travel);
      const currentX = lerp(tackle.fromX, tackle.toX, eased);
      const currentY = lerp(tackle.fromY, tackle.toY, eased) - Math.sin(travel * Math.PI) * 42 * (1 - travel * 0.35);
      if (!tackle.impacted && progress >= tackle.impactAt) {
        tackle.impacted = true;
        triggerImpactBurstAt(tackle.toX, tackle.toY, tackle.amount + 2, tackle.color);
        playGruntSfx();
        if (tackle.impactPayload) {
          applyImpactDamage(tackle.impactPayload);
        }
      } else if (!tackle.impacted && random() < dt * 24) {
        spawnSparkBurst(currentX, currentY, tackle.color, 2, 68);
      }
      return progress < 1;
    });

    state.menuSparks = state.menuSparks.filter((spark) => {
      spark.life -= dt;
      spark.x += spark.vx * dt;
      spark.y += spark.vy * dt;
      spark.vx *= Math.max(0, 1 - dt * 0.85);
      spark.vy -= 7 * dt;
      return spark.life > 0;
    });

    state.flashOverlays = state.flashOverlays.filter((flash) => {
      flash.life -= dt;
      return flash.life > 0;
    });

    if (state.screenShakeTime > 0) {
      state.screenShakeTime = Math.max(0, state.screenShakeTime - dt);
    }
    if (state.screenShakePower > 0) {
      state.screenShakePower = Math.max(0, state.screenShakePower - dt * 30);
    }
    if (state.screenShakeTime <= 0) {
      state.screenShakeDuration = 0;
    }

    if (state.announcementTimer > 0) {
      state.announcementTimer = Math.max(0, state.announcementTimer - dt);
      if (state.announcementTimer <= 0) {
        state.announcement = "";
        state.announcementDuration = 0;
      }
    }

    if (state.mode === "playing" && state.encounter) {
      updateEncounterIntroTyping(state.encounter, dt);
    }

    if (state.run) {
      state.run.log = state.run.log.filter((entry) => {
        entry.ttl -= dt;
        return entry.ttl > 0;
      });

      if (state.mode === "playing" || state.mode === "reward" || state.mode === "shop") {
        state.autosaveTimer += dt;
        if (state.autosaveTimer >= 0.75) {
          state.autosaveTimer = 0;
          saveRunSnapshot();
        }
      }
    }

    if (state.pendingTransition) {
      if (!state.pendingTransition.waiting) {
        state.pendingTransition.timer -= dt;
      }
      if (!state.pendingTransition.waiting && state.pendingTransition.timer <= 0) {
        const transition = state.pendingTransition;
        state.pendingTransition = null;
        if (transition.target === "enemy") {
          onEncounterWin();
        } else if (transition.target === "player" && state.encounter && state.run) {
          finalizeRun("defeat");
          state.mode = "gameover";
          state.encounter.phase = "done";
        }
      }
    }

    if (state.passiveTooltipTimer > 0) {
      state.passiveTooltipTimer = Math.max(0, state.passiveTooltipTimer - dt);
      if (state.passiveTooltipTimer <= 0) {
        hidePassiveTooltip();
      }
    }

    if (state.mode === "playing" && state.encounter && state.encounter.phase === "resolve" && !state.pendingTransition) {
      if (state.encounter.resolveTimer > 0) {
        state.encounter.resolveTimer = Math.max(0, state.encounter.resolveTimer - dt);
      }
      if (state.encounter.resolveTimer <= 0 && state.handTackles.length === 0 && !state.encounter.nextDealPrompted) {
        state.encounter.nextDealPrompted = true;
      }
    }
  }

  return {
    update,
  };
}
