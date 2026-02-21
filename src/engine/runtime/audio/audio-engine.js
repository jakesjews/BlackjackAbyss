export function semitoneToFreq(base, semitoneOffset) {
  return base * 2 ** (semitoneOffset / 12);
}
