import { useMemo } from 'react';
import useFetchData from '../hooks/useFetchData';
import { BookingAPI } from '../services/api';

export default function BookingHistory() {
  const { data, loading, error } = useFetchData(() => BookingAPI.historyMine(), []);

  const rows = useMemo(() => {
    // unwrap
    let arr = [];
    if (!data) arr = [];
    else if (Array.isArray(data)) arr = data;
    else if (Array.isArray(data.items)) arr = data.items;
    else if (Array.isArray(data.data)) arr = data.data;
    else if (Array.isArray(data?.data?.items)) arr = data.data.items;

    const parseArrayMaybe = (x) => {
      if (!x) return null;
      if (Array.isArray(x)) return x;
      if (typeof x === 'string') { try { const v = JSON.parse(x); return Array.isArray(v) ? v : null; } catch { return null; } }
      return null;
    };
    const toNum = (v) => Number.isFinite(Number(v)) ? Number(v) : 0;

    const normalizeItem = (it) => ({
      id:   it?.item_id ?? it?.id ?? it?.food_item_id ?? null,
      name: it?.name ?? (it?.id ? `Item #${it.id}` : null),
      unit: it?.unit ?? null,
      qty_allocated: toNum(it?.qty_allocated),
      qty_collected: toNum(it?.qty_collected),
    });

    return (arr || []).map((b) => {
      const itemsParsed =
        parseArrayMaybe(b.items) ??
        parseArrayMaybe(b.items_json) ??
        (Array.isArray(b.items) ? b.items : []);

      return {
        ...b,
        status: String(b.status || 'pending').toLowerCase(),
        items: itemsParsed.map(normalizeItem),
      };
    });
  }, [data]);

  if (loading) return <div className="container py-3">Loading…</div>;
  if (error) {
    const msg = error?.response?.data?.message || error.message || 'Failed to load';
    return <div className="container py-3 text-danger">{msg}</div>;
  }

  return (
    <div className="container py-3">
      <h1 className="h4 fw-bold mb-3">My Booking History</h1>
      {rows.length === 0 && <p className="text-muted">No bookings yet.</p>}

      <div className="list-group shadow-sm">
        {rows.map((b, i) => {
          const totals = Array.isArray(b.items)
            ? b.items.reduce((acc, it) => {
                acc.alloc += it.qty_allocated || 0;
                acc.coll  += it.qty_collected || 0;
                return acc;
              }, { alloc: 0, coll: 0 })
            : { alloc: 0, coll: 0 };

          return (
            <div key={b.booking_id ?? i} className="list-group-item">
              <div className="d-flex justify-content-between">
                <div>
                  <div className="fw-semibold">{b.location_name || 'Location'}</div>
                  <div className="small text-muted">
                    {b.slot_start && new Date(b.slot_start).toLocaleString()} {' → '}
                    {b.slot_end && new Date(b.slot_end).toLocaleString()}
                  </div>
                  {b.created_at && (
                    <div className="small text-muted">
                      Created: {new Date(b.created_at).toLocaleString()}
                    </div>
                  )}
                </div>
                <div className="text-end">
                  <span className="badge bg-secondary text-uppercase">{b.status}</span>
                  <div className="small text-muted mt-1">
                    Alloc: {totals.alloc} · Coll: {totals.coll}
                  </div>
                </div>
              </div>

              {Array.isArray(b.items) && b.items.length > 0 && (
                <div className="mt-2 small">
                  <div className="fw-semibold">Items:</div>
                  <ul className="mb-0">
                    {b.items.map((it, j) => (
                      <li key={j}>
                        {(it.name || (it.id ? `Item #${it.id}` : 'Item'))}
                        {' — '}
                        <strong>Allocated</strong> {it.qty_allocated}{it.unit ? ` ${it.unit}` : ''}
                        {' · '}
                        <strong>Collected</strong> {it.qty_collected}{it.unit ? ` ${it.unit}` : ''}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
