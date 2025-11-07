import { useMemo } from 'react';
import useFetchData from '../hooks/useFetchData';
import { BookingAPI } from '../services/api';

export default function BookingHistory() {
  const { data, loading, error } = useFetchData(() => BookingAPI.historyMine(), []);

  // Normalize server payload to a stable shape
  const rows = useMemo(() => {
    // unwrap various API envelopes
    let arr = [];
    if (!data) arr = [];
    else if (Array.isArray(data)) arr = data;
    else if (Array.isArray(data.items)) arr = data.items;
    else if (Array.isArray(data.data)) arr = data.data;
    else if (Array.isArray(data?.data?.items)) arr = data.data.items;

    const normalizeItem = (it) => ({
      id:   it?.id ?? it?.food_item_id ?? it?.alloc_food_item_id ?? it?.item_id ?? null,
      name: it?.name ?? it?.food_name ?? it?.alloc_food_name ?? (it?.id ? `Item #${it.id}` : null),
      qty:  it?.qty ?? it?.total_qty ?? it?.alloc_total_qty ?? it?.quantity ?? it?.qty_collected ?? 0,
      lots: it?.lots ?? it?.alloc_lots_json ?? it?.lots_json ?? [],
    });

    return (arr || []).map(b => ({
      ...b,
      items: Array.isArray(b.items) ? b.items.map(normalizeItem) : [],
    }));
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
        {rows.map((b, i) => (
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
                <span className="badge bg-secondary text-uppercase">{b.status || 'pending'}</span>
                {typeof b.items_count === 'number' && (
                  <div className="small text-muted mt-1">Items allocated: {b.items_count}</div>
                )}
              </div>
            </div>

            {/* Requested items */}
            {Array.isArray(b.items) && b.items.length > 0 && (
              <div className="mt-2 small">
                <div className="fw-semibold">Requested items:</div>
                <ul className="mb-0">
                  {b.items.map((it, j) => (
                    <li key={j}>{(it.name || (it.id ? `Item #${it.id}` : 'Item'))} — qty {it.qty}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
