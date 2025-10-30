import { useState, useMemo, useEffect } from 'react';
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

  const [items, setItems] = useState([]);

  useEffect(() => {
    if (Array.isArray(stock.data?.items)) {
      setItems(stock.data.items);
    }
  }, [stock.data]);

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

  // Group donations by location → then by donation_id
  const grouped = useMemo(() => {
    const map = new Map();

    for (const it of filtered) {
      const locKey = it.location_name || 'Unknown';
      if (!map.has(locKey)) map.set(locKey, new Map());

      const donationMap = map.get(locKey);
      if (!donationMap.has(it.donation_id)) donationMap.set(it.donation_id, []);
      donationMap.get(it.donation_id).push(it);
    }

    // Convert to array structure: [location, [ [donation_id, items], ... ]]
    return [...map.entries()].map(([loc, donationMap]) => [
      loc,
      [...donationMap.entries()]
    ]);
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
      {grouped.map(([loc, donations]) => (
        <div key={loc} className="mb-4">
          <h5 className="fw-semibold text-primary mb-2">{loc}</h5>

          {donations.map(([donationId, items]) => {
            const status = items[0].approve_status;
            const createdAt = new Date(items[0].donated_at).toLocaleString();

            return (
              <div key={donationId} className="border rounded p-3 mb-3 shadow-sm">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <div>
                    <span className="fw-bold">Donation #{donationId}</span>
                    <div className="text-muted small">Donated on: {createdAt}</div>
                    <div
                      className={`badge text-uppercase mt-1 ${status === 'pending'
                        ? 'bg-warning text-dark'
                        : status === 'confirmed'
                          ? 'bg-success'
                          : status === 'cancelled'
                            ? 'bg-danger'
                            : 'bg-secondary'
                        }`}
                    >
                      {status}
                    </div>
                  </div>

                  {status === 'pending' && (
                    <button
                      className="btn btn-sm btn-outline-danger"
                      onClick={async () => {
                        if (window.confirm(`Cancel donation #${donationId}?`)) {
                          try {
                            const res = await DonationAPI.cancel(donationId);
                            if (res.data.ok) {
                              alert(`Donation #${donationId} cancelled successfully!`);

                              // Update local state instantly
                              setItems(prev =>
                                prev.map(it =>
                                  it.donation_id === donationId
                                    ? { ...it, approve_status: 'cancelled' }
                                    : it
                                )
                              );
                            } else {
                              alert("Failed to cancel donation.");
                            }
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

                <ul className="list-group small">
                  {items.map((it, i) => (
                    <li
                      key={i}
                      className="list-group-item d-flex justify-content-between align-items-center"
                    >
                      <div>
                        <strong>{it.food_name}</strong>
                        <div className="text-muted">{it.category}</div>
                      </div>
                      <div className="text-end">
                        {it.qty} {it.unit}
                        <div className="text-muted">
                          Exp: {new Date(it.expiry_date).toLocaleDateString()}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
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
