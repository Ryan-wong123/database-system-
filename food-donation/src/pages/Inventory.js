import { useMemo, useState } from 'react';
import UseFetchData from '../hooks/useFetchData';
import { InventoryAPI, RecommendationsAPI } from '../services/api';
import ItemCard from '../components/ItemCard';

// Normalize anything -> array
function toArray(maybe) {
  if (Array.isArray(maybe)) return maybe;
  if (!maybe || typeof maybe !== 'object') return [];
  if (Array.isArray(maybe.results)) return maybe.results;     // { ok, results: [...] }
  if (Array.isArray(maybe.data)) return maybe.data;           // axios/hook shape
  if (Array.isArray(maybe.rows)) return maybe.rows;           // PG style
  if (maybe.data && Array.isArray(maybe.data.results)) return maybe.data.results;
  return [];
}

export default function Inventory() {
  const [search, setSearch] = useState('');
  const [semantic, setSemantic] = useState({ loading: false, data: null, error: null });

  // If UseFetchData returns { data, loading, error }, this still works:
  const stockResp = UseFetchData(() => InventoryAPI.list({ inStockOnly: true }), []);
  const stockArray = toArray(stockResp?.data ?? stockResp);

  async function doSemanticSearch(e) {
    e.preventDefault();
    const q = search.trim();
    if (!q) {
      setSemantic({ loading: false, data: null, error: null });
      return;
    }
    setSemantic({ loading: true, data: null, error: null });
    try {
      const resp = await RecommendationsAPI.semanticSearch({ q });
      setSemantic({ loading: false, data: resp, error: null });
    } catch (err) {
      console.error(err);
      setSemantic({ loading: false, data: null, error: 'Search failed' });
    }
  }

  const itemsToShow = useMemo(() => {
  const semResults = toArray(semantic?.data);

  console.log("🔵 [FRONTEND] semantic results normalized:", semResults);

  if (semantic?.data?.ok && semResults.length) {
    const arr = semResults.map((r) => ({
      id: r.item_id ?? r.id,
      name: r.name,
      qty: r.qty,
      score: r.score,
    }));

    console.log("🟢 [FRONTEND] itemsToShow (semantic):", arr);

    return arr;
  }

  console.log("🟡 [FRONTEND] itemsToShow (stock):", stockArray);

  return stockArray.map((row) => ({
    id: row.item_id ?? row.food_item_id,
    name: row.name ?? row.item_name,
    qty: row.qty_total ?? row.qty_on_hand,
  }));
}, [semantic, stockArray]);


  return (
    <div className="p-4">
      <form onSubmit={doSemanticSearch} className="mb-4 flex gap-2">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search (e.g. 'halal chicken', 'dairy-free', 'fresh greens')"
          className="border rounded px-3 py-2 flex-1"
        />
        <button className="bg-blue-600 text-white rounded px-4">Search</button>
      </form>

      {semantic.loading && <div>Searching…</div>}
      {semantic.error && <div className="text-red-600">{semantic.error}</div>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {itemsToShow.map(it => (
          <ItemCard
            key={it.id}
            name={it.name}
            category={it.category ?? ""}
            qty={it.qty}
            expiry={it.expiry}
          />
        ))}

      </div>
    </div>
  );
}
