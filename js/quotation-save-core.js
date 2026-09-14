/* Priangan Multimedia — Quotation Core
 * Single authority for quotation discount calculation + persistence.
 * Replaces the old save/discount patch stack.
 */
(function () {
  'use strict';
  if (window.__PM_QUOTATION_CORE_V1) return;
  window.__PM_QUOTATION_CORE_V1 = true;

  const S = (v) => String(v ?? '').trim();
  const N = (v) => {
    if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
    const s = S(v).replace(/[^0-9,.-]/g, '');
    if (!s) return 0;
    const n = Number(s.replace(/\.(?=\d{3}(?:\D|$))/g, '').replace(',', '.'));
    return Number.isFinite(n) ? n : 0;
  };
  const money = (v) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Math.max(0, Math.round(N(v))));
  const toast = (text) => typeof window.msg === 'function' ? window.msg(text) : console.warn(text);

  function DB() {
    try { if (typeof db !== 'undefined' && db) return db; } catch (_) {}
    return window.__PM_STABLE_DB || window.__PRIANGAN_QUOTE_DB || window.__PRIANGAN_EDIT_DB || null;
  }
  function days(a, b) {
    if (!a || !b) return 1;
    const diff = (new Date(S(b) + 'T00:00:00') - new Date(S(a) + 'T00:00:00')) / 86400000;
    return diff >= 0 ? diff + 1 : 1;
  }
  function rows() { return Array.isArray(window.items) ? window.items : []; }
  function itemSubtotal(item) {
    const duration = days(item.mulai, item.selesai);
    const price = N(item.harga);
    if (item.tipe === 'luas') return N(item.lebar) * N(item.tinggi) * price * duration;
    if (item.tipe === 'rigging') return ((N(item.panjang) * 2) + (N(item.tinggi) * 2)) * price * duration;
    if (item.tipe === 'level') {
      const led = rows().find((x) => x !== item && /led|videotron/i.test(S(x.item)));
      return (led ? N(led.lebar) : N(item.lebar)) * N(item.tinggi) * price * duration;
    }
    return Math.max(1, N(item.qty) || 1) * price * duration;
  }
  function subtotal() { return rows().reduce((sum, item) => sum + itemSubtotal(item), 0); }
  function discountState() {
    const base = Math.max(0, subtotal());
    const pctEl = document.querySelector('#pmDiscPct');
    const rpEl = document.querySelector('#pmDisc');
    const pct = Math.max(0, Math.min(100, Math.trunc(N(pctEl?.value ?? window.__pmDiscountPct))));
    const typedRp = Math.max(0, N(rpEl?.value));
    let nominal = typedRp;
    if (window.__PM_DISC_MODE === 'pct' || document.activeElement === pctEl || (!typedRp && pct)) nominal = Math.round(base * pct / 100);
    nominal = Math.max(0, Math.min(base, nominal));
    const actualPct = base ? (nominal / base) * 100 : 0;
    return { base, pct: pct || actualPct, nominal, total: Math.max(0, base - nominal) };
  }
  function syncUI() {
    const state = discountState();
    const p = document.querySelector('#pmDiscPct');
    const r = document.querySelector('#pmDisc');
    const total = document.querySelector('#total');
    const grand = document.querySelector('#pmGrand');
    if (p && document.activeElement !== p) p.value = String(Math.trunc(state.pct));
    if (r && document.activeElement !== r) r.value = money(state.nominal);
    if (total) total.textContent = money(state.total);
    if (grand) grand.textContent = money(state.total);
    window.__pmDiscountBase = state.base;
    window.__pmDiscountPct = state.pct;
    window.__pmDiscountValue = state.nominal;
    window.__pmNetTotal = state.total;
    return state;
  }
  function ensureUI() {
    const total = document.querySelector('#total');
    if (!total || document.querySelector('#pmDiscount')) return;
    const sum = total.closest('.sum');
    if (!sum || !sum.parentElement) return;
    const box = document.createElement('div');
    box.id = 'pmDiscount';
    box.style.cssText = 'margin-top:14px;padding-top:14px;border-top:1px solid var(--border)';
    box.innerHTML = '<div class="grid g2"><div class="field"><label>Diskon (%)</label><input id="pmDiscPct" type="text" inputmode="numeric" autocomplete="off" value="0"></div><div class="field"><label>Diskon (Rp)</label><input id="pmDisc" type="text" inputmode="numeric" autocomplete="off" value="Rp 0"></div></div><div class="sum" style="margin-top:10px"><span>Grand Total</span><b id="pmGrand">Rp 0</b></div>';
    sum.parentElement.insertBefore(box, sum.nextSibling);
    const p = box.querySelector('#pmDiscPct');
    const r = box.querySelector('#pmDisc');
    p.addEventListener('input', () => { window.__PM_DISC_MODE = 'pct'; syncUI(); });
    p.addEventListener('change', () => { window.__PM_DISC_MODE = 'pct'; syncUI(); });
    p.addEventListener('blur', () => { p.value = String(Math.max(0, Math.min(100, Math.trunc(N(p.value))))); syncUI(); });
    r.addEventListener('focus', () => { r.value = String(N(r.value) || ''); });
    r.addEventListener('input', () => { window.__PM_DISC_MODE = 'rp'; syncUI(); });
    r.addEventListener('blur', () => { r.value = money(r.value); syncUI(); });
  }
  async function deleteOldChildren(d, quoteId) {
    const old = await d.from('penawaran_items').select('id').eq('penawaran_id', quoteId);
    if (old.error) throw old.error;
    const ids = (old.data || []).map((x) => x.id).filter(Boolean);
    if (ids.length) {
      const schedules = await d.from('penawaran_jadwal').delete().in('item_id', ids);
      if (schedules.error) throw schedules.error;
    }
    const del = await d.from('penawaran_items').delete().eq('penawaran_id', quoteId);
    if (del.error) throw del.error;
  }
  async function saveQuoteCore() {
    const d = DB();
    if (!d) return toast('Supabase belum terhubung.');
    const client = S(document.querySelector('#qc')?.value);
    const company = S(document.querySelector('#qp')?.value);
    const phone = S(document.querySelector('#qw')?.value);
    const email = S(document.querySelector('#qe')?.value);
    const eventName = S(document.querySelector('#qeve')?.value);
    const startDate = document.querySelector('#qs')?.value || null;
    const endDate = document.querySelector('#qe2')?.value || null;
    const sourceRows = rows().filter((x) => x && S(x.kode) && S(x.item));
    if (!client || !company || !eventName) return toast('Client, Perusahaan, dan Nama Event wajib diisi.');
    if (!sourceRows.length) return toast('Tambahkan minimal 1 item.');
    const state = syncUI();
    const editId = N(window.__pmEditingQuotationId || window.__PM_EDIT_QUOTATION_ID);
    const number = S(window.__pmEditingQuotationNumber || window.__PM_EDIT_QUOTATION_NUMBER) || ('PM-' + Date.now().toString().slice(-6));
    const payload = {
      nomor_penawaran: number, nama_client: client, perusahaan: company,
      telepon_wa: phone, telepon: phone, whatsapp: phone, email,
      nama_event: eventName, event_name: eventName,
      tanggal_mulai: startDate, tanggal_selesai: endDate,
      subtotal: state.base, diskon: state.nominal, diskon_persen: state.pct,
      diskon_nominal: state.nominal, total: state.total, grand_total: state.total, status: 'DRAFT'
    };
    let quoteId = editId;
    if (editId) {
      const updated = await d.from('penawaran').update(payload).eq('id', editId).select('id').single();
      if (updated.error) throw updated.error;
      quoteId = updated.data.id;
      await deleteOldChildren(d, quoteId);
    } else {
      const inserted = await d.from('penawaran').insert([payload]).select('id').single();
      if (inserted.error) throw inserted.error;
      quoteId = inserted.data?.id;
    }
    const itemPayload = sourceRows.map((item) => ({
      penawaran_id: quoteId, kode: item.kode, item: item.item,
      harga_jual: N(item.harga), harga: N(item.harga),
      tipe_perhitungan: item.tipe, tipe: item.tipe,
      qty: Math.max(1, N(item.qty) || 1), jumlah: Math.max(1, N(item.qty) || 1),
      lebar: N(item.lebar) || null, tinggi: N(item.tinggi) || null, panjang: N(item.panjang) || null,
      tanggal_mulai: item.mulai || null, tanggal_selesai: item.selesai || null,
      durasi: days(item.mulai, item.selesai), subtotal: itemSubtotal(item)
    }));
    const itemResult = await d.from('penawaran_items').insert(itemPayload).select('id');
    if (itemResult.error) throw itemResult.error;
    const savedItems = itemResult.data || [];
    const schedulePayload = savedItems.map((saved, index) => {
      const item = sourceRows[index];
      return { item_id: saved.id, penawaran_item_id: saved.id, qty: Math.max(1, N(item.qty) || 1), tanggal_mulai: item.mulai || null, tanggal_selesai: item.selesai || null, durasi: days(item.mulai, item.selesai), subtotal: itemSubtotal(item) };
    });
    if (schedulePayload.length) {
      const scheduleResult = await d.from('penawaran_jadwal').insert(schedulePayload);
      if (scheduleResult.error) throw scheduleResult.error;
    }
    const verify = await d.from('penawaran').select('id,subtotal,diskon,diskon_persen,diskon_nominal,total,grand_total,nama_event').eq('id', quoteId).single();
    if (verify.error) throw verify.error;
    const saved = verify.data || {};
    const ok = Math.round(N(saved.subtotal)) === Math.round(state.base) && Math.round(N(saved.diskon_nominal)) === Math.round(state.nominal) && Math.round(N(saved.total)) === Math.round(state.total) && Math.round(N(saved.grand_total)) === Math.round(state.total) && Math.round(N(saved.diskon_persen)) === Math.round(state.pct);
    if (!ok) throw new Error('Verifikasi database gagal: nilai subtotal/diskon/total berbeda dari form.');
    toast((editId ? 'Penawaran berhasil diperbarui: ' : 'Penawaran berhasil disimpan: ') + number);
    window.__pmEditingQuotationId = null; window.__PM_EDIT_QUOTATION_ID = null;
    window.__pmEditingQuotationNumber = null; window.__PM_EDIT_QUOTATION_NUMBER = null;
    window.items = [];
    if (typeof load === 'function') await load();
    if (typeof go === 'function') go('history'); else { window.page = 'history'; if (typeof render === 'function') render(); }
  }
  window.saveQuote = saveQuoteCore;
  window.__PM_QUOTATION_CORE = { subtotal, discountState, syncUI, itemSubtotal };
  function boot() { ensureUI(); syncUI(); }
  boot();
  [50,150,300,600,1200].forEach((ms) => setTimeout(boot, ms));
  document.addEventListener('click', (e) => { if (e.target.closest('[data-p="quotation"]')) setTimeout(boot, 80); });
  const observer = new MutationObserver(() => ensureUI());
  if (document.body) observer.observe(document.body, { childList: true, subtree: true });
})();
