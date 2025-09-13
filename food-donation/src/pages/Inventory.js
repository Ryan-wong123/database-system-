import { useState, useMemo } from 'react';
import UseFetchData from '../hooks/useFetchData';
import { InventoryAPI } from '../services/api';
import ItemCard from '../components/ItemCard';

export default function Inventory() {
  // Try fetching from API
  const { data, loading } = UseFetchData(() => InventoryAPI.list(), []);
  const [search, setSearch] = useState('');

  // ------------------------
  // Fake data for demo
  // ------------------------
  const fakeData = {
    items: [
      {
        item_id: 1,
        name: 'Rice (5kg bag)',
        category: 'Grain',
        qty: 20,
        expiry_date: '2025-09-30',
        location_id: 'L1',
        location_name: 'Tampines Community Fridge',
      },
      {
        item_id: 2,
        name: 'Fresh Milk (1L)',
        category: 'Dairy',
        qty: 15,
        expiry_date: '2025-09-18',
        location_id: 'L2',
        location_name: 'Jurong West Community Fridge',
      },
      {
        item_id: 3,
        name: 'Canned Beans',
        category: 'Canned Food',
        qty: 40,
        expiry_date: '2026-01-15',
        location_id: 'L1',
        location_name: 'Tampines Community Fridge',
      },
      {
        item_id: 4,
        name: 'Apples',
        category: 'Fruit',
        qty: 12,
        expiry_date: '2025-09-16',
        location_id: 'L3',
        location_name: 'Hougang Community Fridge',
      },
    ],
  };

  // Use API response if it has items, otherwise fall back to fake data
  const itemsData = data?.items?.length ? data : fakeData;

  // Filter items based on search query (name/category/location)
  const filteredItems = useMemo(() => {
    if (!itemsData?.items) return [];
    const q = search.trim().toLowerCase();
    if (!q) return itemsData.items;
    return itemsData.items.filter((it) =>
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
    // Return sorted by location name (optional)
    return Array.from(map.values()).sort((a, b) =>
      a.location_name.localeCompare(b.location_name)
    );
  }, [filteredItems]);

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
          placeholder="Search by name, category, or location..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Grouped Inventory by Location */}
      {groupedByLocation.length === 0 && !loading && (
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
