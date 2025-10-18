// src/pages/DonationHistory.js
import { useState } from 'react';

export default function DonationHistory() {
  const [search, setSearch] = useState('');

  return (
    <div className="d-grid gap-3">
      <div className="d-flex justify-content-between align-items-center">
        <h1 className="h4 mb-0">Donation History</h1>
      </div>

      {/* Search */}
      <div className="mb-3">
        <input
          type="text"
          className="form-control"
          placeholder="Search by item, category, or location..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>


    </div>
  );
}
