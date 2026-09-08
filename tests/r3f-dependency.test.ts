import { describe, it, expect } from 'vitest';

describe('Three & React Three Fiber dependency check', () => {
  it('imports three and @react-three/fiber successfully', async () => {
    const three = await import('three');
    expect(three.Vector3).toBeDefined();
    expect(three.Color).toBeDefined();

    const r3f = await import('@react-three/fiber');
    expect(r3f.Canvas).toBeDefined();
  });
});
