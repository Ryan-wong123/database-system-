import { useMemo, useState } from 'react';
import { BookingAPI } from '../services/api';

const SLOT_MINUTES = 30; // window length created from pickup_time

// Fake items (replace with ItemsAPI.list() later)
const FAKE_ITEMS = [
  { item_id: 'ITEM-RICE-5KG', name: 'Rice (5kg)', category: 'Grain' },
  { item_id: 'ITEM-MILK-1L', name: 'Fresh Milk (1L)', category: 'Dairy' },
  { item_id: 'ITEM-BEANS-CAN', name: 'Canned Beans', category: 'Canned Food' },
  { item_id: 'ITEM-APPLE', name: 'Apples', category: 'Fruit' },
  { item_id: 'ITEM-NOODLES', name: 'Instant Noodles (Pack)', category: 'Staple' },
];

export default function BookingForm() {
  const [form, setForm] = useState({
    location_id: '',
    pickup_time: '', // single input from user
  });

  const [requested, setRequested] = useState([{ item_id: '', qty: 1 }]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const setField = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const items = useMemo(() => FAKE_ITEMS, []);

  const updateRequested = (idx, key, value) => {
    setRequested((rows) => {
      const next = [...rows];
      next[idx] = { ...next[idx], [key]: value };
      return next;
    });
  };

  const addRequested = () =>
    setRequested((rows) => [...rows, { item_id: '', qty: 1 }]);

  const removeRequested = (idx) =>
    setRequested((rows) => rows.filter((_, i) => i !== idx));

  const validate = () => {
    if (!form.location_id.trim()) {
      setMessage('Location is required.');
      return false;
    }
    if (!form.pickup_time) {
      setMessage('Pickup time is required.');
      return false;
    }
    if (requested.length === 0) {
      setMessage('Please add at least one requested item.');
      return false;
    }
    for (let i = 0; i < requested.length; i++) {
      const row = requested[i];
      if (!String(row.item_id).trim()) {
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

  const create = async (e) => {
    e.preventDefault();
    setMessage('');
    if (!validate()) return;

    const start = new Date(form.pickup_time);
    const end = new Date(start.getTime() + SLOT_MINUTES * 60 * 1000);

    const payload = {
      location_id: form.location_id.trim(),
      slot_start: start.toISOString(),
      slot_end: end.toISOString(),
      requested_items: requested.map((r) => ({
        item_id: r.item_id,
        qty: Number(r.qty),
      })),
    };

    setBusy(true);
    try {
      await BookingAPI.create(payload);
      setMessage('Booking created!');
      setForm({ location_id: '', pickup_time: '' });
      setRequested([{ item_id: '', qty: 1 }]);
    } catch (err) {
      setMessage(err?.response?.data?.message || 'Failed to create booking.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="card shadow-sm" onSubmit={create}>
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
          >
            <option value="" disabled>Select a location</option>
            <option value="bedok">Bedok</option>
            <option value="jurong">Jurong</option>
            <option value="tampines">Tampines</option>
            <option value="hougang">Hougang</option>
          </select>
        </div>

        {/* Pickup time */}
        <div>
          <label className="form-label">Pickup Time</label>
          <input
            type="datetime-local"
            className="form-control"
            value={form.pickup_time}
            onChange={(e) => setField('pickup_time', e.target.value)}
            required
          />
          <div className="form-text">
            A {SLOT_MINUTES}-minute slot will be reserved from the selected time.
          </div>
        </div>

        {/* Requested items */}
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
                      >
                        <option value="" disabled>Select an item</option>
                        {items.map((it) => (
                          <option key={it.item_id} value={it.item_id}>
                            {it.name} {it.category ? `— ${it.category}` : ''}
                          </option>
                        ))}
                      </select>
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

          {/* Add item button below rows */}
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={addRequested}
          >
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
  );
}
