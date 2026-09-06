const fs = require("fs");
let html = fs.readFileSync("admin.html", "utf-8");
html = html.replace(/<div class="nav-item" onclick="switchTab\('theme', this\)">.*?<\/div>/, "");
html = html.replace(/<!-- Theme Settings Tab -->[\s\S]*?<!-- Courses Tab -->/, "<!-- Courses Tab -->");
html = html.replace(/if\(tabId === 'theme'\) loadThemeSettings\(\);/, "");
html = html.replace(/\/\/ --- Theme Settings ---[\s\S]*?async function bulkAddStudents/, "async function bulkAddStudents");
fs.writeFileSync("admin.html", html);
console.log("removed theme tab");
