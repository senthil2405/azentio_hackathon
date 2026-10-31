import { DIM, predict, type Example } from "./schema.ts";

/** Local training: a few epochs of SGD for logistic regression, starting from the global parameters. */
export function trainLocal(global: number[], data: Example[], { epochs = 5, lr = 0.1, seed = 1 } = {}): number[] {
  const w = [...global];
  let s = seed;
  const order = data.map((_, i) => i);
  for (let e = 0; e < epochs; e++) {
    // deterministic shuffle
    for (let i = order.length - 1; i > 0; i--) {
      s = (s * 1103515245 + 12345) % 2147483648;
      const j = s % (i + 1);
      [order[i], order[j]] = [order[j], order[i]];
    }
    for (const i of order) {
      const { x, y } = data[i];
      const g = predict(w, x) - y;
      for (let k = 0; k < DIM - 1; k++) w[k] -= lr * g * x[k];
      w[DIM - 1] -= lr * g;
    }
  }
  return w;
}

export function evaluate(params: number[], data: Example[]) {
  let loss = 0, correct = 0, tp = 0, fp = 0, fn = 0;
  for (const { x, y } of data) {
    const p = Math.min(1 - 1e-9, Math.max(1e-9, predict(params, x)));
    loss += -(y * Math.log(p) + (1 - y) * Math.log(1 - p));
    const yhat = p >= 0.5 ? 1 : 0;
    if (yhat === y) correct++;
    if (yhat === 1 && y === 1) tp++;
    if (yhat === 1 && y === 0) fp++;
    if (yhat === 0 && y === 1) fn++;
  }
  return { logLoss: +(loss / data.length).toFixed(4), accuracy: +(correct / data.length).toFixed(4), recall: +(tp / Math.max(1, tp + fn)).toFixed(4), precision: +(tp / Math.max(1, tp + fp)).toFixed(4) };
}

export const l2 = (v: number[]) => Math.sqrt(v.reduce((s, x) => s + x * x, 0));
