// src/pages/Home.jsx
import { Link } from 'react-router-dom';
import '../index.css'; // optional if you want a separate CSS file

export default function Home() {
  return (
    <div>
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-overlay p-4 rounded">
          <h1 className="display-4 fw-bold">Reduce Waste, Help Others</h1>
          <p className="lead">Join our community to donate food and support those in need.</p>
          <Link to="/donate" className="btn btn-lg btn-light me-2">Donate Food</Link>
          <Link to="/about" className="btn btn-lg btn-outline-light">Learn More</Link>
        </div>
      </section>

      {/* Features Section */}
      <section className="container my-5">
        <h2 className="text-center mb-4">Why Choose Food Donation?</h2>
        <div className="row text-center">
          <div className="col-md-4 mb-4">
            <div className="feature-card p-4 border rounded shadow-sm h-100">
              <i className="bi bi-heart-fill text-primary fs-1 mb-3"></i>
              <h5 className="fw-bold">Support Community</h5>
              <p>Help families and individuals by donating food efficiently.</p>
            </div>
          </div>
          <div className="col-md-4 mb-4">
            <div className="feature-card p-4 border rounded shadow-sm h-100">
              <i className="bi bi-arrow-repeat text-primary fs-1 mb-3"></i>
              <h5 className="fw-bold">Reduce Waste</h5>
              <p>Donate surplus food instead of letting it go to waste.</p>
            </div>
          </div>
          <div className="col-md-4 mb-4">
            <div className="feature-card p-4 border rounded shadow-sm h-100">
              <i className="bi bi-check-circle-fill text-primary fs-1 mb-3"></i>
              <h5 className="fw-bold">Safe & Reliable</h5>
              <p>We ensure donations reach the recipients safely and on time.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Call-to-action Section */}
      <section className="cta-section">
        <div className="cta-overlay"></div>
        <div className="cta-content text-center text-white">
          <h2 className="mb-3">Ready to Make a Difference?</h2>
          <p className="mb-4">Sign up and start donating or volunteering today!</p>
          <Link to="/register" className="btn btn-primary btn-lg me-2">Sign Up</Link>
          <Link to="/donate" className="btn btn-outline-light btn-lg">Donate Now</Link>
        </div>
      </section>
    </div>
  );
}
