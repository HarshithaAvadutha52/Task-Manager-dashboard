const fs = require('fs');
let content = fs.readFileSync('src/lib/supabase.ts', 'utf8');

// Add the guest check function
content = content.replace(
  'export const db = {',
  'const isGuestModeActive = () => typeof window !== "undefined" && (JSON.parse(localStorage.getItem("tf_profile") || "{}")?.id === "guest-user");\n\nexport const db = {'
);

// Replace all instances of the Supabase check
content = content.replace(
  /if \(isSupabaseConfigured && supabase\)/g,
  'if (isSupabaseConfigured && supabase && !isGuestModeActive())'
);

fs.writeFileSync('src/lib/supabase.ts', content);
console.log('Patched supabase.ts successfully!');
