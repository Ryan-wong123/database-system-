import { useMemo, useState } from 'react';
import UseFetchData from '../hooks/useFetchData';
import { InventoryAPI } from '../services/api';
import ItemCard from '../components/ItemCard';

export default function Inventory() {
  const [search, setSearch] = useState('');

  // Unified fetch via hook
  const stock = UseFetchData(() => InventoryAPI.list({ inStockOnly: true }), []);

  const itemsData = stock.data || { items: [] };

  // Filter items based on search query (name/category/location)
  const filteredItems = useMemo(() => {
    const list = Array.isArray(itemsData.items) ? itemsData.items : [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((it) =>
      [it.name, it.category, it.location_name]
        .filter(Boolean)
        .some((val) => String(val).toLowerCase().includes(q))
    );
  }, [itemsData, search]);

  // Group filtered items by location
  const groupedByLocation = useMemo(() => {
    const map = new Map();
    for (const it of filteredItems) {
      const key = it.location_id || it.location_name || 'unknown';
      if (!map.has(key)) {
        map.set(key, {
          location_id: key,
          location_name: it.location_name || 'Unknown Location',
          items: [],
        });
      }
      map.get(key).items.push(it);
    }
    return Array.from(map.values()).sort((a, b) =>
      a.location_name.localeCompare(b.location_name)
    );
  }, [filteredItems]);

  return (
    <div className="d-grid gap-3">
      <div className="d-flex justify-content-between align-items-center">
        <h1 className="h4 mb-0">Inventory</h1>
        {stock.loading && <span className="text-muted small">Loading…</span>}
        {stock.error && <span className="text-danger small">Failed to load.</span>}
      </div>

      <div className="mb-3">
        <input
          type="text"
          className="form-control"
          placeholder="Search by name, category, or location..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {groupedByLocation.length === 0 && !stock.loading && (
        <p className="text-muted">No items found.</p>
      )}

      {groupedByLocation.map((group) => (
        <div key={group.location_id} className="mb-4">
          <div className="d-flex align-items-baseline justify-content-between mb-2">
            <h2 className="h5 mb-0">{group.location_name}</h2>
            <span className="badge text-bg-secondary">
              {group.items.length} item{group.items.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="row g-3">
            {group.items.map((it) => (
              <div key={it.item_id} className="col-md-6">
                <ItemCard
                  name={it.name}
                  category={it.category}
                  qty={it.qty}
                  expiry={it.expiry_date}
                />
                <div className="small text-muted ms-1">📍 {group.location_name}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
