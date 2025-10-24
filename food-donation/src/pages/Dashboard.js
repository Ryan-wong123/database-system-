// Dashboard.js
import { useEffect, useMemo, useState } from 'react';
import UseFetchData from '../hooks/useFetchData';
import * as API from '../services/api';
import CatalogTab from '../components/CatalogTab';
import DonationApprovalTab from '../components/DonationApprovalTab';

function StatusPill({ value }) {
  const cls =
    value === 'confirmed' ? 'text-bg-success'
    : value === 'pending' ? 'text-bg-secondary'
    : value === 'cancelled' ? 'text-bg-danger'
    : value === 'completed' ? 'text-bg-primary'
    : 'text-bg-light';
  return <span className={`badge ${cls}`}>{value}</span>;
}
const BOOKING_STATUSES = ['pending', 'confirmed', 'rejected'];
/* ───────────────────────────── Dates (timezone-safe) ───────────────────────────── */
// Extract a pure YYYY-MM-DD from many shapes without timezone math
const pickISODate = (v) => {
  if (!v) return null;

  if (typeof v === 'string') {
    // 1) Already ISO date or ISO datetime (take the date part)
    const mISO = v.match(/^(\d{4}-\d{2}-\d{2})/);
    if (mISO) return mISO[1];

    // 2) Common "YYYY-MM-DD HH:mm:ss" (with space)
    const mISOWithSpace = v.match(/^(\d{4}-\d{2}-\d{2})\s+\d{2}:\d{2}:\d{2}/);
    if (mISOWithSpace) return mISOWithSpace[1];

    // 3) DMY like 24/12/2025
    const mDMY = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (mDMY) {
      const [, dd, mm, yyyy] = mDMY;
      return `${yyyy}-${mm}-${dd}`;
    }
  }

  // 4) Date object: build YYYY-MM-DD from local parts (no UTC conversion)
  if (v instanceof Date && !isNaN(v)) {
    const yyyy = v.getFullYear();
    const mm = String(v.getMonth() + 1).padStart(2, '0');
    const dd = String(v.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  // 5) Fallback: parse but DO NOT use toISOString()
  const d = new Date(v);
  if (!isNaN(d)) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  return null;
};

// For saving to backend (expecting YYYY-MM-DD)
const normalizeDate = (v) => pickISODate(v);

// For showing in <input type="date"> (empty string when unknown)
const normalizeDateForEdit = (v) => pickISODate(v) ?? '';

// For table display without timezones (DD/MM/YYYY)
const formatDateForView = (v) => {
  const iso = pickISODate(v);
  if (!iso) return '—';
  const [yyyy, mm, dd] = iso.split('-');
  return `${dd}/${mm}/${yyyy}`;
};

/* ───────────────────────────── Option normalizers ───────────────────────────── */
const toLocationOptions = (raw) => {
  const arr =
    Array.isArray(raw?.data?.data) ? raw.data.data :
    Array.isArray(raw?.data)       ? raw.data :
    Array.isArray(raw)             ? raw :
    [];
  return arr
    .map((l) => ({
      id:   l?.id ?? l?.location_id ?? l?.locationId ?? null,
      name: l?.name ?? l?.location_name ?? l?.title ?? null,
    }))
    .filter((x) => x.id !== null && x.name);
};

const toCategoryOptions = (raw) => {
  const arr =
    Array.isArray(raw?.data?.data) ? raw.data.data :
    Array.isArray(raw?.data)       ? raw.data :
    Array.isArray(raw)             ? raw :
    [];
  return arr
    .map((c) => ({
      id:   c?.category_id ?? c?.id ?? null,
      name: c?.name ?? null,
    }))
    .filter((x) => x.id !== null && x.name);
};

export default function Dashboard() {
  const [tab, setTab] = useState('admin');
  // Data
  const locations  = UseFetchData(() => API.LocationsAPI.list(), []);
  const categories = UseFetchData(() => API.AdminAPI.categorieslist(), []);

  // Refetch inventory after save
  const [stockTick, setStockTick] = useState(0);
  const stock = UseFetchData(() => API.AdminAPI.list(), [stockTick]);

  // Normalized options
  const locationOptions = useMemo(() => toLocationOptions(locations.data), [locations.data]);
  const categoryOptions = useMemo(() => toCategoryOptions(categories.data), [categories.data]);

  const locationName = (id) =>
    locationOptions.find((l) => String(l.id) === String(id))?.name || 'Unknown';

  /* ───────────────────────────── Manage Bookings ───────────────────────────── */
  const [bookings, setBookings] = useState({ data: [] });
  const [loadingBookings, setLoadingBookings] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await API.AdminAPI.blist();
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

  // Update booking status (dropdown -> immediate DB write)
  const updateBookingStatus = async (bookingId, nextStatus) => {
    // optimistic UI update
    setBookings((prev) => {
      const arr = Array.isArray(prev?.data) ? prev.data : [];
      return {
        data: arr.map((b) =>
          b.booking_id === bookingId ? { ...b, status: nextStatus, __optimistic: true } : b
        ),
      };
    });

    try {
      await API.AdminAPI.updateStatus(bookingId, { status: nextStatus });
      // clear optimistic flag
      setBookings((prev) => ({
        data: (prev?.data || []).map((b) =>
          b.booking_id === bookingId ? { ...b, __optimistic: undefined } : b
        ),
      }));
    } catch (err) {
      console.error('Failed to update booking status:', err);
      alert('Could not update booking status.');
      // reload bookings to ensure accuracy
      try {
        const res = await API.AdminAPI.blist();
        const raw =
          Array.isArray(res?.data?.data) ? res.data.data :
          Array.isArray(res?.data)       ? res.data :
          [];
        setBookings({ data: raw });
      } catch (_) {
        /* ignore secondary error */
      }
    }
  };

  /* ───────────────────────────── Edit State ───────────────────────────── */
  const [editRow, setEditRow] = useState(null);

  const startEdit = (row) => {
    // Location
    let loc = row.location_id;
    if (!Number.isFinite(Number(loc))) {
      const foundLoc =
        locationOptions.find((x) => x.name === row.location_name) ||
        locationOptions.find((x) => String(x.id) === String(row.location_id));
      loc = foundLoc ? foundLoc.id : '';
    }

    // Category
    let cat = row.category_id;
    if (!Number.isFinite(Number(cat))) {
      const candidateName =
        row.category ||
        row.category_name ||
        row.food_category ||
        row.categoryName;
      const foundCat =
        categoryOptions.find((x) => x.name === candidateName) ||
        categoryOptions.find((x) => String(x.id) === String(row.category_id));
      cat = foundCat ? foundCat.id : '';
    }

    setEditRow({
      ...row,
      location_id: Number.isFinite(Number(loc)) ? Number(loc) : '',
      category_id: Number.isFinite(Number(cat)) ? Number(cat) : '',
      // IMPORTANT: normalize for the date input as pure YYYY-MM-DD
      expiry_date: normalizeDateForEdit(row.expiry_date),
    });
  };

  const cancelEdit = () => setEditRow(null);

  // If locations load after opening the form, re-normalize location_id
  useEffect(() => {
    if (!editRow) return;
    if (Number.isFinite(Number(editRow.location_id))) return;
    const found =
      locationOptions.find((x) => x.name === editRow?.location_name) ||
      locationOptions.find((x) => String(x.id) === String(editRow?.location_id));
    if (found) setEditRow((r) => ({ ...r, location_id: Number(found.id) }));
  }, [locationOptions, editRow]);

  // If categories load after opening the form, re-normalize category_id
  useEffect(() => {
    if (!editRow) return;
    if (Number.isFinite(Number(editRow.category_id))) return;
    const candidateName =
      editRow?.category ||
      editRow?.category_name ||
      editRow?.food_category ||
      editRow?.categoryName;
    const found =
      categoryOptions.find((x) => x.name === candidateName) ||
      categoryOptions.find((x) => String(x.id) === String(editRow?.category_id));
    if (found) setEditRow((r) => ({ ...r, category_id: Number(found.id) }));
  }, [categoryOptions, editRow]);

  /* ───────────────────────────── Save ───────────────────────────── */
  const saveEdit = async () => {
    if (!editRow) return;
    try {
      const payload = {
        name: (editRow.name ?? '').trim(),
        category_id: Number(editRow.category_id),
        qty: Number(editRow.qty),
        // Save as pure YYYY-MM-DD string
        expiry_date: normalizeDate(editRow.expiry_date),
        location_id: Number(editRow.location_id),
        lot_id: editRow.lot_id,
      };

      console.log('Sending payload:', payload);
      await API.InventoryAPI.updateFood(editRow.item_id, payload);

      // Refetch inventory list
      setStockTick((t) => t + 1);
      setEditRow(null);
    } catch (e) {
      console.error('Failed to save inventory', e);
      alert('Could not save changes.');
    }
  };

  /* ───────────────────────────── Grouped Inventory ───────────────────────────── */
  const groupedStock = useMemo(() => {
   const rows = Array.isArray(stock?.data?.data)
     ? stock.data.data
     : Array.isArray(stock?.data)
     ? stock.data
     : [];

   // normalize common column names from admin_list_inventory()
   const items = rows.map(r => ({
     item_id:       r.food_item_id ?? r.item_id ?? r.id,
     lot_id:        r.lot_id ?? null,
     name:          r.food_name ?? r.name ?? 'Unknown',
     category:      r.category ?? r.category_name ?? '—',
     qty:           r.qty ?? r.quantity ?? 0,
     expiry_date:   r.expiry_date ?? null,
     location_id:   r.location_id ?? null,
     location_name: r.location_name ?? r.location ?? (r.location_id ? locationName(r.location_id) : 'Unknown'),
   }));

   const map = new Map();
   for (const it of items) {
     const key = it.location_id ?? 'unknown';
     if (!map.has(key)) {
       map.set(key, { location_id: key, location_name: it.location_name || locationName(key), items: [] });
     }
     map.get(key).items.push(it);
   }
   return Array.from(map.values());
 }, [stock?.data, locationOptions]);
  /* ───────────────────────────── Render ───────────────────────────── */
return (
  <div className="d-grid gap-4">
    {/* Tabs */}
    <ul className="nav nav-tabs">
      <li className="nav-item">
        <button className={`nav-link ${tab === 'admin' ? 'active' : ''}`} onClick={() => setTab('admin')}>
          Admin Dashboard
        </button>
      </li>
      <li className="nav-item">
        <button className={`nav-link ${tab === 'catalog' ? 'active' : ''}`} onClick={() => setTab('catalog')}>
          Catalog (Categories & Diets)
        </button>
      </li>
      <li className="nav-item">
        <button className={`nav-link ${tab === 'donations' ? 'active' : ''}`} onClick={() => setTab('donations')}>
          Donation Approval
        </button>
      </li>
    </ul>

    {/* ADMIN TAB */}
    {tab === 'admin' && (
      <>
        {/* === Bookings === */}
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
                        <td>
                          <select
                            className="form-select form-select-sm"
                            value={b.status}
                            onChange={async (e) => {
                              const newStatus = e.target.value;
                              try {
                                await API.AdminAPI.updateStatus(b.booking_id, { status: newStatus });
                                setBookings((prev) => ({
                                  data: (prev.data || []).map((x) =>
                                    x.booking_id === b.booking_id ? { ...x, status: newStatus } : x
                                  ),
                                }));
                              } catch (err) {
                                console.error('Update booking status failed', err);
                                alert('Could not update booking status.');
                              }
                            }}
                          >
                            <option value="pending">Pending</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="cancelled">Cancelled</option>
                            <option value="completed">Completed</option>
                          </select>
                        </td>
                        <td>{new Date(b.created_at).toLocaleString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* === Inventory === */}
        <div className="card shadow-sm">
          <div className="card-body d-grid gap-3">
            <h2 className="h5 mb-0">Inventory (Edit items & move lots)</h2>

            {editRow && (
              <div className="border rounded p-3 bg-light d-grid gap-3">
                <div className="row g-3">
                  <div className="col-md-4">
                    <label className="form-label">Item Name</label>
                    <input
                      className="form-control"
                      value={editRow.name}
                      onChange={(e) => setEditRow({ ...editRow, name: e.target.value })}
                    />
                  </div>

                  <div className="col-md-3">
                    <label className="form-label">Category</label>
                    <select
                      className="form-select"
                      value={String(editRow?.category_id ?? '')}
                      onChange={(e) =>
                        setEditRow({ ...editRow, category_id: e.target.value === '' ? '' : Number(e.target.value) })
                      }
                    >
                      <option value="">Select category</option>
                      {categoryOptions.length === 0 ? (
                        <option disabled value="">(No categories found)</option>
                      ) : (
                        categoryOptions.map((c) => (
                          <option key={c.id} value={String(c.id)}>{c.name}</option>
                        ))
                      )}
                    </select>
                  </div>

                  {editRow.lot_id && (
                    <>
                      <div className="col-md-2">
                        <label className="form-label">Qty</label>
                        <input
                          type="number"
                          min={0}
                          className="form-control"
                          value={editRow.qty}
                          onChange={(e) => setEditRow({ ...editRow, qty: Number(e.target.value) })}
                        />
                      </div>

                      <div className="col-md-3">
                        <label className="form-label">Expiry</label>
                        <input
                          type="date"
                          className="form-control"
                          value={normalizeDateForEdit(editRow.expiry_date)}
                          onChange={(e) => setEditRow({ ...editRow, expiry_date: e.target.value })}
                        />
                      </div>

                      <div className="col-md-4">
                        <label className="form-label">Location</label>
                        <select
                          className="form-select"
                          value={String(editRow?.location_id ?? '')}
                          onChange={(e) => {
                            const v = e.target.value;
                            setEditRow((r) => ({ ...r, location_id: v === '' ? '' : Number(v) }));
                          }}
                        >
                          <option value="">Select location</option>
                          {locationOptions.length === 0 ? (
                            <option disabled value="">(No locations found)</option>
                          ) : (
                            locationOptions.map((x) => (
                              <option key={x.id} value={String(x.id)}>
                                {x.name}
                              </option>
                            ))
                          )}
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

            {groupedStock.map((g) => (
              <div key={g.location_id} className="mb-3">
                <div className="d-flex justify-content-between align-items-baseline">
                  <h3 className="h6 mb-2">{g.location_name}</h3>
                  <span className="badge text-bg-secondary">
                    {g.items.length} item{g.items.length !== 1 ? 's' : ''}
                  </span>
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
                          <td>{formatDateForView(it.expiry_date)}</td>
                          <td>
                            <button className="btn btn-sm btn-outline-primary" onClick={() => startEdit(it)}>
                              Edit
                            </button>
                          </td>
                        </tr>
                      ))}
                      {g.items.length === 0 && (
                        <tr><td colSpan={5} className="text-muted">No items.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}

            {/* Prefer checking groupedStock */}
            {groupedStock.length === 0 && !stock.loading && (
              <div className="text-muted">No stock.</div>
            )}
          </div>
        </div>
      </>
    )}

    {/* CATALOG TAB */}
    {tab === 'catalog' && <CatalogTab />}

    {/* DONATION TAB */}
    {tab === 'donations' && <DonationApprovalTab />}
  </div>
  );
}