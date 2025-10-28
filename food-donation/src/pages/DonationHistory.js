import { useState, useMemo } from 'react';
import UseFetchData from '../hooks/useFetchData';
import { DonationAPI } from '../services/api';

export default function DonationHistory() {
  const [search, setSearch] = useState('');

  // Get logged-in donor info
  let donorId = NaN;
  try {
    const auth = JSON.parse(localStorage.getItem('auth:user') || 'null');
    donorId = Number(auth?.user_id ?? auth?.id);
  } catch (_) {
    donorId = NaN;
  }
  const hasValidId = Number.isFinite(donorId);

  // Fetch donor’s donation history
 const stock = UseFetchData(
    () => (hasValidId ? DonationAPI.DonationHistory(donorId) : Promise.resolve({ data: { items: [] } })),
    [donorId]
  );
  const items = Array.isArray(stock.data?.items) ? stock.data.items : [];

  // Filter based on search query
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(it =>
      [it.food_name, it.category, it.location_name]
        .filter(Boolean)
        .some(val => String(val).toLowerCase().includes(q))
    );
  }, [items, search]);

  // Group filtered items by location
  const grouped = useMemo(() => {
    const map = new Map();
    for (const it of filtered) {
      const key = it.location_name || 'Unknown';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(it);
    }
    return [...map.entries()];
  }, [filtered]);

  return (
    <div className="container py-3">
      {/* Top Horizontal Bar (F-top) */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h1 className="h4 fw-bold mb-0">Donation History</h1>
        <input
          className="form-control w-50"
          placeholder="Search by food, category, or location..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Second horizontal info bar */}
      <div className="text-muted small mb-4 border-bottom pb-2">
        {filtered.length} donated items • {grouped.length} locations
      </div>

      {/* Vertical scan area (F-stem) */}
      {grouped.map(([loc, list]) => (
        <div key={loc} className="mb-4">
          <h5 className="fw-semibold text-primary mb-2">{loc}</h5>
          <ul className="list-group shadow-sm">
            {list.map((it, i) => (
              <li
                key={i}
                className="list-group-item d-flex justify-content-between align-items-center"
              >
                <div>
                  <strong>{it.food_name}</strong>
                  <div className="small text-muted">{it.category}</div>
                </div>
                <div className="text-end small">
                  <div>{it.qty} {it.unit}</div>
                  <div className="text-muted">
                    Exp: {new Date(it.expiry_date).toLocaleDateString()}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}

      {grouped.length === 0 && !stock.loading && (
        <p className="text-muted mt-4">No donations found.</p>
      )}
      {stock.loading && <p className="text-muted mt-4">Loading…</p>}
      {stock.error && <p className="text-danger mt-4">Failed to load donations.</p>}
    </div>
  );
}
