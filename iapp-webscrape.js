// IAPP Global Privacy Law and DPA Directory – extractor
// Usage: open https://iapp.org/resources/global-privacy-directory?all%5Bpage%5D=1
// in Chrome, open DevTools > Console, paste this whole script, press Enter.
// It walks pages 1–12 using the site's own pagination, expands every entry,
// and downloads iapp_privacy_directory.csv when done (about a minute).

(async () => {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const getList = () => [...document.querySelectorAll('main ol')]
    .find(o => o.children.length > 0 && o.querySelector('button'));
  const firstName = () => getList()?.children[0]?.innerText.split('\n')[0];

  const scrapePage = async () => {
    [...document.querySelectorAll('button')]
      .filter(b => /show details/i.test(b.textContent))
      .forEach(b => b.click());
    await sleep(1500);
    return [...getList().children].map(li => {
      const lines = li.innerText.split('\n').map(s => s.trim()).filter(Boolean)
        .filter(s => !/^(show|hide) details$/i.test(s));
      const links = [...li.querySelectorAll('a')]
        .map(a => ({ text: a.textContent.trim(), href: a.href }));
      const row = { name: lines[0], dpa: [], law: [] };
      let section = 'dpa';
      for (const line of lines.slice(1)) {
        if (/^data protection authorit/i.test(line)) { section = 'dpa'; continue; }
        if (/^privacy legislation/i.test(line)) { section = 'law'; continue; }
        const link = links.find(l => l.text === line);
        row[section].push({ text: line, href: link ? link.href : '' });
      }
      return row;
    });
  };

  const all = [];
  for (let p = 1; p <= 12; p++) {
    if (p > 1) {
      const before = firstName();
      const a = [...document.querySelectorAll('a')]
        .find(a => (a.getAttribute('href') || '').endsWith('page%5D=' + p));
      if (!a) { console.warn('No link to page', p); break; }
      a.click();
      for (let i = 0; i < 40 && firstName() === before; i++) await sleep(250);
      await sleep(500);
    }
    const rows = await scrapePage();
    all.push(...rows);
    console.log(`Page ${p}: ${rows.length} entries (first: ${rows[0].name})`);
  }

  const csvCell = v => '"' + String(v ?? '').replace(/"/g, '""') + '"';
  const join = (items, key) => items.map(i => i[key]).filter(Boolean).join(' | ');
  const header = ['Jurisdiction', 'DPA', 'DPA link', 'Legislation', 'Legislation links'];
  const csv = [header, ...all.map(r => [
    r.name, join(r.dpa, 'text'), join(r.dpa, 'href'),
    join(r.law, 'text'), join(r.law, 'href')
  ])].map(row => row.map(csvCell).join(',')).join('\n');

  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  Object.assign(document.createElement('a'),
    { href: url, download: 'iapp_privacy_directory.csv' }).click();
  console.log(`Done: ${all.length} jurisdictions saved to iapp_privacy_directory.csv`);
})();
