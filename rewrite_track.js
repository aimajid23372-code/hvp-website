const fs = require('fs');
let code = fs.readFileSync('api/track.js', 'utf-8');

const settingsFetch = \
    const { data: settingsData } = await supabase.from('settings').select('*');
    return res.status(200).json({ ok: true, stored: !insErr, settings: settingsData || [] });
  } catch (err) {\;

code = code.replace(/return res\\.status\\(200\\)\\.json\\(\\{ ok: true, stored: !insErr, error: insErr \\? insErr\\.message : null \\}\\);\\s*\\} catch \\(err\\) \\{/, settingsFetch);

fs.writeFileSync('api/track.js', code);

