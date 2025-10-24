import { useMemo, useState } from 'react';
import UseFetchData from '../hooks/useFetchData';
import { DonationAPI } from '../services/api';

export default function DonationApprovalTab() {
  const [tick, setTick] = useState(0);
  const list = UseFetchData(() => DonationAPI.list(), [tick]);

  const extractPayload = (resp) => {
    const d = resp?.data ?? resp ?? {};
    const items =
      Array.isArray(d?.items)       ? d.items :
      Array.isArray(d?.data?.items) ? d.data.items :
      [];
    return { ok: !!(d.ok ?? true), items };
  };

  // group items with same food_item_id (or name) and sum qty
  const groupFoods = (foods) => {
    const map = new Map();
    for (const fi of foods) {
      const id = fi?.food_item_id ?? null;
      const nm = fi?.name ?? '';
      const key = id != null ? `id:${id}` : `nm:${nm}`;
      const prev = map.get(key) || { food_item_id: id, name: nm, qty: 0 };
      prev.qty += Number(fi?.qty ?? 0);
      map.set(key, prev);
    }
    return Array.from(map.values());
  };

  const normalizeRows = (payloadItems) => {
    return (payloadItems || []).map((row) => {
      const x = row?.donations ?? row;
      const foods = Array.isArray(x?.food_items) ? x.food_items : [];
      const grouped = groupFoods(foods);
      return {
        donation_id:    x?.donation_id ?? null,
        name:           x?.name ?? '',
        address:        x?.address ?? '',
        donor_id:       x?.donor_id ?? null,
        location_id:    x?.location_id ?? null,
        approve_status: x?.approve_status ?? 'pending',
        food_items:     grouped,
      };
    }).filter(r => r.donation_id != null);
  };

  const rows = useMemo(() => {
    const payload = extractPayload(list?.data);
    return normalizeRows(payload.items);
  }, [list?.data]);

  // optional optimistic overlay
  const [localMap, setLocalMap] = useState(new Map());
  const effectiveRows = useMemo(() => {
    if (localMap.size === 0) return rows;
    return rows.map(r =>
      localMap.has(r.donation_id)
        ? { ...r, approve_status: localMap.get(r.donation_id) }
        : r
    );
  }, [rows, localMap]);

  const pending   = effectiveRows.filter(r => r.approve_status === 'pending');
  const processed = effectiveRows.filter(r => r.approve_status !== 'pending');

  const OPTIONS = ['pending', 'confirmed', 'cancelled'];
  const pretty  = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  const approve = async (donation_id, next) => {
    if (!OPTIONS.includes(next)) { alert('Invalid status.'); return; }
    const prev = effectiveRows.find(x => x.donation_id === donation_id)?.approve_status ?? 'pending';

    // optimistic
    setLocalMap(m => new Map(m).set(donation_id, next));

    try {
      const res = await DonationAPI.approve(donation_id, next); // ✅ using approve()
      const ok = (res?.data?.ok ?? res?.ok ?? false);
      if (!ok) throw new Error('Approval update failed');

      // refresh from server truth & clear overlay
      setTick(t => t + 1);
      setLocalMap(new Map());
    } catch (err) {
      // revert on error
      setLocalMap(m => {
        const mm = new Map(m);
        if (prev === undefined) mm.delete(donation_id); else mm.set(donation_id, prev);
        return mm;
      });
      alert(err?.message || 'Something went wrong updating the donation status.');
    }
  };

  const Row = ({ r }) => {
    const selectId = `donation-status-${r.donation_id}`;
    return (
      <tr>
        <td><strong>#{r.donation_id}</strong></td>
        <td>
          <div className="fw-semibold">{r.name || '—'}</div>
          <div className="text-muted small">{r.address || '—'}</div>
        </td>
        <td>{r.location_id ?? '—'}</td>
        <td>
          {r.food_items.length > 0 ? (
            <ul className="mb-0 ps-3">
              {r.food_items.map((f, i) => (
                <li
                  // ✅ unique even for duplicated names/ids
                  key={`${r.donation_id}-${f.food_item_id ?? 'nm'}-${i}`}
                >
                  {f.name || '—'} × {Number.isFinite(f.qty) ? f.qty : 0}
                </li>
              ))}
            </ul>
          ) : <span className="text-muted">—</span>}
        </td>
        <td>
          <label className="form-label mb-1" htmlFor={selectId}>Status</label>
          <select
            id={selectId}
            name={selectId}
            className="form-select form-select-sm"
            value={r.approve_status}
            onChange={(e) => approve(r.donation_id, e.target.value)}
          >
            {OPTIONS.map(opt => <option key={opt} value={opt}>{pretty(opt)}</option>)}
          </select>
        </td>
      </tr>
    );
  };

  return (
    <div className="d-grid gap-3">
      {list?.loading && <div className="text-muted">Loading donations…</div>}

      <div className="card">
        <div className="card-body d-grid gap-3">
          <h2 className="h6 mb-0">Awaiting Approval</h2>
          <div className="table-responsive">
            <table className="table align-middle">
              <thead>
                <tr>
                  <th style={{width: 90}}>ID</th>
                  <th>Location</th>
                  <th>Location ID</th>
                  <th>Food Items (name × qty)</th>
                  <th style={{width: 180}}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pending.length === 0 ? (
                  <tr><td colSpan={5} className="text-muted">No pending donations.</td></tr>
                ) : pending.map(r => <Row key={r.donation_id} r={r} />)}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-body d-grid gap-3">
          <h2 className="h6 mb-0">Processed (Approved / Cancelled)</h2>
          <div className="table-responsive">
            <table className="table align-middle">
              <thead>
                <tr>
                  <th style={{width: 90}}>ID</th>
                  <th>Location</th>
                  <th>Location ID</th>
                  <th>Food Items (name × qty)</th>
                  <th style={{width: 180}}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {processed.length === 0 ? (
                  <tr><td colSpan={5} className="text-muted">No processed donations.</td></tr>
                ) : processed.map(r => <Row key={r.donation_id} r={r} />)}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
