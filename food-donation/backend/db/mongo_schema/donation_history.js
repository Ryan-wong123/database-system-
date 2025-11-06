// db/donation_history.js
const { mongoose } = require("mongoose"); // reuse your shared connection

const DonationItemSchema = new mongoose.Schema({
  food_name:   { type: String, trim: true },
  category:    { type: String, trim: true },
  qty:         { type: Number, default: 0, min: 0 },
  unit:        { type: String, trim: true },
  expiry_date: { type: Date }
}, { _id: false });

const DonationHistorySchema = new mongoose.Schema({
  // identity
  donor_id:    { type: Number, required: true, index: true },
  donation_id: { type: Number, required: true, index: true },

  // rollup
  location_name: { type: String, trim: true },
  donated_at:    { type: Date },             // from PG: d.created_at
  approve_status:{ type: String, enum: ["pending","confirmed","cancelled","completed"], index: true },

  // items for this donation
  items: { type: [DonationItemSchema], default: [] },

  // cache meta (aligns with your working format)
  as_of:             { type: Date, default: Date.now },
  cache_ttl_sec:     { type: Number, default: 300 },
  cache_valid_until: { type: Date },
  cache_status:      { type: String, enum: ["fresh","stale","expired"], default: "fresh", index: true }
}, {
  timestamps: true,
  collection: "donation_history"
});

// Unique: one doc per (donor_id, donation_id)
DonationHistorySchema.index({ donor_id: 1, donation_id: 1 }, { unique: true });
// Helpful sort
DonationHistorySchema.index({ donor_id: 1, donated_at: -1 });

DonationHistorySchema.pre("save", function(next){
  if (this.as_of && this.cache_ttl_sec != null) {
    this.cache_valid_until = new Date(this.as_of.getTime() + this.cache_ttl_sec * 1000);
  }
  next();
});

module.exports = mongoose.model("DonationHistory", DonationHistorySchema);
