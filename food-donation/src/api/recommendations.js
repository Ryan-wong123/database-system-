// src/api/recommendations.js
export async function getHouseholdLocationRecs(householdId, locationId, limit = 12, userIdHeader) {
  const res = await fetch(
    `/recommendations?household_id=${Number(householdId)}&location_id=${Number(locationId)}&limit=${Number(limit)}`,
    { headers: userIdHeader ? { "x-user-id": String(userIdHeader) } : {} }
  );
  if (!res.ok) throw new Error(`Recommendations failed: ${res.status}`);
  const data = await res.json();
  return data.items || []; // [{ item_id, name, category, score }]
}

export async function semanticSearchItems(q, userIdHeader) {
  const res = await fetch(`/recommendations/semantic-search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(userIdHeader ? { "x-user-id": String(userIdHeader) } : {})
    },
    body: JSON.stringify({ q: String(q || "").trim() })
  });
  if (!res.ok) throw new Error(`Semantic search failed: ${res.status}`);
  const data = await res.json();
  return data.results || []; // [{ item_id, name, category, qty, expiry, score }]
}
