import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import UseFetchData from '../hooks/useFetchData';
import { BookingAPI, InventoryAPI, LocationsAPI, HouseholdAPI } from '../services/api';

export default function Booking() {
  const [form, setForm] = useState({ location_id: '', slot_start: '', slot_end: '' });
  const [requested, setRequested] = useState([{ item_id: '', qty: 1 }]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const nav = useNavigate();

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await HouseholdAPI.me();
        const household = res?.data?.data ?? res?.data?.household ?? res?.household ?? null;
        if (!mounted) return;
        if (!household) nav('/profile?reason=no-household', { replace: true });
      } catch {
        nav('/profile?reason=no-household', { replace: true });
      }
    })();
    return () => { mounted = false; };
  }, [nav]);

  const setField = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const locations = UseFetchData(() => LocationsAPI.list(), []);
  const inventory  = UseFetchData(() => InventoryAPI.list(), []);

  const updateRequested = (idx, key, value) =>
    setRequested((rows) => {
      const next = [...rows];
      next[idx] = { ...next[idx], [key]: value };
      return next;
    });

  const addRequested = () => setRequested((rows) => [...rows, { item_id: '', qty: 1 }]);
  const removeRequested = (idx) => setRequested((rows) => rows.filter((_, i) => i !== idx));

  const validate = () => {
    if (!form.location_id.trim()) {
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
    if (requested.length === 0) {
      setMessage('Please add at least one requested item.');
      return false;
    }
    for (let i = 0; i < requested.length; i++) {
      const row = requested[i];
      if (!String(row.item_id || '').trim()) {
        setMessage(`Row ${i + 1}: Please select an item.`);
        return false;
      }
      const q = Number(row.qty);
      if (!Number.isFinite(q) || q < 1) {
        setMessage(`Row ${i + 1}: Quantity must be at least 1.`);
        return false;
      }
    }
    return true;
  };

  const submit = async (e) => {
    e.preventDefault();
    setMessage('');
    if (!validate()) return;

    const payload = {
      location_id: form.location_id.trim(),
      slot_start: new Date(form.slot_start).toISOString(),
      slot_end: new Date(form.slot_end).toISOString(),
      // ✅ change: send `items` with `food_item_id`
      items: requested.map((r) => ({
        food_item_id: Number(r.item_id),
        qty: Number(r.qty),
      })),
    };

    setBusy(true);
    try {
      await BookingAPI.create(payload);
      setMessage('Booking created!');
      setForm({ location_id: '', slot_start: '', slot_end: '' });
      setRequested([{ item_id: '', qty: 1 }]);
    } catch (err) {
      setMessage(err?.response?.data?.message || 'Failed to create booking.');
    } finally {
      setBusy(false);
    }
  };

  const locationOptions = Array.isArray(locations.data) ? locations.data : [];
  const itemOptions =
    Array.isArray(inventory.data?.items) ? inventory.data.items :
    (Array.isArray(inventory.data) ? inventory.data : []);

  return (
    <div className="d-grid gap-3">
      <h1 className="h4">Book a Collection Slot</h1>

      <form className="card shadow-sm" onSubmit={submit}>
        <div className="card-body d-grid gap-3">
          <h2 className="h5 mb-0">New Booking</h2>

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
                <option key={loc.id} value={loc.id}>{loc.name}</option>
              ))}
            </select>
            {locations.error && <div className="text-danger small mt-1">Failed to load locations.</div>}
          </div>

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

          <div>
            <h3 className="h6 mb-2">Requested Items</h3>
            <div className="table-responsive">
              <table className="table align-middle">
                <thead>
                  <tr>
                    <th style={{ minWidth: 240 }}>Item</th>
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
                          disabled={inventory.loading}
                        >
                          <option value="" disabled>
                            {inventory.loading ? 'Loading items…' : 'Select an item'}
                          </option>
                          {itemOptions.map((it) => (
                            <option key={it.item_id} value={it.item_id}>
                              {it.name} {it.category ? `— ${it.category}` : ''}
                            </option>
                          ))}
                        </select>
                        {inventory.error && <div className="text-danger small mt-1">Failed to load items.</div>}
                      </td>
                      <td>
                        <input
                          type="number"
                          className="form-control"
                          min="1"
                          value={row.qty}
                          onChange={(e) => updateRequested(idx, 'qty', Math.max(1, Number(e.target.value)))}
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
