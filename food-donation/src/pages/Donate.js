import DonationForm from '../components/DonationForm';

export default function Donate() {
  return (
    <div className="d-grid gap-3">
      <h1 className="h4">Record a Donation</h1>
      <DonationForm />
    </div>
  );
}
