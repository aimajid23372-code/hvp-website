const fs = require("fs");
let c = fs.readFileSync("api/my-access.js", "utf8");

// Change _course_content to lib
c = c.replace(/\.\/_course_content/g, "../lib/course_content");

// Add settings fetch
let oldCode = `    const rawOrders = orders.filter((o) => o.status === 'paid').map((o) => o.course);
    const courses = [...new Set(rawOrders.map(normalizeCourse))];
    
    // Return both the list of courses AND the secure content payload
    return res.status(200).json({ email, courses, wallet_balance, content: buildContentResponse(rawOrders) });
  } catch (err) {`;

let newCode = `    const rawOrders = orders.filter((o) => o.status === 'paid').map((o) => o.course);
    const courses = [...new Set(rawOrders.map(normalizeCourse))];
    
    const { data: sData } = await supabase.from('settings').select('*');
    let settings = {};
    if (sData) sData.forEach(s => settings[s.key] = s.value);
    
    const content = buildContentResponse(rawOrders);
    if (content.short && settings.drive_short) content.short.link = settings.drive_short;
    if (content.long && settings.drive_long) content.long.link = settings.drive_long;

    return res.status(200).json({ email, courses, wallet_balance, content, settings });
  } catch (err) {`;

c = c.replace(oldCode, newCode);
fs.writeFileSync("api/my-access.js", c);
