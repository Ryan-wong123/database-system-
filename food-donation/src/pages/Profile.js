import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { DoneeAPI } from '../services/api';
import '../index.css';

export default function Profile() {
  const { user } = useAuth();

  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [householdName, setHouseholdName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [household, setHousehold] = useState(null);
  const [loadingHousehold, setLoadingHousehold] = useState(true);

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
  }, []);

  const handleCreateHousehold = async (e) => {
    e.preventDefault();
    try {
      const { data } = await DoneeAPI.createHousehold({
        name: householdName,
        donee_id: user.id,
      });
      alert('Household created successfully!');
      setShowCreate(false);
    } catch (err) {
      alert('Failed to create household.');
    }
  };

  const handleJoinHousehold = async (e) => {
    e.preventDefault();
    try {
      const { data } = await DoneeAPI.joinHousehold({
        code: joinCode,
        donee_id: user.id,
      });
      alert('Joined household successfully!');
      setShowJoin(false);
    } catch (err) {
      alert('Failed to join household.');
    }
  };

  const handleLeaveHousehold = async () => {
    try {
      await DoneeAPI.leaveHousehold(); // calls DELETE /households/me
      alert('You left your household successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to leave household.');
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
                      await DoneeAPI.leaveHousehold();
                      alert('Left household successfully');
                      setHousehold(null);
                    }}
                  >
                    Leave Household
                  </button>
                </div>
              </div>
            ) : (
              <div className="d-flex gap-2">
                <button
                  className="btn btn-outline-primary"
                  onClick={() => {
                    setShowCreate(true);
                    setShowJoin(false);
                  }}
                >
                  Create Household
                </button>
                <button
                  className="btn btn-outline-secondary"
                  onClick={() => {
                    setShowJoin(true);
                    setShowCreate(false);
                  }}
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
                  <button className="btn btn-primary" type="submit">
                    Create
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-danger"
                    onClick={() => setShowCreate(false)}
                  >
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
                  <button className="btn btn-secondary" type="submit">
                    Join
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-danger"
                    onClick={() => setShowJoin(false)}
                  >
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
                  <span
                    className={`badge ${r.status === 'Approved' ? 'bg-success' : 'bg-secondary'
                      }`}
                  >
                    {r.status}
                  </span>
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
                <li
                  key={i}
                  className="list-group-item d-flex justify-content-between align-items-center"
                >
                  <span>{a.action}</span>
                  <span className="text-muted small">{a.date}</span>
                </li>
              ))
            ) : (
              <li className="list-group-item text-muted text-center">
                No recent activity
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
