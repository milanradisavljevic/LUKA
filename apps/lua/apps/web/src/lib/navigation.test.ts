import { describe, expect, it } from 'vitest';
import { NATASCHA_VIEWS, visibleNavTargets } from './navigation';

describe('visibleNavTargets', () => {
  it('blendet im Generator-only-Pilot alle NATASCHA-Ziele aus', () => {
    const views = visibleNavTargets(false).map((target) => target.view);
    for (const view of NATASCHA_VIEWS) expect(views).not.toContain(view);
  });

  it('stellt die NATASCHA-Ziele für einen späteren Rollout wieder bereit', () => {
    const views = visibleNavTargets(true).map((target) => target.view);
    for (const view of NATASCHA_VIEWS) expect(views).toContain(view);
  });
});
