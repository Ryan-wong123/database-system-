const mongoose = require('mongoose');

const PrefSchema = new mongoose.Schema({
  diet: { type: String, default: null },
  avoids: { type: [String], default: undefined }, // optional array
  notes: { type: String, default: null },
}, { _id: false });

const HouseholdProfileSchema = new mongoose.Schema({
  household_id: { type: Number, required: true, unique: true }, // FK to SQL Households
  user_id:      { type: Number }, // creator/last-editor (optional)
  preferences:  { type: PrefSchema, default: () => ({}) },
  address:      { type: String, default: null },
  allergies_notes: { type: String, default: null },
  embedding:    { type: [Number], required: true }, // optional, fill by worker
  updated_at:   { type: Date, default: () => new Date() },
}, {
  collection: 'household_profiles',
});

HouseholdProfileSchema.index({ household_id: 1 }, { unique: true });
HouseholdProfileSchema.index({ updated_at: -1 });

module.exports = mongoose.model('HouseholdProfile', HouseholdProfileSchema);