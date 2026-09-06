
fetch("https://hvb1.vercel.app/api/admin", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ adminPassword: "shuvo123", action: "search", query: "" })
}).then(r => r.json()).then(d => console.log(JSON.stringify(d, null, 2)));

