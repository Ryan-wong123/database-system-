// src/pages/DonationHistory.js
import { useMemo, useState } from 'react';
import UseFetchData from '../hooks/useFetchData';
import { useAuth } from '../context/AuthContext';
import { DonationAPI } from '../services/api';
import ItemCard from '../components/ItemCard';

function normalizeRows(raw, role) {
  // Supports a few common shapes:
  // { donations: [...] } | { data: [...] } | [...]
  const rows = Array.isArray(raw?.donations)
    ? raw.donations
    : Array.isArray(raw?.data)
    ? raw.data
    : Array.isArray(raw)
    ? raw
    : [];

  return rows.map((d, i) => {
    const id = d.id ?? d.donation_id ?? `row-${i}`;

    // Item fields
    const name = d.food_name ?? d.item_name ?? d.name ?? 'Unknown Item';
    const category = d.category ?? d.item_category ?? '';
    const qty = d.quantity ?? d.qty ?? 0;
    const expiry = d.expiry_date ?? d.expiry ?? null;
    const location =
      d.location_name ??
      d.location?.name ??
      d.fridge_name ??
      d.location ??
      '';

    // Counterparty (depends on role and what backend returns)
    const recipientName = d.recipient_name ?? d.household_name ?? d.receiver_name;
    const donorName = d.donor_name ?? d.giver_name;

    // Prefer a consistent label for UI
    const counterparty =
      role === 'donor'
        ? recipientName || '—'
        : donorName || d.donor_email || '—';

    return {
      id,
      name,
      category,
      qty,
      expiry,
      location,
      counterparty,
    };
  });
}

export default function DonationHistory() {
  const { user } = useAuth();
  const role = user?.role; // 'donor' | 'household' | 'admin' | etc.

  // Fetch history (backend should return the authenticated user's view)
  const { data, loading, error } = UseFetchData(
    () => DonationAPI.myDonations(),
    []
  );

  // --- Fake fallback so UI renders even without backend ---
  const fallback = useMemo(() => {
    if (role === 'donor') {
      return {
        donations: [
          {
            id: 'D-1001',
            food_name: 'Rice (5kg)',
            category: 'Grain',
            quantity: 2,
            expiry_date: '2025-10-01',
            recipient_name: 'Lee Family',
            location_name: 'Tampines Community Fridge',
          },
          {
            id: 'D-1002',
            food_name: 'Fresh Milk (1L)',
            category: 'Dairy',
            quantity: 6,
            expiry_date: '2025-09-25',
            recipient_name: 'Aisha Household',
            location_name: 'Bedok Community Fridge',
          },
        ],
      };
    }
    // Donee (household) fallback
    return {
      donations: [
        {
          id: 'R-2001',
          food_name: 'Canned Beans',
          category: 'Canned Food',
          quantity: 3,
          expiry_date: '2026-01-15',
          donor_name: 'Tan Wei Ming',
          location_name: 'Jurong West Community Fridge',
        },
        {
          id: 'R-2002',
          food_name: 'Apples',
          category: 'Fruit',
          quantity: 5,
          expiry_date: '2025-09-20',
          donor_name: 'Good Foods Ltd.',
          location_name: 'Hougang Community Fridge',
        },
      ],
    };
  }, [role]);

  const rows = useMemo(() => {
    const source =
      (Array.isArray(data?.donations) ||
        Array.isArray(data?.data) ||
        Array.isArray(data))
        ? data
        : fallback;

    return normalizeRows(source, role);
  }, [data, fallback, role]);

  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      return (
        (r.name || '').toLowerCase().includes(q) ||
        (r.category || '').toLowerCase().includes(q) ||
        (r.location || '').toLowerCase().includes(q) ||
        (r.counterparty || '').toLowerCase().includes(q)
      );
    });
  }, [rows, search]);

  const counterpartyLabel =
    role === 'donor' ? 'Recipient' : role === 'household' ? 'Donor' : 'Counterparty';

  return (
    <div className="d-grid gap-3">
      <div className="d-flex justify-content-between align-items-center">
        <h1 className="h4 mb-0">
          {role === 'donor' ? 'My Donation History' : 'My Received Items'}
        </h1>
        {loading && <span className="text-muted small">Loading…</span>}
        {error && <span className="text-danger small">Failed to load</span>}
      </div>

      {/* Search */}
      <div className="mb-3">
        <input
          type="text"
          className="form-control"
          placeholder={`Search by item, ${counterpartyLabel.toLowerCase()}, category, or location...`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Cards */}
      <div className="row g-3">
        {filtered.map((d) => (
          <div key={d.id} className="col-md-6">
            <ItemCard
              name={d.name}
              category={d.category}
              qty={d.qty}
              expiry={d.expiry}
              extraInfo={
                <>
                  <div>{counterpartyLabel}: {d.counterparty}</div>
                  {d.location ? <div>Location: {d.location}</div> : null}
                </>
              }
            />
          </div>
        ))}

        {!loading && filtered.length === 0 && (
          <p className="text-muted">No records found.</p>
        )}
      </div>
    </div>
  );
}
