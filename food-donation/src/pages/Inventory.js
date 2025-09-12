import UseFetchData from '../hooks/useFetchData';
import { InventoryAPI } from '../services/api';
import ItemCard from '../components/ItemCard';

export default function Inventory() {
  const { data, loading } = UseFetchData(() => InventoryAPI.list(), []);

  return (
    <div className="d-grid gap-3">
      <div className="d-flex justify-content-between align-items-center">
        <h1 className="h4 mb-0">Inventory</h1>
        {loading && <span className="text-muted small">Loading…</span>}
      </div>
      <div className="row g-3">
        {(data?.items || []).map((it) => (
          <div key={it.item_id} className="col-md-6">
            <ItemCard name={it.name} category={it.category} qty={it.qty} expiry={it.expiry_date} />
          </div>
        ))}
      </div>
    </div>
  );
}
