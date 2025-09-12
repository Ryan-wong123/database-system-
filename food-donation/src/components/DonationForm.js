import { useState } from 'react';
import { DonationAPI } from '../services/api';

export default function DonationForm() {
  const [form, setForm] = useState({
    location_id: '',
    items: [{ item_id: '', qty: 1, expiry_date: '' }],
    notes: ''
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const updateItem = (idx, key, value) => {
    setForm((f) => {
      const items = [...f.items];
      items[idx] = { ...items[idx], [key]: value };
      return { ...f, items };
    });
  };

  const addItem = () => setForm((f) => ({
    ...f,
    items: [...f.items, { item_id: '', qty: 1, expiry_date: '' }]
  }));

  const removeItem = (idx) => setForm((f) => ({
    ...f,
    items: f.items.filter((_, i) => i !== idx)
  }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setBusy(true); setMsg('');
    try {
      await DonationAPI.createDonation(form);
      setMsg('Donation recorded! Thank you.');
      setForm({ location_id: '', items: [{ item_id: '', qty: 1, expiry_date: '' }], notes: '' });
    } catch {
      setMsg('Failed to submit donation.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="card p-4 shadow-sm" onSubmit={onSubmit}>
      <div className="mb-3">
        <label className="form-label">Location</label>
        <input
          type="text"
          className="form-control"
          value={form.location_id}
          onChange={(e) => setForm({ ...form, location_id: e.target.value })}
          required
        />
      </div>

      <div className="mb-3">
        <h5>Items</h5>
        {form.items.map((it, idx) => (
          <div className="row g-2 mb-2" key={idx}>
            <div className="col-md-5">
              <input
                type="text"
                className="form-control"
                placeholder="Item ID"
                value={it.item_id}
                onChange={(e) => updateItem(idx, 'item_id', e.target.value)}
                required
              />
            </div>
            <div className="col-md-2">
              <input
                type="number"
                className="form-control"
                min="1"
                value={it.qty}
                onChange={(e) => updateItem(idx, 'qty', Number(e.target.value))}
                required
              />
            </div>
            <div className="col-md-3">
              <input
                type="date"
                className="form-control"
                value={it.expiry_date}
                onChange={(e) => updateItem(idx, 'expiry_date', e.target.value)}
              />
            </div>
            <div className="col-md-2">
              <button
                type="button"
                className="btn btn-outline-danger w-100"
                onClick={() => removeItem(idx)}
              >
                Remove
              </button>
            </div>
          </div>
        ))}
        <button type="button" className="btn btn-outline-secondary" onClick={addItem}>
          Add Item
        </button>
      </div>

      <div className="mb-3">
        <label className="form-label">Notes</label>
        <textarea
          className="form-control"
          rows="3"
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />
      </div>

      <button className="btn btn-primary" disabled={busy}>
        {busy ? 'Submitting…' : 'Submit Donation'}
      </button>
      {msg && <div className="mt-2 text-muted">{msg}</div>}
    </form>
  );
}
