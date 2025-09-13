// src/components/Footer.js
import { useState } from 'react';
import FoodImage from '../images/food-donation.jpg'; // adjust path if needed

export default function Footer() {
  const [form, setForm] = useState({ name: '', email: '', message: '' });

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = (e) => {
    e.preventDefault();
    alert(`Thank you, ${form.name}! Your message has been sent.`);
    setForm({ name: '', email: '', message: '' });
  };

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

          {/* Right half: Contact Us */}
          <div className="col-md-6">
            <h2 className="h5 fw-bold mb-3">Contact Us</h2>

            {/* Contact info */}
            <div className="small text-muted mb-3">
              <p className="mb-1">📧 support@fooddonation.com</p>
              <p className="mb-1">📞 +65 1234 5678</p>
              <p className="mb-1">📍 123 Donation St, Singapore</p>
            </div>

            {/* Contact form */}
            <form onSubmit={handleSubmit} className="small">
              <div className="mb-2">
                <input
                  type="text"
                  className="form-control form-control-sm"
                  placeholder="Name"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="mb-2">
                <input
                  type="email"
                  className="form-control form-control-sm"
                  placeholder="Email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="mb-2">
                <textarea
                  className="form-control form-control-sm"
                  placeholder="Message"
                  name="message"
                  rows="2"
                  value={form.message}
                  onChange={handleChange}
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary btn-sm w-100">
                Send
              </button>
            </form>
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
