export default function Home() {
  return (
    <div className="d-grid gap-4">
      {/* Welcome Hero Section */}
      <div className="card shadow-sm">
        <div className="card-body text-center">
          <h1 className="h3 mb-3">Welcome to the Community Fridge Network</h1>
          <p className="text-muted">
            Together, we can reduce food waste and support families in need.
          </p>
          <p>
            Donate surplus food, book pickup slots, and help create a sustainable future.
          </p>
        </div>
      </div>

      {/* About Section */}
      <section className="card shadow-sm">
        <div className="card-body">
          <h2 className="h5">How It Works</h2>
          <ul className="list-unstyled mt-3">
            <li>🥕 <strong>Donors</strong> contribute surplus food.</li>
            <li>🏠 <strong>Households</strong> can book pickups from community fridges.</li>
            <li>🤝 <strong>Volunteers</strong> help with distribution and logistics.</li>
          </ul>
        </div>
      </section>

      {/* Call to Action */}
      <section className="card shadow-sm bg-light">
        <div className="card-body text-center">
          <h2 className="h5 mb-3">Get Involved</h2>
          <p className="text-muted">
            Join us in building a sustainable, waste-free community.
          </p>
          <div className="d-flex justify-content-center gap-3">
            <a href="/login" className="btn btn-primary">Donate Food</a>
            <a href="/register" className="btn btn-outline-secondary">Sign Up</a>
          </div>
        </div>
      </section>
    </div>
  );
}
