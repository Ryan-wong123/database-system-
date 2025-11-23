// db/mongo_schema/household_diet_semantics.js
const mongoose = require("mongoose");

const schema = new mongoose.Schema(
  {
    // household key
    household_id: { type: Number, required: true, unique: true },

    // denormalized prefs snapshot at seed time
    preferences: {
      diet:   { type: String, default: null },
      avoids: [{ type: String }],
      notes:  { type: String, default: null },
    },

    // vector
    embedding: { type: [Number], required: true },

    // optional metadata
    tags: [{ type: String }],

    updated_at: { type: Date, default: Date.now },
  },
  {
    // let ENV override collection if you want; otherwise use a stable default
    collection: "household_profiles",
  }
);

// keep only one unique index
// schema.index({ household_id: 1 }, { unique: true });

module.exports =
  mongoose.models.HouseholdDietSemantics ||
  mongoose.model("HouseholdDietSemantics", schema);
