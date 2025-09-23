import { useState } from 'react';
import UseFetchData from '../hooks/useFetchData';
import { DonationAPI, LocationsAPI } from '../services/api';

export default function Donate() {
  const [form, setForm] = useState({
    location_id: '',
    items: [{ item_id: '', qty: 1, expiry_date: '' }],
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  // Load locations via shared hook
  const locations = UseFetchData(() => LocationsAPI.list(), []);

  const updateItem = (idx, key, value) => {
    setForm((f) => {
      const items = [...f.items];
      items[idx] = { ...items[idx], [key]: value };
      return { ...f, items };
    });
  };

  const addItem = () =>
    setForm((f) => ({
      ...f,
      items: [...f.items, { item_id: '', qty: 1, expiry_date: '' }],
    }));

  const removeItem = (idx) =>
    setForm((f) => ({
      ...f,
      items: f.items.filter((_, i) => i !== idx),
    }));

  const validate = () => {
    if (!form.location_id) {
      setMsg('Please select a location.');
      return false;
    }
    if (form.items.length === 0) {
      setMsg('Please add at least one item.');
      return false;
    }
    for (let i = 0; i < form.items.length; i++) {
      const it = form.items[i];
      if (!String(it.item_id).trim()) {
        setMsg(`Row ${i + 1}: Item ID is required.`);
        return false;
      }
      const q = Number(it.qty);
      if (!Number.isFinite(q) || q < 1) {
        setMsg(`Row ${i + 1}: Quantity must be at least 1.`);
        return false;
      }
    }
    return true;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setMsg('');
    if (!validate()) return;

    setBusy(true);
    try {
      await DonationAPI.createDonation(form);
      setMsg('Donation recorded! Thank you.');
      setForm({ location_id: '', items: [{ item_id: '', qty: 1, expiry_date: '' }] });
    } catch {
      setMsg('Failed to submit donation.');
    } finally {
      setBusy(false);
    }
  };

  const locationOptions = Array.isArray(locations.data) ? locations.data : [];

  return (
    <div className="d-grid gap-3">
      <h1 className="h4">Record a Donation</h1>

      <form className="card p-4 shadow-sm" onSubmit={onSubmit}>
        <h4 className="h5 mb-3">Record Donation</h4>

        <div className="mb-3">
          <label className="form-label">Location</label>
          <select
            className="form-select"
            value={form.location_id}
            onChange={(e) => setForm((f) => ({ ...f, location_id: e.target.value }))}
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

        <div className="table-responsive mb-3">
          <table className="table align-middle">
            <thead>
              <tr>
                <th style={{ minWidth: 160 }}>Food Name</th>
                <th style={{ width: 140 }}>Quantity</th>
                <th style={{ width: 200 }}>Expiration Date</th>
                <th style={{ width: 120 }}></th>
              </tr>
            </thead>
            <tbody>
              {form.items.map((it, idx) => (
                <tr key={idx}>
                  <td>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Bread"
                      value={it.item_id}
                      onChange={(e) => updateItem(idx, 'item_id', e.target.value)}
                      required
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      className="form-control"
                      min="1"
                      value={it.qty}
                      onChange={(e) => updateItem(idx, 'qty', Math.max(1, Number(e.target.value)))}
                      required
                    />
                  </td>
                  <td>
                    <input
                      type="date"
                      className="form-control"
                      value={it.expiry_date}
                      onChange={(e) => updateItem(idx, 'expiry_date', e.target.value)}
                    />
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-outline-danger w-100"
                      onClick={() => removeItem(idx)}
                      disabled={form.items.length === 1}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="d-flex gap-2 mb-3">
          <button type="button" className="btn btn-outline-secondary" onClick={addItem}>
            Add Item
          </button>
        </div>

        <button className="btn btn-primary" disabled={busy}>
          {busy ? 'Submitting…' : 'Submit Donation'}
        </button>

        {msg && <div className="mt-2 text-muted">{msg}</div>}
      </form>
    </div>
  );
}
