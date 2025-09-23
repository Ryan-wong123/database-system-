import { useMemo, useState } from 'react';
import UseFetchData from '../hooks/useFetchData';
import { BookingAPI, InventoryAPI, LocationsAPI } from '../services/api';

function StatusPill({ value }) {
  const cls =
    value === 'confirmed' ? 'text-bg-success' :
    value === 'pending'   ? 'text-bg-secondary' :
    value === 'cancelled' ? 'text-bg-danger' :
    value === 'completed' ? 'text-bg-primary' : 'text-bg-light';
  return <span className={`badge ${cls}`}>{value}</span>;
}

export default function Dashboard() {
  // Locations via hook
  const locations = UseFetchData(() => LocationsAPI.list(), []);
  const locationName = (id) =>
    (Array.isArray(locations.data) ? locations.data : []).find((l) => String(l.id) === String(id))?.name || 'Unknown';

  // Bookings & stock via hook (already present)
  const bookings = UseFetchData(() => BookingAPI.adminList({ limit: 20 }), []);
  const stock    = UseFetchData(() => InventoryAPI.list({ inStockOnly: true }), []);

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
      const res = await InventoryAPI.list({ inStockOnly: true });
      stock.setData(res.data);
      setEditRow(null);
    } catch (e) {
      console.error('Failed to save inventory', e);
      alert('Could not save changes.');
    }
  };

  const updateBookingStatus = async (id, newStatus) => {
    try {
      await BookingAPI.updateStatus(id, { status: newStatus });
      bookings.setData((prev) => {
        const rows = prev?.bookings || [];
        return { ...prev, bookings: rows.map((b) => (b.booking_id === id ? { ...b, status: newStatus } : b)) };
      });
    } catch (e) {
      console.error('Failed to update booking', e);
      alert('Could not update booking status.');
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

      {/* Bookings */}
      <div className="card shadow-sm">
        <div className="card-body d-grid gap-3">
          <h2 className="h5 mb-0">Manage Bookings</h2>
          <div className="table-responsive">
            <table className="table align-middle">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Household</th>
                  <th>Location</th>
                  <th>Start</th>
                  <th>End</th>
                  <th>Status</th>
                  <th style={{ width: 200 }}>Change Status</th>
                </tr>
              </thead>
              <tbody>
                {(bookings.data?.bookings || []).map((b) => (
                  <tr key={b.booking_id}>
                    <td><strong>{b.booking_id}</strong></td>
                    <td>{b.household_name || b.household_id}</td>
                    <td>{b.location_name || b.location_id}</td>
                    <td>{new Date(b.slot_start_time).toLocaleString()}</td>
                    <td>{new Date(b.slot_end_time).toLocaleString()}</td>
                    <td><StatusPill value={b.status} /></td>
                    <td>
                      <select
                        className="form-select form-select-sm"
                        value={b.status}
                        onChange={(e) => updateBookingStatus(b.booking_id, e.target.value)}
                      >
                        <option value="pending">Pending</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="completed">Completed</option>
                      </select>
                    </td>
                  </tr>
                ))}
                {(!bookings.data?.bookings || bookings.data.bookings.length === 0) && (
                  <tr><td colSpan={7} className="text-muted">No bookings.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Inventory */}
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
                          <button className="btn btn-sm btn-outline-primary" onClick={() => setEditRow(it)}>Edit</button>
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
