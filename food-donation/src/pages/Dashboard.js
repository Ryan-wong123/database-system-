import useApi from '../hooks/useApi';
import { DonationAPI, InventoryAPI } from '../services/api';

export default function Dashboard() {
  const recent = useApi(() => DonationAPI.listRecent({ limit: 5 }), []);
  const stock  = useApi(() => InventoryAPI.list({ inStockOnly: true }), []);

  return (
    <div className="d-grid gap-4">
      <h1 className="h4">Admin Dashboard</h1>

      <div className="card shadow-sm">
        <div className="card-body">
          <h2 className="h5">Recent Donations</h2>
          <ul className="list-group">
            {(recent.data?.donations || []).map((d) => (
              <li key={d.donation_id} className="list-group-item d-flex justify-content-between">
                <span>
                  <strong>#{d.donation_id}</strong> — Location {d.location_id}
                </span>
                <small className="text-muted">{new Date(d.created_at).toLocaleString()}</small>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="card shadow-sm">
        <div className="card-body">
          <h2 className="h5">In-Stock Items</h2>
          <ul className="list-group">
            {(stock.data?.items || []).map((it) => (
              <li key={it.item_id} className="list-group-item d-flex justify-content-between">
                <span>{it.name}</span>
                <span className="badge text-bg-secondary">{it.qty}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
