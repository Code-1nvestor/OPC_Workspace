import { describe, it, expect } from 'vitest';
import { ICON_MAP } from './iconMap';

describe('ICON_MAP', () => {
  it('包含所有内置图标键', () => {
    const keys = Object.keys(ICON_MAP);
    expect(keys.sort()).toEqual(['Bot', 'Code', 'FileText', 'Globe', 'Lightbulb', 'Sparkles'].sort());
  });

  it('每个值都是可渲染的 React 组件', () => {
    for (const [key, Comp] of Object.entries(ICON_MAP)) {
      // lucide-react 图标是 forwardRef 组件，typeof 为 object 而非 function
      expect(Comp, `icon "${key}" should be a valid component`).toBeTruthy();
      expect(Comp, `icon "${key}" should not be a plain string/number`).not.toBeTypeOf('string');
    }
  });

  it('未知图标键返回 undefined（调用方需兜底）', () => {
    expect(ICON_MAP['NotExist']).toBeUndefined();
  });
});
