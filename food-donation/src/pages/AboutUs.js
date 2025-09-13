// src/pages/AboutUs.jsx
import FoodImage from '../images/food-donation.jpg';

export default function AboutUs() {
  return (
    <div className="container my-5">
      <div className="row align-items-center">
        {/* Left: Image */}
        <div className="col-md-6 mb-4 mb-md-0">
          <img
            src={FoodImage}  // <-- use the imported variable here
            alt="Food Donation"
            className="img-fluid rounded shadow"
          />
        </div>

        {/* Right: Content */}
        <div className="col-md-6">
          <h1 className="display-5 fw-bold">About Us</h1>
          <p className="lead">
            Welcome to <span className="text-primary">Food Donation</span>! Our mission is
            to reduce food waste and support communities in need. We connect donors with
            recipients through a safe and easy-to-use platform.
          </p>
          <ul className="list-unstyled mt-3">
            <li className="mb-2">✅ Connect donors and recipients efficiently</li>
            <li className="mb-2">✅ Promote sustainability and reduce food waste</li>
            <li className="mb-2">✅ Ensure safe and timely donation delivery</li>
          </ul>
          <a href="/donate" className="btn btn-primary mt-3">
            Start Donating
          </a>
        </div>
      </div>
    </div>
  );
}
