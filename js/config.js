// Canonical Supabase connection for Priangan Multimedia.
// This file is the single source of truth for the browser app.
// Use only the publishable/anon key. Never put service_role here.
window.PRIANGAN_CONFIG = Object.freeze({
  SUPABASE_URL: 'https://iwpnectwkrchjirxakbt.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_kk0Lr5jYDQUN7r-Y-dkN2w_FQ5RzOwu'
});

// Remove stale local connection overrides so GitHub and Supabase stay aligned.
try {
  const { SUPABASE_URL, SUPABASE_ANON_KEY } = window.PRIANGAN_CONFIG;
  const storedUrl = localStorage.getItem('SUPABASE_URL');
  const storedKey = localStorage.getItem('SUPABASE_ANON_KEY');
  if ((storedUrl && storedUrl.trim() !== SUPABASE_URL) ||
      (storedKey && storedKey.trim() !== SUPABASE_ANON_KEY)) {
    localStorage.removeItem('SUPABASE_URL');
    localStorage.removeItem('SUPABASE_ANON_KEY');
  }
} catch (error) {
  console.warn('Supabase config storage check skipped:', error);
}
