const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({path: ".env.local"});
// If no .env.local, we can grep the keys from api/admin.js or just read the Vercel env... wait.

