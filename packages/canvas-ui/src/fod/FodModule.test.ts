import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';

describe('embedded FOD UI',()=>{
  it('uses the canonical graph surface with magnetic and predictive persistence hooks',()=>{
    const source=readFileSync(new URL('./FodModule.tsx',import.meta.url),'utf8');
    expect(source).toContain('FrnlEditableNodeGraph');
    expect(source).toContain('onMagneticTraceSolidify');
    expect(source).toContain('onPredictiveSolidify');
    expect(source).toContain('onPredictiveSolidifyAll');
  });
});
