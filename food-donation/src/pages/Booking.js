// Booking.js (drop-in replacement)
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import UseFetchData from '../hooks/useFetchData';
import { BookingAPI, InventoryAPI, LocationsAPI, HouseholdAPI } from '../services/api';

export default function Booking() {
  const [form, setForm] = useState({ location_id: '', slot_start: '', slot_end: '' });
  const [requested, setRequested] = useState([{ item_id: '', qty: 1 }]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const nav = useNavigate();

  // Require household membership (redirect to profile if missing)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await HouseholdAPI.me();
        const household = res?.data?.data ?? res?.data?.household ?? res?.household ?? null;
        if (!mounted) return;
        if (!household) nav('/profile?reason=no-household', { replace: true });
      } catch {
        if (mounted) nav('/profile?reason=no-household', { replace: true });
      }
    })();
    return () => { mounted = false; };
  }, [nav]);

  const setField = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  // Data sources
  const locations = UseFetchData(() => LocationsAPI.list(), []);

  // Refetch inventory when a location is chosen
  const inventory = UseFetchData(
  () => {
    if (!form.location_id) return Promise.resolve({ data: [] });
    const locId = Number(form.location_id);
    return InventoryAPI.list({ location_id: locId }); // server accepts this param
  },
  [form.location_id] // <— refetch when location changes
);

  // Row helpers for requested items
  const updateRequested = (idx, key, value) =>
    setRequested((rows) => {
      const next = [...rows];
      next[idx] = { ...next[idx], [key]: value };
      return next;
    });
  const addRequested = () => setRequested((rows) => [...rows, { item_id: '', qty: 1 }]);
  const removeRequested = (idx) => setRequested((rows) => rows.filter((_, i) => i !== idx));

  // Options
  const locationOptions = Array.isArray(locations.data) ? locations.data : [];
