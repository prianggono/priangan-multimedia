CREATE OR REPLACE FUNCTION public.save_penawaran_atomic(p_edit_id bigint, p_quote jsonb, p_client jsonb, p_items jsonb)
RETURNS bigint
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
-- Persist both discount percentage and nominal so the BEFORE trigger can
-- recalculate totals without dropping the user's global discount.
declare
  v_id bigint;
  v_client_id bigint;
  v_item jsonb;
  v_item_id bigint;
  v_event_key text;
  v_no text;
  v_seq integer;
  v_changed boolean := true;
begin
  if p_edit_id is not null then
    v_id := p_edit_id;
    if not exists (select 1 from public.penawaran where id=v_id) then raise exception 'Penawaran % tidak ditemukan',p_edit_id; end if;
  end if;

  if p_client is not null and nullif(trim(p_client->>'nama_client'),'') is not null then
    select c.id into v_client_id
      from public.clients c
     where lower(trim(coalesce(c.nama_client,'')))=lower(trim(coalesce(p_client->>'nama_client','')))
       and lower(trim(coalesce(c.perusahaan,'')))=lower(trim(coalesce(p_client->>'perusahaan','')))
       and lower(trim(coalesce(c.telepon_wa,c.telepon,c.whatsapp,'')))=lower(trim(coalesce(p_client->>'telepon','')))
       and lower(trim(coalesce(c.email,'')))=lower(trim(coalesce(p_client->>'email','')))
     order by c.id limit 1;
    if v_client_id is null then
      insert into public.clients(nama_client,perusahaan,telepon_wa,telepon,whatsapp,email,alamat)
      values(trim(p_client->>'nama_client'),trim(coalesce(p_client->>'perusahaan','')),trim(coalesce(p_client->>'telepon','')),trim(coalesce(p_client->>'telepon','')),trim(coalesce(p_client->>'whatsapp',p_client->>'telepon','')),trim(coalesce(p_client->>'email','')),trim(coalesce(p_client->>'alamat','')))
      returning id into v_client_id;
    end if;
  end if;

  if p_edit_id is not null then
    SELECT NOT (
      coalesce(client_id,0)=coalesce(v_client_id,0)
      AND coalesce(nama_client,'')=coalesce(nullif(trim(p_quote->>'nama_client'),''),'')
      AND coalesce(perusahaan,'')=coalesce(nullif(trim(p_quote->>'perusahaan'),''),'')
      AND coalesce(telepon_wa,'')=coalesce(nullif(trim(p_quote->>'telepon_wa'),''),'')
      AND coalesce(telepon,'')=coalesce(nullif(trim(p_quote->>'telepon'),''),'')
      AND coalesce(whatsapp,'')=coalesce(nullif(trim(p_quote->>'whatsapp'),''),'')
      AND coalesce(email,'')=coalesce(nullif(trim(p_quote->>'email'),''),'')
      AND coalesce(nama_event,'')=coalesce(nullif(trim(p_quote->>'nama_event'),''),'')
      AND coalesce(event_name,'')=coalesce(nullif(trim(p_quote->>'event_name'),''),'')
      AND coalesce(event,'')=coalesce(nullif(trim(p_quote->>'event'),''),'')
      AND tanggal_mulai=nullif(p_quote->>'tanggal_mulai','')::date
      AND tanggal_selesai=nullif(p_quote->>'tanggal_selesai','')::date
      AND coalesce(status,'DRAFT')=coalesce(nullif(p_quote->>'status',''),'DRAFT')
      AND coalesce(diskon,0)=greatest(coalesce((p_quote->>'diskon')::numeric,0),0)
      AND coalesce(diskon_persen,0)=greatest(least(coalesce((p_quote->>'diskon_persen')::numeric,0),100),0)
      AND coalesce(diskon_nominal,0)=greatest(coalesce((p_quote->>'diskon_nominal')::numeric,0),0)
      AND (SELECT count(*) FROM public.penawaran_items pi WHERE pi.penawaran_id=v_id)=(SELECT count(*) FROM jsonb_array_elements(coalesce(p_items,'[]'::jsonb)))
      AND NOT EXISTS (
        SELECT 1 FROM public.penawaran_items pi
        JOIN LATERAL (
          SELECT value AS j, ordinality AS ord
          FROM jsonb_array_elements(coalesce(p_items,'[]'::jsonb)) WITH ORDINALITY
        ) n ON n.ord=(SELECT count(*) FROM public.penawaran_items pi2 WHERE pi2.penawaran_id=v_id AND pi2.id<=pi.id)
        WHERE pi.penawaran_id=v_id
          AND NOT (
            coalesce(pi.master_harga_id,0)=coalesce(nullif(n.j->>'master_harga_id','')::bigint,0)
            AND coalesce(pi.kode,'')=coalesce(n.j->>'kode','')
            AND coalesce(pi.item,'')=coalesce(n.j->>'item','')
            AND coalesce(pi.nama_item,'')=coalesce(n.j->>'nama_item',n.j->>'item','')
            AND coalesce(pi.kategori,'')=coalesce(n.j->>'kategori','')
            AND coalesce(pi.satuan,'')=coalesce(n.j->>'satuan','')
            AND coalesce(pi.harga,0)=greatest(coalesce((n.j->>'harga')::numeric,0),0)
            AND coalesce(pi.harga_jual,0)=greatest(coalesce((n.j->>'harga_jual')::numeric,0),0)
            AND coalesce(pi.harga_modal,0)=greatest(coalesce((n.j->>'harga_modal')::numeric,0),0)
            AND upper(coalesce(pi.tipe_perhitungan,'QTY'))=upper(coalesce(n.j->>'tipe_perhitungan','QTY'))
            AND upper(coalesce(pi.tipe,'QTY'))=upper(coalesce(n.j->>'tipe','QTY'))
            AND coalesce(pi.qty,1)=greatest(coalesce((n.j->>'qty')::numeric,1),1)
            AND coalesce(pi.jumlah,1)=greatest(coalesce((n.j->>'jumlah')::numeric,1),1)
            AND coalesce(pi.durasi,1)=greatest(coalesce((n.j->>'durasi')::numeric,1),1)
            AND coalesce(pi.lebar,0)=coalesce(nullif(n.j->>'lebar','')::numeric,0)
            AND coalesce(pi.tinggi,0)=coalesce(nullif(n.j->>'tinggi','')::numeric,0)
            AND coalesce(pi.panjang,0)=coalesce(nullif(n.j->>'panjang','')::numeric,0)
            AND coalesce(pi.tanggal_mulai,'1000-01-01'::date)=coalesce(nullif(n.j->>'tanggal_mulai','')::date,'1000-01-01'::date)
            AND coalesce(pi.tanggal_selesai,'1000-01-01'::date)=coalesce(nullif(n.j->>'tanggal_selesai','')::date,'1000-01-01'::date)
            AND coalesce(pi.diskon_persen,0)=greatest(least(coalesce((n.j->>'diskon_persen')::numeric,0),100),0)
            AND coalesce(pi.diskon_nominal,0)=greatest(coalesce((n.j->>'diskon_nominal')::numeric,0),0)
            AND coalesce(pi.level_enabled,false)=coalesce((n.j->>'level_enabled')::boolean,false)
            AND coalesce(pi.level_master_harga_id,0)=coalesce(nullif(n.j->>'level_master_harga_id','')::bigint,0)
            AND coalesce(pi.level_tinggi,0)=coalesce(nullif(n.j->>'level_tinggi','')::numeric,0)
            AND coalesce(pi.level_harga,0)=coalesce(nullif(n.j->>'level_harga','')::numeric,0)
          )
      )
    ) INTO v_changed
    FROM public.penawaran p WHERE p.id=v_id;

    update public.penawaran set
      client_id=v_client_id,
      nama_client=nullif(trim(p_quote->>'nama_client'),''),
      perusahaan=nullif(trim(p_quote->>'perusahaan'),''),
      telepon_wa=nullif(trim(p_quote->>'telepon_wa'),''),
      telepon=nullif(trim(p_quote->>'telepon'),''),
      whatsapp=nullif(trim(p_quote->>'whatsapp'),''),
      email=nullif(trim(p_quote->>'email'),''),
      nama_event=nullif(trim(p_quote->>'nama_event'),''),
      event_name=nullif(trim(p_quote->>'event_name'),''),
      event=nullif(trim(p_quote->>'event'),''),
      tanggal_mulai=nullif(p_quote->>'tanggal_mulai','')::date,
      tanggal_selesai=nullif(p_quote->>'tanggal_selesai','')::date,
      status=coalesce(nullif(p_quote->>'status',''),'DRAFT'),
      diskon=greatest(coalesce((p_quote->>'diskon')::numeric,0),0),
      diskon_persen=greatest(least(coalesce((p_quote->>'diskon_persen')::numeric,0),100),0),
      diskon_nominal=greatest(coalesce((p_quote->>'diskon_nominal')::numeric,0),0),
      revisi_penawaran=CASE WHEN v_changed THEN revisi_penawaran+1 ELSE revisi_penawaran END,
      updated_at=now()
    where id=v_id;
    delete from public.penawaran_jadwal where penawaran_id=v_id;
    delete from public.penawaran_items where penawaran_id=v_id;
  else
    v_event_key := upper(regexp_replace(trim(coalesce(p_quote->>'nama_event','EVENT')),'[^A-Za-z0-9]+','-','g'));
    v_event_key := regexp_replace(v_event_key,'(^-+|-+$)','','g');
    if v_event_key='' then v_event_key:='EVENT'; end if;
    perform pg_advisory_xact_lock(785513, hashtext(v_event_key));
    select coalesce(max((substring(nomor_penawaran from '[0-9]{4}$'))::integer),0)+1 into v_seq
      from public.penawaran where nomor_penawaran like 'PM-'||v_event_key||'-%';
    v_no := 'PM-'||v_event_key||'-'||lpad(v_seq::text,4,'0');
    insert into public.penawaran(
      nomor_penawaran,client_id,nama_client,perusahaan,telepon_wa,telepon,whatsapp,email,nama_event,event_name,event,
      tanggal_mulai,tanggal_selesai,status,diskon,diskon_persen,diskon_nominal,revisi_penawaran
    )
    values(
      v_no,v_client_id,nullif(trim(p_quote->>'nama_client'),''),nullif(trim(p_quote->>'perusahaan'),''),
      nullif(trim(p_quote->>'telepon_wa'),''),nullif(trim(p_quote->>'telepon'),''),
      nullif(trim(p_quote->>'whatsapp'),''),nullif(trim(p_quote->>'email'),''),
      nullif(trim(p_quote->>'nama_event'),''),nullif(trim(p_quote->>'event_name'),''),
      nullif(trim(p_quote->>'event'),'') ,nullif(p_quote->>'tanggal_mulai','')::date,nullif(p_quote->>'tanggal_selesai','')::date,
      coalesce(nullif(p_quote->>'status',''),'DRAFT'),
      greatest(coalesce((p_quote->>'diskon')::numeric,0),0),
      greatest(least(coalesce((p_quote->>'diskon_persen')::numeric,0),100),0),
      greatest(coalesce((p_quote->>'diskon_nominal')::numeric,0),0),
      0
    )
    returning id into v_id;
  end if;

  for v_item in select value from jsonb_array_elements(coalesce(p_items,'[]'::jsonb)) loop
    insert into public.penawaran_items(
      penawaran_id,master_harga_id,kode,item,nama_item,kategori,satuan,harga,harga_jual,harga_modal,tipe_perhitungan,tipe,
      qty,jumlah,durasi,lebar,tinggi,panjang,tanggal_mulai,tanggal_selesai,diskon_persen,diskon_nominal,subtotal,
      level_enabled,level_master_harga_id,level_tinggi,level_harga,level_subtotal
    ) values(
      v_id,nullif(v_item->>'master_harga_id','')::bigint,nullif(trim(v_item->>'kode'),''),
      nullif(trim(coalesce(v_item->>'item',v_item->>'nama_item','')),''),
      nullif(trim(coalesce(v_item->>'nama_item',v_item->>'item','')),''),
      nullif(trim(v_item->>'kategori'),''),nullif(trim(v_item->>'satuan'),''),
      greatest(coalesce((v_item->>'harga')::numeric,0),0),greatest(coalesce((v_item->>'harga_jual')::numeric,0),0),
      greatest(coalesce((v_item->>'harga_modal')::numeric,0),0),
      coalesce(nullif(v_item->>'tipe_perhitungan',''),'QTY'),coalesce(nullif(v_item->>'tipe',''),'QTY'),
      greatest(coalesce((v_item->>'qty')::numeric,1),1),greatest(coalesce((v_item->>'jumlah')::numeric,1),1),
      greatest(coalesce((v_item->>'durasi')::numeric,1),1),nullif(v_item->>'lebar','')::numeric,
      nullif(v_item->>'tinggi','')::numeric,nullif(v_item->>'panjang','')::numeric,
      nullif(v_item->>'tanggal_mulai','')::date,nullif(v_item->>'tanggal_selesai','')::date,
      greatest(least(coalesce((v_item->>'diskon_persen')::numeric,0),100),0),
      greatest(coalesce((v_item->>'diskon_nominal')::numeric,0),0),
      greatest(coalesce((v_item->>'subtotal')::numeric,0),0),
      coalesce((v_item->>'level_enabled')::boolean,false),
      nullif(v_item->>'level_master_harga_id','')::bigint,nullif(v_item->>'level_tinggi','')::numeric,
      nullif(v_item->>'level_harga','')::numeric,greatest(coalesce((v_item->>'level_subtotal')::numeric,0),0)
    );
    select id into v_item_id from public.penawaran_items where penawaran_id=v_id order by id desc limit 1;
    insert into public.penawaran_jadwal(item_id,penawaran_item_id,penawaran_id,qty,tanggal_mulai,tanggal_selesai,durasi,subtotal)
    values(v_item_id,v_item_id,v_id,greatest(coalesce((v_item->>'qty')::numeric,1),1),nullif(v_item->>'tanggal_mulai','')::date,nullif(v_item->>'tanggal_selesai','')::date,greatest(coalesce((v_item->>'durasi')::numeric,1),1),greatest(coalesce((v_item->>'subtotal')::numeric,0),0));
  end loop;

  perform public.hitung_penawaran(v_id);
  return v_id;
end;
$function$;