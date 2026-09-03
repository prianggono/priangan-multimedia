// Canonical Supabase connection for Priangan Multimedia.
// This file is the single source of truth for the browser app.
// Use only the publishable/anon key. Never put service_role here.
window.PRIANGAN_CONFIG = Object.freeze({
  SUPABASE_URL: 'https://iwpnectwkrchjirxakbt.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_kk0Lr5jYDQUN7r-Y-dkN2w_FQ5RzOwu'
});

// Remove stale local connection overrides so GitHub and Supabase stay aligned.
try {
  const canonicalUrl = window.PRIANGAN_CONFIG.SUPABASE_URL;
  const storedUrl = localStorage.getItem('SUPABASE_URL');
  if (storedUrl && storedUrl.trim() !== canonicalUrl) {
    localStorage.removeItem('SUPABASE_URL');
    localStorage.removeItem('SUPABASE_ANON_KEY');
  }
} catch (error) {
  console.warn('Supabase config storage check skipped:', error);
}
