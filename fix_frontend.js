const fs = require("fs");

["course-bundle.html", "course-short.html"].forEach(file => {
  let content = fs.readFileSync(file, "utf8");

  // Fix applyPromo
  content = content.replace(/async function applyPromo\(\)[\s\S]*?function copyPrompt/m, `async function applyPromo(){
    const code = document.getElementById("promoInput").value.trim().toUpperCase();
    const msg = document.getElementById("promoMsg");
    if(!code) return;
    msg.textContent = "Checking...";
    msg.className = "promo-msg";
    try {
      const res = await fetch("/api/create-invoice", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({action:"checkPromo", promoCode:code})});
      const d = await res.json();
      if(d.valid){
        const discount = d.discount;
        let baseStr = document.getElementById("modalPrice").getAttribute("data-base");
        if (!baseStr) {
          baseStr = document.getElementById("modalPrice").innerText.replace(/[^0-9]/g, "");
          if(!baseStr) baseStr = BASE_PRICE;
          document.getElementById("modalPrice").setAttribute("data-base", baseStr);
        }
        let currentBase = parseInt(baseStr) || BASE_PRICE;
        const newPrice = Math.round(currentBase - (currentBase*discount/100));
        document.getElementById("modalPrice").textContent = toBn(newPrice) + " ?";
        msg.textContent = discount + "% discount applied! Price will update at checkout.";
        msg.className = "promo-msg success";
      } else {
        msg.textContent = "? Invalid promo code";
        msg.className = "promo-msg error";
      }
    } catch(e){
      msg.textContent = "Error checking code";
      msg.className = "promo-msg error";
    }
  }

  function copyPrompt`);

  // Add pageshow listener to reset button
  if (!content.includes("pageshow")) {
    content = content.replace("window.addEventListener('DOMContentLoaded', function(){", `window.addEventListener("pageshow", function(e){
      if(e.persisted){
        const btn = document.getElementById("submitBtn");
        if(btn){ btn.disabled = false; btn.classList.remove("hvb-busy"); btn.textContent = "????? ??? (???????) ?"; }
      }
    });\n    window.addEventListener('DOMContentLoaded', function(){`);
  }

  fs.writeFileSync(file, content);
});

