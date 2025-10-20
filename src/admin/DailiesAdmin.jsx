import React, { useEffect, useState } from "react";
import { getDaily, setDailyWords, getWordsByIds } from "../firebase/firestore";
import {
  Container, Stack, Typography, TextField, Button, Paper,
  Grid, Box, Alert, LinearProgress
} from "@mui/material";

function today() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export default function DailiesAdmin() {
  const [date, setDate] = useState(today());
  const [wordIds, setWordIds] = useState("工作, 愿意, 漂亮");
  const [status, setStatus] = useState("");
  const [preview, setPreview] = useState([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    try {
      setLoading(true);
      setStatus("로드 중…");
      const d = await getDaily(date);
      if (d?.wordIds?.length) setWordIds(d.wordIds.join(", "));
      setStatus("로드 완료");
    } catch (e) {
      setStatus("에러: " + (e.message || String(e)));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      const ids = wordIds.split(",").map(s => s.trim()).filter(Boolean);
      if (ids.length === 0) { if (alive) setPreview([]); return; }
      try {
        const ws = await getWordsByIds(ids);
        const map = new Map(ws.map(w => [w.id, w]));
        if (alive) setPreview(ids.map(i => map.get(i)).filter(Boolean));
      } catch {
        if (alive) setPreview([]);
      }
    })();
    return () => { alive = false; };
  }, [wordIds]);

  async function save() {
    try {
      const ids = wordIds.split(",").map(s => s.trim()).filter(Boolean);
      if (ids.length === 0) throw new Error("wordIds 비어있음");
      setLoading(true);
      setStatus("저장 중…");
      await setDailyWords(date, ids);
      setStatus("저장 완료");
    } catch (e) {
      setStatus("에러: " + (e.message || String(e)));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 2 }}>데일리 관리</Typography>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={2}>
          <Stack direction="row" spacing={1} alignItems="center">
            <TextField
              type="date"
              size="small"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              sx={{ width: 220 }}
            />
            <Button variant="outlined" onClick={load}>불러오기</Button>
            {loading && <LinearProgress sx={{ flex: 1 }} />}
          </Stack>

          {!!status && (
            <Alert severity={status.startsWith("에러") ? "error" : "info"} variant="outlined">
              {status}
            </Alert>
          )}

          <TextField
            label="wordIds (콤마 구분)"
            placeholder="예: 工作, 愿意, 漂亮"
            value={wordIds}
            onChange={(e) => setWordIds(e.target.value)}
            fullWidth
          />

          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              미리보기
            </Typography>
            {preview.length === 0 ? (
              <Paper variant="outlined" sx={{ p: 2, color: "text.secondary" }}>
                해당 단어를 찾지 못했거나 비어있음.
              </Paper>
            ) : (
              <Grid container spacing={1}>
                {preview.map(w => (
                  <Grid item xs={12} sm={6} md={4} key={w.id}>
                    <Paper variant="outlined" sx={{ p: 1.5 }}>
                      <Typography fontWeight={600}>{w.zh}</Typography>
                      <Typography variant="body2" color="text.secondary">{w.pinyin}</Typography>
                      <Typography variant="body2">{w.ko}</Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>

          <Stack direction="row" spacing={1}>
            <Button variant="contained" onClick={save}>저장</Button>
          </Stack>
        </Stack>
      </Paper>
    </Container>
  );
}
