const fs = require('fs');
let code = fs.readFileSync('api/admin.js', 'utf-8');

code = code.replace(
  /if \\(!adminPassword \\|\\| adminPassword !== process\\.env\\.ADMIN_PASSWORD\\) \\{\\s*return res\\.status\\(401\\)\\.json\\(\\{ error: 'Unauthorized' \\}\\);\\s*\\}/,
  \if (action !== 'settingsGet' && (!adminPassword || adminPassword !== process.env.ADMIN_PASSWORD)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }\
);

fs.writeFileSync('api/admin.js', code);

