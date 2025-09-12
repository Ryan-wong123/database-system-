import useApi from '../hooks/useApi';
import { InventoryAPI } from '../services/api';
import ItemCard from '../components/ItemCard';

export default function Home() {
  const { data, loading } = useApi(() => InventoryAPI.getNearingExpiry(), []);

  return (
    <div className="d-grid gap-3">
      <div className="card shadow-sm">
        <div className="card-body">
          <h2 className="h4 mb-1">Welcome to the Community Fridge Network</h2>
          <p className="text-muted mb-0">
            Reduce food waste. Support households. Book pickups and donate.
          </p>
        </div>
      </div>

      <section>
        <div className="d-flex justify-content-between align-items-center mb-2">
          <h3 className="h5 mb-0">Nearing Expiry</h3>
          {loading && <span className="text-muted small">Loading…</span>}
        </div>
        <div className="row g-3">
          {(data?.items || []).map((it) => (
            <div key={it.item_id} className="col-md-6">
              <ItemCard name={it.name} category={it.category} qty={it.qty} expiry={it.expiry_date} />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
