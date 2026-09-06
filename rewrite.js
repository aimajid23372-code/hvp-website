const fs = require("fs");
let html = fs.readFileSync("admin.html", "utf-8");
html = html.replace(/\/api\/admin-orders/g, "/api/admin");
html = html.replace(/\/api\/admin-withdrawals/g, "/api/admin");
html = html.replace(/\/api\/admin-settings/g, "/api/admin");
html = html.replace(/\/api\/admin-analytics/g, "/api/admin");
html = html.replace(/action:\s*'list'/g, "action: 'withdrawList'");
html = html.replace(/action:\s*'approve'/g, "action: 'withdrawApprove'");
html = html.replace(/action:\s*'get'/g, "action: 'settingsGet'");
html = html.replace(/action:\s*'save'/g, "action: 'settingsSave'");

const coursesTab = `<!-- Courses Tab -->
    <div id="tab-courses" class="tab-pane">
      <div class="card">
        <h3>Migrate Old Students</h3>
        <p style="color:var(--muted); font-size:0.9em; margin-bottom:15px;">Format: Name, Phone Number, Course Name (bundle or short). One per line.</p>
        <textarea id="bulkStudents" rows="5" placeholder="Abdur Rahman, 01711223344, bundle\nKamrul Hasan, 01811223344, short"></textarea>
        <button class="btn" onclick="bulkAddStudents()" style="margin-top:10px;">Migrate Students</button>
        <div id="bulkMsg" style="margin-top:10px; color:var(--cyan);"></div>
      </div>
    </div>`;

html = html.replace(/<!-- Courses Tab -->[\s\S]*?<\/div>\s*<\/div>/, coursesTab);

const bulkAddFunc = `async function bulkAddStudents() {
    const text = document.getElementById("bulkStudents").value;
    document.getElementById("bulkMsg").innerText = "Adding...";
    try {
      const response = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminPassword: PASS, action: "bulkAdd", students: text })
      });
      const data = await response.json();
      document.getElementById("bulkMsg").innerText = data.result || data.error;
    } catch(e) { document.getElementById("bulkMsg").innerText = "Error"; }
  }
</script>`;

html = html.replace(/<\/script>/, bulkAddFunc);
fs.writeFileSync("admin.html", html);
console.log("done");
