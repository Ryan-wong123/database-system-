import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { DoneeAPI, BookingAPI, HouseholdProfilesAPI } from '../services/api';
import '../index.css';

export default function Profile() {
  const { user } = useAuth();

  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [householdName, setHouseholdName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [household, setHousehold] = useState(null);
  const [loadingHousehold, setLoadingHousehold] = useState(true);
  const [hasBookings, setHasBookings] = useState(false);

  // --- Household profile state (diet only) ---
  const [loadingHHProfile, setLoadingHHProfile] = useState(false);
  const [savingHHProfile, setSavingHHProfile] = useState(false);
  const [hhProfile, setHhProfile] = useState({
    preferences: { diet: '' },
  });

  // edit mode for diet
  const [editingDiet, setEditingDiet] = useState(false);

  useEffect(() => {
    async function fetchHousehold() {
      try {
        const res = await DoneeAPI.getHousehold();
        setHousehold(res.data?.data || null);
      } catch (err) {
        console.error('Failed to load household:', err);
      } finally {
        setLoadingHousehold(false);
      }
    }
    fetchHousehold();

    (async () => {
      try {
        const resp = await BookingAPI.historyMine();
        const items = Array.isArray(resp) ? resp
                    : Array.isArray(resp?.items) ? resp.items
                    : Array.isArray(resp?.data) ? resp.data
                    : Array.isArray(resp?.data?.items) ? resp.data.items
                    : [];
        setHasBookings(items.length > 0);
      } catch (e) {
        setHasBookings(false);
        console.warn('Could not load booking history; backend will enforce leave rule.', e);
      }
    })();

    // expose for refresh after create/join
    window.fetchHousehold = fetchHousehold;
  }, []);

  // --- Load household profile when household exists (diet only) ---
  useEffect(() => {
    if (!household?.household_id) {
      setHhProfile({ preferences: { diet: '' } });
      // IMPORTANT: first-time entry mode when no household/diet
      setEditingDiet(true);
      return;
    }
    (async () => {
      setLoadingHHProfile(true);
      try {
        const res = await HouseholdProfilesAPI.me();
        const data = res?.data?.data || null;

        const diet = data?.preferences?.diet ?? '';
        setHhProfile({ preferences: { diet } });

        // IMPORTANT: if no saved diet -> allow typing without closing input
        if (String(diet).trim()) {
          setEditingDiet(false);   // diet exists -> view mode
        } else {
          setEditingDiet(true);    // no diet -> edit mode
        }
      } catch (e) {
        console.error('Failed to load household profile', e);
        setHhProfile({ preferences: { diet: '' } });
        setEditingDiet(true);      // fallback to edit mode if load fails / empty
      } finally {
        setLoadingHHProfile(false);
      }
    })();
  }, [household?.household_id]);

  const handleCreateHousehold = async (e) => {
    e.preventDefault();
    try {
      await DoneeAPI.createHousehold({
        name: householdName,
        donee_id: user.id,
      });
      alert('Household created successfully!');
      setShowCreate(false);
      await window.fetchHousehold();
    } catch (err) {
      alert('Failed to create household.');
    }
  };

  const handleJoinHousehold = async (e) => {
    e.preventDefault();
    if (!joinCode.trim()) {
      alert("Please enter a valid household PIN.");
      return;
    }
    try {
      const res = await DoneeAPI.joinHousehold({ pin: joinCode });
      if (res.data.success) {
        alert(res.data.message || "Joined household successfully!");
        setShowJoin(false);
        setJoinCode("");
        await window.fetchHousehold();
      } else {
        alert(res.data.error || "Failed to join household.");
      }
    } catch (err) {
      console.error("Join household failed:", err);
      alert(err.response?.data?.error || "Failed to join household.");
    }
  };

  // --- Save household profile (diet only) ---
  const handleSaveHHProfile = async (e) => {
    e.preventDefault();
    if (!household?.household_id) {
      alert('Join or create a household first.');
      return;
    }
    try {
      setSavingHHProfile(true);
      const payload = {
        preferences: {
          diet: hhProfile.preferences.diet || null,
        },
      };
      const res = await HouseholdProfilesAPI.upsert(payload);
      // reflect exactly what backend saved so the UI mirrors Postgres
      const savedDiet = res?.data?.data?.preferences?.diet ?? '';
      setHhProfile((p) => ({
        ...p,
        preferences: { ...p.preferences, diet: savedDiet }
      }));
      setEditingDiet(false); // exit edit mode after save
      alert('Household profile saved.');
    } catch (e) {
      console.error('Save profile failed', e);
      alert('Failed to save profile.');
    } finally {
      setSavingHHProfile(false);
    }
  };

  if (!user) {
    return (
      <div className="container text-center mt-5">
        <p className="text-muted">Please log in to view your profile.</p>
      </div>
    );
  }

  const isDonor = user.role === 'donor';
  const isDonee = user.role === 'donee';
  const isAdmin = user.role === 'admin';

  return (
    <div className="container my-5 pt-4">
      {/* Header */}
      <div className="mb-4 border-bottom pb-3">
        <h2 className="fw-bold mb-1">{user.name ? user.name : 'Unnamed User'}</h2>
        <p className="text-muted mb-1">{user.email}</p>
        <p className="text-secondary">Role: {user.role}</p>
      </div>

      {/* Donor Section */}
      {isDonor && (
        <div>
          <h4 className="fw-bold mb-3">Donation Summary</h4>
          <div className="row text-center mb-4">
            <div className="col-md-4">
              <div className="p-3 border rounded shadow-sm">
                <h5>{user.stats?.totalDonations || 0}</h5>
                <p className="text-muted">Total Donations</p>
              </div>
            </div>
            <div className="col-md-4">
              <div className="p-3 border rounded shadow-sm">
                <h5>{user.stats?.itemsCount || 0}</h5>
                <p className="text-muted">Items Donated</p>
              </div>
            </div>
            <div className="col-md-4">
              <div className="p-3 border rounded shadow-sm">
                <h5>{user.stats?.communitiesHelped || 0}</h5>
                <p className="text-muted">Communities Helped</p>
              </div>
            </div>
          </div>

          <h5 className="fw-bold mb-3">Recent Donations</h5>
          <ul className="list-group">
            {user.donations?.length ? (
              user.donations.map((d, i) => (
                <li key={i} className="list-group-item d-flex justify-content-between">
                  <span>{d.item}</span>
                  <span className="text-muted small">{d.date}</span>
                </li>
              ))
            ) : (
              <li className="list-group-item text-muted text-center">No donations yet</li>
            )}
          </ul>
        </div>
      )}

      {/* Donee Section */}
      {isDonee && (
      <div>
        <h4 className="fw-bold mb-3">Request Summary</h4>
        <div className="row text-center mb-4">
          <div className="col-md-4">
            <div className="p-3 border rounded shadow-sm">
              <h5>{user.stats?.totalRequests || 0}</h5>
              <p className="text-muted">Total Requests</p>
            </div>
          </div>
          <div className="col-md-4">
            <div className="p-3 border rounded shadow-sm">
              <h5>{user.stats?.itemsReceived || 0}</h5>
              <p className="text-muted">Items Received</p>
            </div>
          </div>
          <div className="col-md-4">
            <div className="p-3 border rounded shadow-sm">
              <h5>{user.stats?.activeRequests || 0}</h5>
              <p className="text-muted">Active Requests</p>
            </div>
          </div>
        </div>

        {/* Household Section */}
        <div className="mb-4">
          <h5 className="fw-bold mb-3">Household Management</h5>

          {loadingHousehold ? (
            <p className="text-muted">Loading household info...</p>
          ) : household ? (
            <div className="border rounded p-3 mt-2">
              <p className="mb-1">
                <strong>Household:</strong> {household.household_name}
              </p>
              <p className="text-muted small mb-2">
                Household PIN: {household.household_pin}
              </p>
              <div className="d-flex gap-2">
                <button
                  className="btn btn-outline-danger"
                  onClick={async () => {
                    if (hasBookings) {
                      alert('You have made a booking before, so you cannot leave this household.');
                      return;
                    }
                    if (!window.confirm('Are you sure you want to leave this household?')) return;
                    try {
                      await DoneeAPI.leaveHousehold();
                      alert('Left household successfully');
                      setHousehold(null);
                    } catch (err) {
                      const msg = err?.response?.data?.message || err?.message || 'Failed to leave household.';
                      alert(msg);
                    }
                  }}
                >
                  Leave Household
                </button>
              </div>

              {/* Household Profile editor (diet only) */}
              <div className="mt-4">
                <h6 className="fw-bold mb-2">Household Profile</h6>
                {loadingHHProfile ? (
                  <p className="text-muted">Loading profile…</p>
                ) : (
                  <form onSubmit={handleSaveHHProfile} className="border rounded p-3">
                    <div className="row">
                      <div className="col-md-6 mb-3">
                        <label className="form-label">Diet</label>

                        {/* If diet exists and not editing: show text + Edit button */}
                        {hhProfile.preferences.diet?.trim() && !editingDiet ? (
                          <div className="d-flex align-items-center gap-2 mt-1">
                            <span className="fw-semibold">{hhProfile.preferences.diet}</span>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-secondary ms-2"
                              onClick={() => setEditingDiet(true)}
                            >
                              Edit
                            </button>
                          </div>
                        ) : (
                          // No diet yet OR editing: show input
                          <input
                            className="form-control"
                            placeholder="e.g., halal, vegetarian"
                            value={hhProfile.preferences.diet}
                            onChange={(e) => setHhProfile(p => ({
                              ...p,
                              preferences: { ...p.preferences, diet: e.target.value }
                            }))}
                            disabled={savingHHProfile}
                          />
                        )}
                      </div>
                    </div>

                    <div className="d-flex justify-content-between align-items-center">
                      {/* Show Save/Cancel when editing or when no diet exists */}
                      {editingDiet || !hhProfile.preferences.diet?.trim() ? (
                        <div className="d-flex gap-2">
                          <button className="btn btn-primary" type="submit" disabled={savingHHProfile}>
                            {savingHHProfile ? 'Saving…' : 'Save Profile'}
                          </button>
                          {editingDiet && (
                            <button
                              type="button"
                              className="btn btn-outline-secondary"
                              onClick={async () => {
                                // cancel: reload current from server and exit edit mode
                                try {
                                  const res = await HouseholdProfilesAPI.me();
                                  const data = res?.data?.data || null;
                                  setHhProfile({
                                    preferences: { diet: data?.preferences?.diet ?? '' },
                                  });
                                } catch {}
                                setEditingDiet(false);
                              }}
                              disabled={savingHHProfile}
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      ) : (
                        <span /> /* keep spacing when not editing and a diet exists */
                      )}
                      <span className="text-muted small">
                        Only diet is stored. (Avoids, notes, address, allergies removed)
                      </span>
                    </div>
                  </form>
                )}
              </div>
            </div>
          ) : (
            <div className="d-flex gap-2">
              <button
                className="btn btn-outline-primary"
                onClick={() => { setShowCreate(true); setShowJoin(false); }}
              >
                Create Household
              </button>
              <button
                className="btn btn-outline-secondary"
                onClick={() => { setShowJoin(true); setShowCreate(false); }}
              >
                Join Household
              </button>
            </div>
          )}

          {/* Create Household Form */}
          {showCreate && (
            <form className="mt-3 border rounded p-3" onSubmit={handleCreateHousehold}>
              <div className="mb-2">
                <label className="form-label">Household Name</label>
                <input
                  type="text"
                  className="form-control"
                  value={householdName}
                  onChange={(e) => setHouseholdName(e.target.value)}
                  required
                />
              </div>
              <div className="d-flex justify-content-between">
                <button className="btn btn-primary" type="submit">Create</button>
                <button type="button" className="btn btn-outline-danger" onClick={() => setShowCreate(false)}>
                  Close
                </button>
              </div>
            </form>
          )}

          {/* Join Household Form */}
          {showJoin && (
            <form className="mt-3 border rounded p-3" onSubmit={handleJoinHousehold}>
              <div className="mb-2">
                <label className="form-label">Household Code</label>
                <input
                  type="text"
                  className="form-control"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  required
                />
              </div>
              <div className="d-flex justify-content-between">
                <button className="btn btn-secondary" type="submit">Join</button>
                <button type="button" className="btn btn-outline-danger" onClick={() => setShowJoin(false)}>
                  Close
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Request List */}
        <h5 className="fw-bold mb-3">Recent Requests</h5>
        <ul className="list-group">
          {user.requests?.length ? (
            user.requests.map((r, i) => (
              <li key={i} className="list-group-item d-flex justify-content-between">
                <span>{r.item}</span>
                <span className={`badge ${r.status === 'Approved' ? 'bg-success' : 'bg-secondary'}`}>{r.status}</span>
              </li>
            ))
          ) : (
            <li className="list-group-item text-muted text-center">No requests yet</li>
          )}
        </ul>
      </div>
      )}

      {/* Admin Section */}
      {isAdmin && (
        <div>
          <h4 className="fw-bold mb-3">Admin Dashboard</h4>
          <div className="row text-center mb-4">
            <div className="col-md-4">
              <div className="p-3 border rounded shadow-sm">
                <h5>{user.stats?.totalUsers || 0}</h5>
                <p className="text-muted">Registered Users</p>
              </div>
            </div>
            <div className="col-md-4">
              <div className="p-3 border rounded shadow-sm">
                <h5>{user.stats?.totalDonations || 0}</h5>
                <p className="text-muted">Total Donations</p>
              </div>
            </div>
            <div className="col-md-4">
              <div className="p-3 border rounded shadow-sm">
                <h5>{user.stats?.pendingApprovals || 0}</h5>
                <p className="text-muted">Pending Approvals</p>
              </div>
            </div>
          </div>

          <h5 className="fw-bold mb-3">Recent Activity</h5>
          <ul className="list-group">
            {user.activity?.length ? (
              user.activity.map((a, i) => (
                <li key={i} className="list-group-item d-flex justify-content-between align-items-center">
                  <span>{a.action}</span>
                  <span className="text-muted small">{a.date}</span>
                </li>
              ))
            ) : (
              <li className="list-group-item text-muted text-center">No recent activity</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
