// backend/db/mongo_schema/recommended_fooditem_semantics.js
const mongoose = require("mongoose");

const schema = new mongoose.Schema({
  item_id: { type: Number, unique: true, required: true },
  name: { type: String, required: true, trim: true },
  tags: [{ type: String }],
  synonyms: [{ type: String }],
  allergen_flags: [{ type: String }],
  embedding: [{ type: Number, required: true }], // 1536 or 3072 dims based on model
  updated_at: { type: Date, default: Date.now }
}, { collection: "recommended_fooditem_semantics" });

schema.index({ item_id: 1 }, { unique: true });
schema.index({ tags: 1 });

module.exports = mongoose.models.RecommendedFoodItemSemantics ||
  mongoose.model("RecommendedFoodItemSemantics", schema);
