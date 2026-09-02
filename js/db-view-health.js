/* Priangan Multimedia — database view health check
 * Read-only diagnostics for the application-facing Supabase views.
 * This does not modify data and does not replace the existing CRUD layer.
 */
(function(){
  'use strict';

  const REQUIRED_VIEWS = [
    'v_client_app',
    'v_daftar_penawaran_app',
    'v_dashboard_keuangan',
    'v_item_master_picker',
    'v_keuangan_app',
    'v_master_harga_app',
    'v_pembayaran_app',
    'v_penawaran_app',
    'v_penawaran_detail_app'
  ];

  const S = v => String(v ?? '').trim();

  function getDb(){
    try {
      if (typeof db !== 'undefined' && db) return db;
    } catch (_) {}
    const cfg = window.PRIANGAN_CONFIG || {};
    const url = S(localStorage.getItem('SUPABASE_URL') || cfg.SUPABASE_URL);
    const key = S(localStorage.getItem('SUPABASE_ANON_KEY') || cfg.SUPABASE_ANON_KEY);
    return url && key && window.supabase?.createClient
      ? window.supabase.createClient(url, key)
      : null;
  }

  async function checkViews(){
    const client = getDb();
    if (!client) {
      window.PM_DB_VIEW_HEALTH = {ok:false, checked:0, total:REQUIRED_VIEWS.length, error:'Supabase belum terhubung.'};
      return window.PM_DB_VIEW_HEALTH;
    }

    const results = await Promise.all(REQUIRED_VIEWS.map(async view => {
      const result = await client.from(view).select('*', { count:'exact', head:true });
      return { view, ok: !result.error, error: result.error?.message || null };
    }));

    const failed = results.filter(r => !r.ok);
    window.PM_DB_VIEW_HEALTH = {
      ok: failed.length === 0,
      checked: results.length - failed.length,
      total: results.length,
      failed: failed.map(r => r.view),
      results,
      checked_at: new Date().toISOString()
    };

    console.info('[Priangan] DB view health:', window.PM_DB_VIEW_HEALTH);
    return window.PM_DB_VIEW_HEALTH;
  }

  window.PM_CHECK_DB_VIEWS = checkViews;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(checkViews, 0), { once:true });
  } else {
    setTimeout(checkViews, 0);
  }
})();
