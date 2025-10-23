import { useAuth } from '../context/AuthContext';
import '../index.css';


export default function Profile() {
  const { user } = useAuth();

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
        <h2 className="fw-bold mb-1">{user.email}</h2>
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

          <h5 className="fw-bold mb-3">Recent Requests</h5>
          <ul className="list-group">
            {user.requests?.length ? (
              user.requests.map((r, i) => (
                <li key={i} className="list-group-item d-flex justify-content-between">
                  <span>{r.item}</span>
                  <span
                    className={`badge ${
                      r.status === 'Approved' ? 'bg-success' : 'bg-secondary'
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
