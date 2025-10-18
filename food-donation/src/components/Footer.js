// src/components/Footer.js
import FoodImage from '../images/food-donation.jpg'; // adjust path if needed

export default function Footer() {
  return (
    <footer className="bg-light border-top mt-auto">
      <div className="container py-5">
        <div className="row g-4">
          {/* Left half: About Us */}
          <div className="col-md-6">
            <div className="d-flex align-items-center mb-3">
              <img
                src={FoodImage}
                alt="Food Donation"
                className="img-fluid rounded shadow-sm me-3"
                style={{ maxWidth: '120px', height: 'auto' }}
              />
              <h2 className="h5 fw-bold mb-0">About Us</h2>
            </div>
            <p className="text-muted small mb-2">
              Welcome to <span className="text-primary">Food Donation</span>! Our mission
              is to reduce food waste and support communities in need.
            </p>
            <ul className="list-unstyled small text-muted mb-0">
              <li>✅ Connect donors and recipients efficiently</li>
              <li>✅ Promote sustainability and reduce food waste</li>
              <li>✅ Ensure safe and timely donation delivery</li>
            </ul>
          </div>

          {/* Right half: Contact Info */}
          <div className="col-md-6">
            <h2 className="h5 fw-bold mb-3">Contact Us</h2>
            <div className="small text-muted">
              <p className="mb-1">📧 support@fooddonation.com</p>
              <p className="mb-1">📞 +65 1234 5678</p>
              <p className="mb-1">📍 123 Donation St, Singapore</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="bg-white border-top py-2">
        <div className="container text-center text-muted small">
          © {new Date().getFullYear()} Community Fridge Network
        </div>
      </div>
    </footer>
  );
}
