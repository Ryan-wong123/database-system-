import { useEffect, useMemo, useState } from 'react';
import UseFetchData from '../hooks/useFetchData';
import { InventoryAPI, RecommendationsAPI } from '../services/api'; // ← NEW
import ItemCard from '../components/ItemCard';

// ← NEW: small helper to normalize API shapes
function toArray(maybe) {
  if (Array.isArray(maybe)) return maybe;
  if (!maybe || typeof maybe !== 'object') return [];
  if (Array.isArray(maybe.results)) return maybe.results;     // { ok, results: [...] }
  if (Array.isArray(maybe.data)) return maybe.data;           // axios-like
  if (Array.isArray(maybe.rows)) return maybe.rows;           // PG style
  if (maybe.data && Array.isArray(maybe.data.results)) return maybe.data.results;
  return [];
}

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

  // =========================
  // NEW: Similar items (vector)
  // =========================
  const [similar, setSimilar] = useState({ loading: false, data: [], error: null });

  async function runSimilarSearch(q) {
    const query = q.trim();
    if (!query) {
      setSimilar({ loading: false, data: [], error: null });
      return;
    }
    try {
      setSimilar((prev) => ({ ...prev, loading: true, error: null }));
      const resp = await RecommendationsAPI.semanticSearch({ q: query });
      const results = toArray(resp);

      // Map to ItemCard props (using denormalized fields if present)
      const arr = results.map((r) => ({
        id: r.item_id ?? r.id,
        name: r.name ?? r.item_name ?? '(Unnamed item)',
        category: r.category ?? '',
        qty: Number(r.qty ?? r.qty_total ?? 0),
        expiry: r.expiry ?? r.min_expiry ?? null,
        location:
          r.primary_location_name ||
          r.locations_display ||
          (Array.isArray(r.locations) && r.locations[0]?.name) ||
          '',
      }));

      setSimilar({ loading: false, data: arr, error: null });
    } catch (err) {
      console.error('❌ Similar (vector) search error:', err);
      setSimilar({ loading: false, data: [], error: 'Failed to load similar items' });
    }
  }

  // Debounced effect: whenever search changes, refresh the similar strip
  useEffect(() => {
    const t = setTimeout(() => {
      runSimilarSearch(search);
    }, 300); // debounce ~300ms
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const showSimilarStrip =
    !!search.trim() && !similar.loading && !similar.error && similar.data.length > 0;

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

      {/* ============================== */}
      {/* NEW: Similar items (vector) UI */}
      {/* ============================== */}
      <hr className="my-3" />
      <div className="d-flex align-items-center justify-content-between">
        <h3 className="h6 mb-0">Similar items</h3>
        {similar.loading && <span className="text-muted small">Searching…</span>}
      </div>
      {similar.error && <div className="text-danger small mt-1">{similar.error}</div>}
      <div
        className="d-flex gap-3 overflow-auto pb-2 mt-2"
        style={{ scrollSnapType: 'x mandatory', whiteSpace: 'nowrap' }}
      >
        {showSimilarStrip ? (
          similar.data.map((it) => (
            <div
              key={it.id}
              className="card shadow-sm p-2"
              style={{ minWidth: 260, scrollSnapAlign: 'start' }}
            >
              <ItemCard
                name={it.name}
                category={it.category}
                qty={it.qty}
                expiry={it.expiry}
              />
              {it.location && (
                <div className="small text-muted ms-1 mt-1">📍 {it.location}</div>
              )}
            </div>
          ))
        ) : (
          <div className="text-muted small">Type in the search box to see similar items.</div>
        )}
      </div>
    </div>
  );
}
