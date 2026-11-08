import assert from 'node:assert/strict';
import {once} from 'node:events';
import {createPreviewServer} from './server.mjs';

// Check real HTTP responses under a project subpath, where leading-slash links
// would silently escape to username.github.io instead of username.github.io/repo/.
for (const base of ['/FarmSolver/', '/another-repository/']) {
  const server = createPreviewServer({base});
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  try {
    const origin = `http://127.0.0.1:${server.address().port}`;
    const entry = new URL(base, origin);
    const response = await fetch(entry);
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.match(html, /FarmSolver/);

    const pending = [...html.matchAll(/(?:src|href)="([^"]+)"/g)]
      .map(match => match[1])
      .filter(path => !/^(?:https?:|#)/.test(path));
    // These downloads are emitted by the catalog UI rather than the HTML shell.
    pending.push('packs/example.json', 'packs/schema.json', 'assets/potato.png');
    const visited = new Set();
    while (pending.length) {
      const path = pending.shift();
      assert.ok(!path.startsWith('/'), `Root-relative path breaks project Pages: ${path}`);
      const url = new URL(path, entry);
      assert.ok(url.pathname.startsWith(base), `Asset escaped project path: ${url}`);
      if (visited.has(url.href)) continue;
      visited.add(url.href);
      const asset = await fetch(url);
      assert.equal(asset.status, 200, `Missing Pages asset: ${url.pathname}`);
      if (url.pathname.endsWith('.mjs')) {
        assert.match(asset.headers.get('content-type'), /javascript/);
        const source = await asset.text();
        for (const match of source.matchAll(/\b(?:from\s*|import\s*)['"]([^'"]+)['"]/g)) {
          assert.ok(match[1].startsWith('.'), `Browser import must be relative: ${match[1]}`);
          const dependency = new URL(match[1], url);
          assert.ok(dependency.pathname.startsWith(base));
          pending.push(dependency.pathname.slice(base.length));
        }
      } else if (url.pathname.endsWith('.png')) {
        assert.equal(asset.headers.get('content-type'), 'image/png');
        assert.equal(new Uint8Array(await asset.arrayBuffer())[0], 137);
      } else if (url.pathname.endsWith('.json')) {
        assert.match(asset.headers.get('content-type'), /application\/json/);
        assert.ok(await asset.json());
      }
    }
    assert.equal((await fetch(origin + '/app.mjs')).status, 404);
    const redirect = await fetch(origin + base.slice(0, -1), {redirect: 'manual'});
    assert.equal(redirect.status, 308);
    assert.equal(redirect.headers.get('location'), base);
    console.log(`Pages OK: ${base} (${visited.size} assets and modules)`);
  } finally {
    const closed = once(server, 'close');
    server.close();
    server.closeAllConnections();
    await closed;
  }
}
