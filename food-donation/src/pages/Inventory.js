import { useState, useMemo } from 'react';
import UseFetchData from '../hooks/useFetchData';
import { InventoryAPI } from '../services/api';
import ItemCard from '../components/ItemCard';

export default function Inventory() {
  const { data, loading } = UseFetchData(() => InventoryAPI.list(), []);
  const [search, setSearch] = useState(''); // <-- search state

  // Filter items based on search query
  const filteredItems = useMemo(() => {
    if (!data?.items) return [];
    return data.items.filter((it) =>
      it.name.toLowerCase().includes(search.toLowerCase()) ||
      it.category.toLowerCase().includes(search.toLowerCase())
    );
  }, [data, search]);

  return (
    <div className="d-grid gap-3">
      <div className="d-flex justify-content-between align-items-center">
        <h1 className="h4 mb-0">Inventory</h1>
        {loading && <span className="text-muted small">Loading…</span>}
      </div>

      {/* Search Bar */}
      <div className="mb-3">
        <input
          type="text"
          className="form-control"
          placeholder="Search by name or category..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Inventory List */}
      <div className="row g-3">
        {filteredItems.map((it) => (
          <div key={it.item_id} className="col-md-6">
            <ItemCard
              name={it.name}
              category={it.category}
              qty={it.qty}
              expiry={it.expiry_date}
            />
          </div>
        ))}
        {filteredItems.length === 0 && !loading && (
          <p className="text-muted">No items found.</p>
        )}
      </div>
    </div>
  );
}
