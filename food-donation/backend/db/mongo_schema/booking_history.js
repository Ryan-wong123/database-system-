// db/mongo_schema/booking_history.js
const mongoose = require("mongoose");

const bookingHistorySchema = new mongoose.Schema({
  booking_key: { type: String, required: true, unique: true },

  user_id:    { type: Number, required: true, index: true },
  booking_id: { type: Number, required: true },

  location_id:   { type: Number },
  location_name: { type: String, trim: true },
  slot_start:    { type: Date },
  slot_end:      { type: Date },

  status: {
    type: String,
    enum: ["pending", "confirmed", "completed", "cancelled", "expired"],
    default: "pending",
    index: true
  },
  created_at: { type: Date },

  items_count: { type: Number, default: 0, min: 0 },
  items: [{
    item_id:       { type: Number, required: true },
    name:          { type: String, trim: true },
    unit:          { type: String, trim: true },
    qty_allocated: { type: Number, default: 0, min: 0 },  // <-- follow PG
    qty_collected: { type: Number, default: 0, min: 0 },  // <-- follow PG
  }],

  source: { type: String, default: "postgres" },

  as_of:             { type: Date, default: Date.now },
  cache_ttl_sec:     { type: Number, default: 300 },
  cache_valid_until: { type: Date },
  cache_status: {
    type: String,
    enum: ["fresh", "stale", "expired"],
    default: "fresh",
    index: true
  },
}, { timestamps: true });

bookingHistorySchema.index({ user_id: 1, slot_start: -1 });
bookingHistorySchema.index({ user_id: 1, booking_id: 1 }, { unique: true });
bookingHistorySchema.index({ location_name: 1 });

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
