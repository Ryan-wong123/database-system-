import { useState, useMemo } from 'react';
import UseFetchData from '../hooks/useFetchData';
import { DonationAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function DonationHistory() {
  const [search, setSearch] = useState('');

  // Use the useAuth hook properly
  const { user } = useAuth();

  // Extract donor ID - check multiple sources
  let donorId = user?.id || user?.user_id;

  // Fallback: check localStorage directly and try to extract from token
  if (!donorId) {
    const raw = localStorage.getItem('auth:user');
    if (raw) {
      try {
        const stored = JSON.parse(raw);
        donorId = stored?.id || stored?.user_id;

        // If still no ID, try to decode the JWT token
        if (!donorId && stored?.token) {
          try {
            const tokenParts = stored.token.split('.');
            if (tokenParts.length === 3) {
              const payload = JSON.parse(atob(tokenParts[1]));
              donorId = payload?.id || payload?.user_id || payload?.userId;
              console.log('Extracted ID from JWT:', donorId);
            }
          } catch (e) {
            console.error('Failed to decode JWT', e);
          }
        }
      } catch (e) {
        console.error('Failed to parse auth:user', e);
      }
    }
  }

  // Debug logging
  console.log('DonationHistory - user:', user);
  console.log('DonationHistory - donorId:', donorId);

  // Fetch donor's donation history
  let stock = { data: null, loading: false, error: null };
  if (donorId) {
    stock = UseFetchData(() => DonationAPI.DonationHistory(donorId), [donorId]);
  }

  console.log('DonationHistory - stock:', stock);

  const items = Array.isArray(stock.data?.items) ? stock.data.items : [];
  console.log('DonationHistory - items:', items);

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
                  <div
                    className={`badge text-uppercase mt-1 ${it.approve_status === 'pending'
                      ? 'bg-warning text-dark'
                      : it.approve_status === 'confirmed'
                        ? 'bg-success'
                        : it.approve_status === 'cancelled'
                          ? 'bg-danger'
                          : 'bg-secondary'
                      }`}
                  >
                    {it.approve_status || 'unknown'}
                  </div>
                </div>
                <div className="text-end small">
                  <div>{it.qty} {it.unit}</div>
                  <div className="text-muted">
                    Exp: {new Date(it.expiry_date).toLocaleDateString()}
                  </div>
                  {it.approve_status === 'pending' && (
                    <button
                      className="btn btn-sm btn-outline-danger mt-2"
                      onClick={async () => {
                        if (window.confirm("Are you sure you want to cancel this donation?")) {
                          try {
                            await DonationAPI.cancel(it.donation_id);
                            alert("Donation cancelled successfully!");
                            window.location.reload();
                          } catch (err) {
                            console.error(err);
                            alert("Failed to cancel donation.");
                          }
                        }
                      }}
                    >
                      Cancel
                    </button>
                  )}
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