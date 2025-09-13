// src/pages/ContactUs.jsx
import { useState } from 'react';

export default function ContactUs() {
  const [form, setForm] = useState({ name: '', email: '', message: '' });

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const handleSubmit = (e) => {
    e.preventDefault();
    alert(`Thank you, ${form.name}! Your message has been sent.`);
    setForm({ name: '', email: '', message: '' });
  };

  return (
    <div className="container my-5">
      <h1 className="display-5 fw-bold mb-4">Contact Us</h1>
      <div className="row">
        {/* Left: Info */}
        <div className="col-md-5 mb-4 mb-md-0">
          <div className="p-4 bg-light rounded shadow-sm">
            <h5>Email:</h5>
            <p>support@fooddonation.com</p>
            <h5>Phone:</h5>
            <p>+65 1234 5678</p>
            <h5>Address:</h5>
            <p>123 Donation St, Singapore</p>
          </div>
        </div>

        {/* Right: Contact Form */}
        <div className="col-md-7">
          <form onSubmit={handleSubmit} className="p-4 border rounded shadow-sm">
            <div className="mb-3">
              <label className="form-label">Name</label>
              <input
                type="text"
                className="form-control"
                name="name"
                value={form.name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="mb-3">
              <label className="form-label">Email</label>
              <input
                type="email"
                className="form-control"
                name="email"
                value={form.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="mb-3">
              <label className="form-label">Message</label>
              <textarea
                className="form-control"
                name="message"
                value={form.message}
                onChange={handleChange}
                rows="5"
                required
              ></textarea>
            </div>

            <button type="submit" className="btn btn-primary w-100">
              Send Message
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
