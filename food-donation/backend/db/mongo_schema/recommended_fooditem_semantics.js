const mongoose = require("mongoose");

const schema = new mongoose.Schema(
  {
    item_id: { type: Number, required: true, unique: true },
    name: { type: String, required: true, trim: true },

    // ✅ denormalized snapshot from PG at seed time
    category: { type: String, default: "" },
    qty_total: { type: Number, default: 0 },
    min_expiry: { type: Date, default: null },

    // existing vector
    embedding: { type: [Number], required: true },

    tags: [{ type: String }],
    synonyms: [{ type: String }],
    allergen_flags: [{ type: String }],
    updated_at: { type: Date, default: Date.now },
  },
  { collection: "recommended_fooditem_semantics" }
);

// keep only one unique index
// schema.index({ item_id: 1 }, { unique: true }); // <- don't duplicate if unique already on path

module.exports =
  mongoose.models.RecommendedFoodItemSemantics ||
  mongoose.model("RecommendedFoodItemSemantics", schema);
