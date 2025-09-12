import { useEffect, useState } from 'react';
import { BookingAPI } from '../services/api';

export default function BookingForm() {
  const [locationId, setLocationId] = useState('');
  const [slots, setSlots] = useState([]);
  const [selected, setSelected] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    async function load() {
      if (!locationId) return setSlots([]);
      try {
        const { data } = await BookingAPI.availability(locationId);
        setSlots(data?.slots || []);
      } catch {
        setSlots([]);
      }
    }
    load();
  }, [locationId]);

  const create = async () => {
    if (!selected) return;
    try {
      await BookingAPI.create({
        location_id: locationId,
        slot_start: selected.start,
        slot_end: selected.end
      });
      setMessage('Booking created!');
    } catch {
      setMessage('Failed to book slot.');
    }
  };

  return (
    <div className="card shadow-sm">
      <div className="card-body">
        <div className="mb-3">
          <label className="form-label">Location</label>
          <input
            className="form-control"
            placeholder="Location ID"
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
          />
        </div>

        <div className="row g-2 mb-3">
          {slots.map((s, i) => {
            const isSel = selected && selected.start === s.start && selected.end === s.end;
            return (
              <div key={i} className="col-md-6">
                <button
                  type="button"
                  className={`btn w-100 ${isSel ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setSelected(s)}
                >
                  {new Date(s.start).toLocaleString()} → {new Date(s.end).toLocaleTimeString()}
                </button>
              </div>
            );
          })}
        </div>

        <button className="btn btn-success" onClick={create} disabled={!selected}>
          Confirm Booking
        </button>
        {message && <div className="text-muted mt-2">{message}</div>}
      </div>
    </div>
  );
}
