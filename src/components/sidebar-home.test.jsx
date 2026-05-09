import fs from 'fs';
import path from 'path';

describe('sidebar-home responsive desktop layout', () => {
  const css = fs.readFileSync(
    path.join(process.cwd(), 'src/components/sidebar-home.css'),
    'utf8'
  );

  test('keeps the large-screen sidebar inside shorter viewports', () => {
    expect(css).toMatch(/max-height:\s*calc\(100(?:dvh|vh)\s*-\s*2rem\)/);
    expect(css).toMatch(/overflow-y:\s*auto/);
  });
});
