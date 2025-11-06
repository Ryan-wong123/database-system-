// db/booking_history.js
const mongoose = require("mongoose");

const bookingHistorySchema = new mongoose.Schema({
  // Stable unique key (similar idea to inventory_id):
  // Use `${user_id}:${booking_id}` so one doc per user-booking.
  booking_key: { type: String, required: true, unique: true },

  // Core identifiers
  user_id:    { type: Number, required: true, index: true },
  booking_id: { type: Number, required: true },

  // Location & timing
  location_id:   { type: Number },
  location_name: { type: String, trim: true },
  slot_start:    { type: Date },
  slot_end:      { type: Date },

  // Status & timestamps
  status: {
    type: String,
    enum: ["pending", "confirmed", "completed", "cancelled", "expired"],
    default: "pending",
    index: true
  },
  created_at: { type: Date },

  // Items summary + details
  items_count: { type: Number, default: 0, min: 0 },
  items: [{
    item_id:       { type: Number, required: true },
    name:          { type: String, trim: true },
    qty_requested: { type: Number, default: 0, min: 0 },
    qty_collected: { type: Number, default: 0, min: 0 },
    unit:          { type: String, trim: true }
  }],

  // Provenance
  source: { type: String, default: "postgres" },

  // -------- Cache metadata (aligned with your working format) --------
  as_of:            { type: Date, default: Date.now },
  cache_ttl_sec:    { type: Number, default: 300 },
  cache_valid_until:{ type: Date },
  cache_status: {
    type: String,
    enum: ["fresh", "stale", "expired"],
    default: "fresh",
    index: true
  },
}, { timestamps: true });

// Helpful indexes (same spirit as your inventory snapshot)
bookingHistorySchema.index({ user_id: 1, slot_start: -1 });
bookingHistorySchema.index({ user_id: 1, booking_id: 1 }, { unique: true });
bookingHistorySchema.index({ location_name: 1 });

// Auto-fill booking_key + cache_valid_until
bookingHistorySchema.pre("save", function (next) {
  if (!this.booking_key && this.user_id != null && this.booking_id != null) {
    this.booking_key = `${this.user_id}:${this.booking_id}`;
  }
  if (this.as_of && this.cache_ttl_sec != null) {
    this.cache_valid_until = new Date(this.as_of.getTime() + this.cache_ttl_sec * 1000);
  }
  next();
});

module.exports = mongoose.model("BookingHistory", bookingHistorySchema);
