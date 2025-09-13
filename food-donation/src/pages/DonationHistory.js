import { useState, useMemo } from 'react';
import UseFetchData from '../hooks/useFetchData';
import { DonationAPI } from '../services/api';
import ItemCard from '../components/ItemCard';

export default function DonationHistory() {
  const { data, loading } = UseFetchData(() => DonationAPI.myDonations(), []);
  const [search, setSearch] = useState('');

  const filteredDonations = useMemo(() => {
    if (!data?.donations) return [];
    return data.donations.filter(d =>
      d.food_name.toLowerCase().includes(search.toLowerCase()) ||
      d.recipient_name.toLowerCase().includes(search.toLowerCase())
    );
  }, [data, search]);

  return (
    <div className="d-grid gap-3">
      <div className="d-flex justify-content-between align-items-center">
        <h1 className="h4 mb-0">Donation History</h1>
        {loading && <span className="text-muted small">Loading…</span>}
      </div>

      <div className="mb-3">
        <input
          type="text"
          className="form-control"
          placeholder="Search by food or recipient..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="row g-3">
        {filteredDonations.map(d => (
          <div key={d.id} className="col-md-6">
            <ItemCard
              name={d.food_name}
              category={d.category}
              qty={d.quantity}
              expiry={d.expiry_date}
              extraInfo={`Recipient: ${d.recipient_name}`}
            />
          </div>
        ))}
        {!loading && filteredDonations.length === 0 && (
          <p className="text-muted">No donation records found.</p>
        )}
      </div>
    </div>
  );
}
