// src/pages/unit/GrammarTab.jsx
import React, { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase";
import { Stack, Typography, Chip, CircularProgress, Alert } from "@mui/material";

export default function GrammarTab({ unitId }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(collection(db, "units", unitId, "grammar"));
        const arr = snap.docs.map((d) => d.data());
        setItems(arr);
      } catch (e) {
        console.error(e);
        setError("문법 정보를 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    })();
  }, [unitId]);

  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Stack spacing={2} sx={{ p: 2 }}>
      <Typography variant="h6" sx={{ fontWeight: 700 }}>
        📘 문법 요약
      </Typography>

      <Stack direction="row" flexWrap="wrap" gap={1}>
        {items.map((g, i) => (
          <Chip key={i} label={g.title || g.summary || "문법 항목"} />
        ))}
      </Stack>

      <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
        {items.map((g) => g.summary).join(" · ")}
      </Typography>
    </Stack>
  );
}
