/**
 * returns a promise that resolves after ms.
 * @param ms wait ms.
 */
export const waitFor = (ms: number): Promise<void> => {
  return new Promise((r) => setTimeout(r, ms))
}
