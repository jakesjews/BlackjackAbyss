export function createRuntimeRunHelpers({
  state,
  defaultPlayerStats,
  runtimeTestFlags,
  addLogFn,
  createRunFn,
  applyTestEconomyToNewRunFn,
  applyChipDeltaFn,
  updateProfileBestFn,
}) {
  function createRun() {
    return createRunFn(defaultPlayerStats);
  }

  function applyTestEconomyToNewRun(run) {
    applyTestEconomyToNewRunFn({ run, runtimeTestFlags, addLog: addLogFn });
  }

  function gainChips(amount) {
    applyChipDeltaFn({
      run: state.run,
      amount,
    });
  }

  function updateProfileBest(run) {
    updateProfileBestFn({
      profile: state.profile,
      run,
    });
  }

  return {
    createRun,
    applyTestEconomyToNewRun,
    gainChips,
    updateProfileBest,
  };
}