const invRows = useMemo(() => {
  const d = inventory.data;
  if (Array.isArray(d)) return d;                 // plain array (db/queries.js -> rows)
  if (d && Array.isArray(d.items)) return d.items; // wrapped { items: [...] } (Inventory page style)
  return [];
}, [inventory.data]);
  // Build item options from inventory (aggregate lots by food_item_id at the selected location)
 const itemOptions = useMemo(() => {
  const today = new Date().toISOString().slice(0,10);
  const map = new Map(); // id -> { name, total }

  for (const row of invRows) {
    const fid = Number(row.food_item_id ?? row.item_id ?? row.id);
    const qty = Number(row.qty ?? row.quantity ?? 0);
    const exp = String(row.expiry_date ?? row.expiry ?? '') || null;
    if (!Number.isInteger(fid) || qty <= 0) continue;
    if (exp && exp < today) continue;

    const name = String(row.name ?? row.label ?? `Item #${fid}`);
    map.set(fid, { name, total: (map.get(fid)?.total ?? 0) + qty });
  }

  return Array.from(map.entries())
    .sort((a, b) => a[1].name.localeCompare(b[1].name, undefined, { sensitivity: 'base' }))
    .map(([id, v]) => ({ id, label: `${v.name} (${v.total} available)`, total: v.total, disabled: v.total <= 0 }));
}, [invRows]);
  // If location changes, clear selections not valid for this location
  useEffect(() => {
    const validIds = new Set(itemOptions.filter(o => !o.disabled).map(o => o.id));
    setRequested(rows =>
      rows.map(r => (r.item_id && !validIds.has(Number(r.item_id)) ? { item_id: '', qty: r.qty } : r))
    );
  }, [form.location_id, itemOptions]);

  // Validate form + requested items
  const validate = () => {
    if (!String(form.location_id).trim()) {
      setMessage('Location is required.');
      return false;
    }
    if (!form.slot_start || !form.slot_end) {
      setMessage('Pickup start and end times are required.');
      return false;
    }
    const start = new Date(form.slot_start);
    const end = new Date(form.slot_end);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      setMessage('Invalid date/time selection.');
      return false;
    }
    if (end <= start) {
      setMessage('End time must be after start time.');
      return false;
    }
    if (!Array.isArray(requested) || requested.length === 0) {
      setMessage('Please add at least one requested item.');
      return false;
    }
    for (let i = 0; i < requested.length; i++) {
      const row = requested[i];
      const idNum = Number(row.item_id);
      if (!Number.isInteger(idNum) || idNum <= 0) {
        setMessage(`Row ${i + 1}: Please select a valid item.`);
        return false;
      }
      const opt = itemOptions.find(o => o.id === idNum);
      if (!opt) {
        setMessage(`Row ${i + 1}: Selected item is not in inventory for this location.`);
        return false;
      }
      const q = Number(row.qty);
      if (!Number.isFinite(q) || q < 1) {
        setMessage(`Row ${i + 1}: Quantity must be at least 1.`);
        return false;
      }
      // Optional: prevent exceeding available quantity at this location
      if (q > opt.total) {
        setMessage(`Row ${i + 1}: Only ${opt.total} available for this item at this location.`);
        return false;
      }
    }
    return true;
  };

  // Submit
  const submit = async (e) => {
    e.preventDefault();
    setMessage('');
    if (!validate()) return;

    const payload = {
      location_id: Number(form.location_id),
  slot_start: new Date(form.slot_start).toISOString(),
  slot_end:   new Date(form.slot_end).toISOString(),
  items: requested.map(r => ({ food_item_id: Number(r.item_id), qty: Number(r.qty) })),
    };

    setBusy(true);
    try {
      await BookingAPI.create(payload); // backend validates again
      setMessage('Booking created!');
      setForm({ location_id: '', slot_start: '', slot_end: '' });
      setRequested([{ item_id: '', qty: 1 }]);
    } catch (err) {
      setMessage(err?.response?.data?.message || 'Failed to create booking.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="d-grid gap-3">
      <h1 className="h4">Book a Collection Slot</h1>

      <form className="card shadow-sm" onSubmit={submit}>
        <div className="card-body d-grid gap-3">
          <h2 className="h5 mb-0">New Booking</h2>

          {/* Location */}
          <div>
            <label className="form-label">Location</label>
            <select
              className="form-select"
              value={form.location_id}
              onChange={(e) => setField('location_id', e.target.value)}
              required
              disabled={locations.loading}
            >
              <option value="" disabled>
                {locations.loading ? 'Loading locations…' : 'Select a location'}
              </option>
              {locationOptions.map((loc) => (
                <option key={loc.location_id ?? loc.id} value={loc.location_id ?? loc.id}>
                  {loc.name}
                </option>
              ))}
            </select>
            {locations.error && (
              <div className="text-danger small mt-1">Failed to load locations.</div>
            )}
          </div>

          {/* Times */}
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label">Pickup Start</label>
              <input
                type="datetime-local"
                className="form-control"
                value={form.slot_start}
                onChange={(e) => setField('slot_start', e.target.value)}
                required
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">Pickup End</label>
              <input
                type="datetime-local"
                className="form-control"
                value={form.slot_end}
                onChange={(e) => setField('slot_end', e.target.value)}
                required
              />
            </div>
            <div className="form-text">
              Choose your exact start and end times. The end time must be after the start time.
            </div>
          </div>

          {/* Items */}
          <div>
            <h3 className="h6 mb-2">Requested Items</h3>
            <div className="table-responsive">
              <table className="table align-middle">
                <thead>
                  <tr>
                    <th style={{ minWidth: 280 }}>Item (from inventory)</th>
                    <th style={{ width: 140 }}>Quantity</th>
                    <th style={{ width: 120 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {requested.map((row, idx) => (
                    <tr key={idx}>
                      <td>
                        <select
  className="form-select"
  value={row.item_id}
  onChange={(e) => updateRequested(idx, 'item_id', e.target.value)}
  required
  disabled={inventory.loading || !form.location_id}
>
  <option value="" disabled>
    {!form.location_id ? 'Select a location first' : (inventory.loading ? 'Loading inventory…' : 'Select an item')}
  </option>
  {itemOptions.map(it => (
    <option key={it.id} value={it.id} disabled={it.disabled}>{it.label}</option>
  ))}
</select>

                        {inventory.error && (
                          <div className="text-danger small mt-1">Failed to load items.</div>
                        )}
                      </td>
                      <td>
                        <input
                          type="number"
                          className="form-control"
                          min="1"
                          value={row.qty}
                          onChange={(e) =>
                            updateRequested(idx, 'qty', Math.max(1, Number(e.target.value)))
                          }
                          required
                        />
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-outline-danger w-100"
                          onClick={() => removeRequested(idx)}
                          disabled={requested.length === 1}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button type="button" className="btn btn-outline-secondary" onClick={addRequested}>
              Add Item
            </button>
          </div>

          {/* Submit */}
          <div className="d-flex gap-2">
            <button type="submit" className="btn btn-success" disabled={busy}>
              {busy ? 'Saving…' : 'Confirm Booking'}
            </button>
            {message && <div className="align-self-center text-muted">{message}</div>}
          </div>
        </div>
      </form>
    </div>
  );
}
