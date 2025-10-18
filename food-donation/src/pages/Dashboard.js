// Dashboard.js
import { useEffect, useMemo, useState } from 'react';
import UseFetchData from '../hooks/useFetchData';
import { BookingAPI, InventoryAPI, LocationsAPI, AdminAPI } from '../services/api';

function StatusPill({ value }) {
  const cls =
    value === 'confirmed' ? 'text-bg-success' :
    value === 'pending'   ? 'text-bg-secondary' :
    value === 'cancelled' ? 'text-bg-danger' :
    value === 'completed' ? 'text-bg-primary' : 'text-bg-light';
  return <span className={`badge ${cls}`}>{value}</span>;
}

export default function Dashboard() {
  // Locations via hook (used by Inventory section)
  const locations = UseFetchData(() => LocationsAPI.list(), []);
  const locationName = (id) =>
    (Array.isArray(locations.data) ? locations.data : [])
      .find((l) => String(l.id) === String(id))?.name || 'Unknown';

  // Stock via hook (Food/Inventory section)
  const stock = UseFetchData(() => AdminAPI.list(), []);

  // === Bookings section (from your integration script) ===
  const [bookings, setBookings] = useState({ data: [] });
  const [loadingBookings, setLoadingBookings] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await BookingAPI.list();
        const raw =
          Array.isArray(res?.data?.data) ? res.data.data :
          Array.isArray(res?.data)       ? res.data :
          [];
        if (alive) setBookings({ data: raw });
      } catch (e) {
        console.error('Failed to load bookings', e);
        if (alive) setBookings({ data: [] });
      } finally {
        if (alive) setLoadingBookings(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const [editRow, setEditRow] = useState(null);
  const startEdit = (row) => setEditRow({ ...row });
  const cancelEdit = () => setEditRow(null);

  const saveEdit = async () => {
    if (!editRow) return;
    try {
      if (editRow.lot_id) {
        await InventoryAPI.updateLot(editRow.lot_id, {
          location_id: editRow.location_id,
          qty: Number(editRow.qty),
          expiry_date: editRow.expiry_date,
        });
      }
      await InventoryAPI.updateItem(editRow.item_id, {
        name: editRow.name,
        category: editRow.category,
      });
      const res = await AdminAPI.list();
      stock.setData(res.data);
      setEditRow(null);
    } catch (e) {
      console.error('Failed to save inventory', e);
      alert('Could not save changes.');
    }
  };

  const groupedStock = useMemo(() => {
    const items = stock.data?.items || [];
    const map = new Map();
    for (const it of items) {
      const key = it.location_id || 'unknown';
      if (!map.has(key)) {
        map.set(key, {
          location_id: key,
          location_name: it.location_name || locationName(key),
          items: [],
        });
      }
      map.get(key).items.push(it);
    }
    return Array.from(map.values());
  }, [stock.data, locations.data]);

  return (
    <div className="d-grid gap-4">
      <h1 className="h4">Admin Dashboard</h1>

      {/* === Bookings (integrated) === */}
      <div className="card shadow-sm">
        <div className="card-body d-grid gap-3">
          <h2 className="h5 mb-0">Manage Bookings</h2>
          <div className="table-responsive">
            <table className="table align-middle">
              <thead>
                <tr>
                  <th>Booking ID</th>
                  <th>Household</th>
                  <th>Location</th>
                  <th>Start</th>
                  <th>End</th>
                  <th>Status</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {loadingBookings ? (
                  <tr><td colSpan={7}>Loading…</td></tr>
                ) : (bookings.data || []).length === 0 ? (
                  <tr><td colSpan={7} className="text-muted">No bookings found.</td></tr>
                ) : (
                  bookings.data.map((b) => (
                    <tr key={b.booking_id}>
                      <td><strong>{b.booking_id}</strong></td>
                      <td>{b.household_name || `HH-${b.household_id}`}</td>
                      <td>{b.location_name ?? `#${b.location_id}`}</td>
                      <td>{new Date(b.slot_start_time).toLocaleString()}</td>
                      <td>{new Date(b.slot_end_time).toLocaleString()}</td>
                      <td><StatusPill value={b.status} /></td>
                      <td>{new Date(b.created_at).toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* === Inventory (Food) === */}
      <div className="card shadow-sm">
        <div className="card-body d-grid gap-3">
          <h2 className="h5 mb-0">Inventory (Edit items & move lots)</h2>

          {editRow && (
            <div className="border rounded p-3 bg-light d-grid gap-3">
              <div className="row g-3">
                <div className="col-md-4">
                  <label className="form-label">Item Name</label>
                  <input className="form-control" value={editRow.name}
                    onChange={(e) => setEditRow({ ...editRow, name: e.target.value })} />
                </div>
                <div className="col-md-3">
                  <label className="form-label">Category</label>
                  <input className="form-control" value={editRow.category}
                    onChange={(e) => setEditRow({ ...editRow, category: e.target.value })} />
                </div>
                {editRow.lot_id && (
                  <>
                    <div className="col-md-2">
                      <label className="form-label">Qty</label>
                      <input type="number" min={0} className="form-control" value={editRow.qty}
                        onChange={(e) => setEditRow({ ...editRow, qty: Number(e.target.value) })} />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label">Expiry</label>
                      <input type="date" className="form-control" value={editRow.expiry_date || ''}
                        onChange={(e) => setEditRow({ ...editRow, expiry_date: e.target.value })} />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Location</label>
                      <select className="form-select" value={editRow.location_id || ''}
                        onChange={(e) => setEditRow({ ...editRow, location_id: e.target.value })}>
                        <option value="">Select location</option>
                        {(Array.isArray(locations.data) ? locations.data : []).map((l) => (
                          <option key={l.id} value={l.id}>{l.name}</option>
                        ))}
                      </select>
                    </div>
                  </>
                )}
              </div>
              <div className="d-flex gap-2">
                <button className="btn btn-primary" onClick={saveEdit}>Save</button>
                <button className="btn btn-outline-secondary" onClick={cancelEdit}>Cancel</button>
              </div>
            </div>
          )}

          {useMemo(() => {
            const groups = [];
            const items = stock.data?.items || [];
            const map = new Map();
            for (const it of items) {
              const key = it.location_id || 'unknown';
              if (!map.has(key)) {
                map.set(key, { location_id: key, location_name: it.location_name || locationName(key), items: [] });
              }
              map.get(key).items.push(it);
            }
            for (const v of map.values()) groups.push(v);
            return groups;
          }, [stock.data, locations.data]).map((g) => (
            <div key={g.location_id} className="mb-3">
              <div className="d-flex justify-content-between align-items-baseline">
                <h3 className="h6 mb-2">{g.location_name}</h3>
                <span className="badge text-bg-secondary">{g.items.length} item{g.items.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="table-responsive">
                <table className="table align-middle">
                  <thead>
                    <tr>
                      <th>Item</th><th>Category</th><th>Qty</th><th>Expiry</th><th style={{ width: 160 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {g.items.map((it) => (
                      <tr key={`${it.item_id}-${it.lot_id || it.location_id}`}>
                        <td>{it.name}</td>
                        <td>{it.category || '—'}</td>
                        <td>{it.qty}</td>
                        <td>{it.expiry_date ? new Date(it.expiry_date).toLocaleDateString() : '—'}</td>
                        <td>
                          <button className="btn btn-sm btn-outline-primary" onClick={() => startEdit(it)}>Edit</button>
                        </td>
                      </tr>
                    ))}
                    {g.items.length === 0 && <tr><td colSpan={5} className="text-muted">No items.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
          {!stock.loading && (!stock.data?.items || stock.data.items.length === 0) && (
            <div className="text-muted">No stock.</div>
          )}
        </div>
      </div>
    </div>
  );
}
