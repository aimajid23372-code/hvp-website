const fs = require('fs');

// 1. Update hvb-track.js to apply dynamic CMS text
let track = fs.readFileSync('hvb-track.js', 'utf8');
let cmsCode =         // CMS Text Replacement
        document.querySelectorAll('[data-cms]').forEach(function(el) {
          let key = 'cms_' + el.getAttribute('data-cms');
          if (conf[key]) el.innerHTML = conf[key];
        });;
track = track.replace('if (conf.color_primary)', cmsCode + '\n        if (conf.color_primary)');
fs.writeFileSync('hvb-track.js', track);

// 2. Add some data-cms tags to index.html
let index = fs.readFileSync('index.html', 'utf8');
index = index.replace('<h1 class="hero-title">', '<h1 class="hero-title" data-cms="home_hero_title">');
index = index.replace('<p class="hero-sub">', '<p class="hero-sub" data-cms="home_hero_sub">');
fs.writeFileSync('index.html', index);

