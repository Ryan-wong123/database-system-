const mongoose = require("mongoose");

const inventoryCacheSchema = new mongoose.Schema({
  inventory_id: { type: String, required: true, unique: true }, // stable key
  item_name: { type: String, required: true, trim: true },
  category: { type: String, trim: true },
  unit: { type: String, trim: true },

  qty_on_hand: { type: Number, default: 0, min: 0 },
  qty_reserved: { type: Number, default: 0, min: 0 },

  location_id: { type: Number },
  location_name: { type: String, required: true, trim: true },

  expiry_date: { type: Date },

  lot_id: { type: Number },
  food_item_id: { type: Number },

  diets: {
    type: [String],               // e.g. ["Halal", "Vegan", "Nut-Free"]
    default: [],
    index: true,                  // fast filter: {"diets":"Halal"}
  },

  // -------- Cache metadata (for sync + staleness) --------
  as_of: { type: Date, default: Date.now }, // when this doc was last refreshed
  cache_ttl_sec: { type: Number, default: 300 },     // policy (e.g., 5mins)
  cache_valid_until: { type: Date },   // derived: cache_synced_at + ttl
  cache_status: {
    type: String,
    enum: ["fresh", "stale", "expired"],
    default: "fresh",
    index: true
  },
}, { timestamps: true });

// Helpful indexes
inventoryCacheSchema.index({ category: 1, expiry_date: 1 });
inventoryCacheSchema.index({ location_name: 1 });
inventoryCacheSchema.index({ lot_id: 1 }, { sparse: true });
inventoryCacheSchema.index({ food_item_id: 1 }, { sparse: true });


module.exports = mongoose.model("InventoryCache", inventoryCacheSchema);