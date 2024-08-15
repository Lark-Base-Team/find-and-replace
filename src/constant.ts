let step = 200;

export function getStep() {
  return step;
}

export function setStep(s: number) {
  if (typeof s === 'number' && s > 200) {
    step = s;
  }
}