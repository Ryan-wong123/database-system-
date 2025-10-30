import { useMemo } from 'react';
import useFetchData from '../hooks/useFetchData';
import { BookingAPI } from '../services/api';

export default function BookingHistory() {
  const { data, loading, error } = useFetchData(() => BookingAPI.historyMine(), []);
  

  const rows = useMemo(() => {
    if (!data) return [];
    if (Array.isArray(data)) return data;              // server returned array
    if (Array.isArray(data.items)) return data.items;   // server returned { ok, items }
    if (Array.isArray(data.data)) return data.data;     // rare: { data: [...] }
    if (Array.isArray(data?.data?.items)) return data.data.items;
    return [];
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
                  {b.slot_start && new Date(b.slot_start).toLocaleString()}
                  {' → '}
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
             {/* Requested items (if your SQL returns b.items as an array) */}
           {Array.isArray(b.items) && b.items.length > 0 && (
             <div className="mt-2 small">
               <div className="fw-semibold">Requested items:</div>
               <ul className="mb-0">
                 {b.items.map((it, j) => (
                   <li key={j}>
                     {/* Show name if your SQL includes it, else show the id */}
                     {(it.food_name || it.name || `Item #${it.food_item_id}`)} — qty {it.qty}
                   </li>
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
