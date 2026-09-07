const fs = require("fs");
let c = fs.readFileSync("admin.html", "utf8");

// Add colors to Settings UI
c = c.replace(`<div class="input-group">
          <label>Long + Short Course Price (Tk)</label>`, `<div class="input-group">
          <label>Primary Brand Color (Hex)</label>
          <input type="color" id="set_color_primary" style="padding:5px; height:50px;">
        </div>
        <div class="input-group">
          <label>Secondary Brand Color (Hex)</label>
          <input type="color" id="set_color_secondary" style="padding:5px; height:50px;">
        </div>
        <div class="input-group">
          <label>Long + Short Course Price (Tk)</label>`);

// Add the keys to JS
c = c.replace(`const keys = ['price_bundle', 'price_short', 'messenger_link', 'group_link', 'drive_long', 'drive_short'];`, `const keys = ['price_bundle', 'price_short', 'messenger_link', 'group_link', 'drive_long', 'drive_short', 'color_primary', 'color_secondary'];`);

// Add deletePromo function
if(!c.includes("deletePromo(")) {
  c = c.replace("</script>\n</body>", `
  async function deletePromo(code) {
    if(!confirm("Delete promo " + code + "?")) return;
    try {
      await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminPassword: PASS, action: "promoDelete", code })
      });
      loadPromos();
    } catch(e) { alert("Error deleting promo"); }
  }
</script>\n</body>`);
}

// Add Delete Promo button
c = c.replace(/<button class="btn btn-outline" style="padding:6px 12px; font-size:0.8em;" onclick="togglePromo\('([^']+)', ([^)]+)\)">Toggle<\/button>/g, `<button class="btn btn-outline" style="padding:6px 12px; font-size:0.8em; margin-bottom:5px;" onclick="togglePromo('$1', $2)">Toggle</button><br><button class="btn" style="background:var(--danger); padding:6px 12px; font-size:0.8em;" onclick="deletePromo('$1')">Delete</button>`);

fs.writeFileSync("admin.html", c);
