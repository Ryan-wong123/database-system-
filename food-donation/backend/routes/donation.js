const express = require("express");
const router = express.Router();
const { getDonations, getDonationsByAccount, approveDonation, cancelDonation } = require("../db/donation");
const ALLOWED_DONATION_STATUSES = new Set(['pending','confirmed','cancelled','completed']);



router.get("/list", async(req, res)=>{
    try{
        const rows = await getDonations();
        res.json({ ok: true, items: rows, count: rows.length });
        } catch (err) {
            console.error(err);
            res.status(500).json({ ok: false, error: err.message });
        }
})



router.get("/list/:id", async(req, res)=>{
    try{
        //need to add auth logic here later
        const id = Number(req.params.id);
        if (!Number.isInteger(id)) {
            // surface a clear 400-style error to the caller
            const e = new Error(`Invalid id: ${id}`);
            e.status = 400;
            throw e;
        }
        const rows = await getDonationsByAccount(id);

        //no result
        if (rows.length === 0){
            return res.status(404).json({ ok: false, error: "Not found" });
        }

        //have result
        res.json({ ok: true, item: rows[0] });

        //some error
        } catch (err) {
            console.error(err);
            res.status(500).json({ ok: false, error: err.message });
        }
})


router.post("/approve", async (req, res) => {
  try {
    const {donation_id, approve_status} = req.body;
    const id = Number(donation_id);
    if (!Number.isInteger(donation_id)) {
        const e = new Error(`Invalid id: ${donation_id}`);
        e.status = 400;
        throw e;
    }
    if (!ALLOWED_DONATION_STATUSES.has(String(approve_status))) {
      return res.status(400).json({ ok: false, error: `Invalid approve_status: ${approve_status}` });
    }

    let result
    if (approve_status == "confirmed"){
        result = await approveDonation(donation_id);
    }
    else{
        result = await cancelDonation(donation_id);
    }

    if (result.rowCount == 0) {
      return res.status(409).json({ ok: false, error: "No rows updated (already processed or not found)" });
    }
    else if (result) {
      return res.status(201).json({ ok: true, result });
    }
    return res.status(500).json({ ok: false, error: "Update failed" });

  } catch (err) {
    // Map common Postgres error codes
    if (err.code === "23503") {
      // Fkey violation
      return res
        .status(400)
        .json({ ok: false, error: "Invalid reference: " + err.detail });
    }
    // Generic error
    console.error("DB error:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});


module.exports = router;
