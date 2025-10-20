import React, { useEffect, useState } from "react";
import { getUnit, createUnit, updateUnit, getWordsByIds } from "../firebase/firestore";
import {
  Container, Typography, Paper, Stack, Grid, TextField,
  Button, Alert, LinearProgress, Box
} from "@mui/material";

function parseJsonSafe(s, fallback) {
  try { return JSON.parse(s || ""); } catch { return fallback; }
}
function toPretty(v) {
  try { return JSON.stringify(v ?? null, null, 2); } catch { return ""; }
}

export default function UnitsAdmin() {
  const [id, setId] = useState("");
  const [title, setTitle] = useState("");
  const [theme, setTheme] = useState("");
  const [goals, setGoals] = useState("");
  const [objectives, setObjectives] = useState("");
  const [vocabIds, setVocabIds] = useState("");

  const [conversationText, setConversationText] = useState("[]");
  const [grammarText, setGrammarText] = useState("[]");
  const [practiceText, setPracticeText] = useState("{}");
  const [summaryText, setSummaryText] = useState(`{"vocabulary":[],"grammar":[]}`);

  const [status, setStatus] = useState("");
  const [previewWords, setPreviewWords] = useState([]);
  const [loading, setLoading] = useState(false);

  async function loadUnit() {
    if (!id) return;
    try {
      setLoading(true);
      setStatus("로드 중…");
      const u = await getUnit(id);
      if (!u) { setStatus("존재하지 않음"); return; }
      setTitle(u.title || "");
      setTheme(u.theme || "");
      setGoals((u.goals || []).join(", "));
      setObjectives((u.objectives || []).join(", "));
      setVocabIds((u.vocabIds || []).join(", "));
      setConversationText(toPretty(u.conversation || []));
      setGrammarText(toPretty(u.grammar || []));
      setPracticeText(toPretty(u.practice || {}));
      setSummaryText(toPretty(u.summary || { vocabulary:[], grammar:[] }));
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
      const ids = vocabIds.split(",").map(s => s.trim()).filter(Boolean);
      if (ids.length === 0) { if (alive) setPreviewWords([]); return; }
      try {
        const ws = await getWordsByIds(ids);
        const map = new Map(ws.map(w => [w.id, w]));
        if (alive) setPreviewWords(ids.map(i => map.get(i)).filter(Boolean));
      } catch {
        if (alive) setPreviewWords([]);
      }
    })();
    return () => { alive = false; };
  }, [vocabIds]);

  async function handleSave(isCreate) {
    try {
      if (!id) throw new Error("id 필수");
      const doc = {
        id,
        title,
        theme,
        goals: goals ? goals.split(",").map(s => s.trim()).filter(Boolean) : [],
        objectives: objectives ? objectives.split(",").map(s => s.trim()).filter(Boolean) : [],
        vocabIds: vocabIds ? vocabIds.split(",").map(s => s.trim()).filter(Boolean) : [],
        conversation: parseJsonSafe(conversationText, []),
        grammar: parseJsonSafe(grammarText, []),
        practice: parseJsonSafe(practiceText, {}),
        summary: parseJsonSafe(summaryText, { vocabulary:[], grammar:[] }),
        updatedAt: new Date(),
      };
      setLoading(true);
      setStatus(isCreate ? "생성 중…" : "수정 중…");
      if (isCreate) await createUnit(doc);
      else await updateUnit(id, doc);
      setStatus("저장 완료");
    } catch (e) {
      setStatus("에러: " + (e.message || String(e)));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 2 }}>유닛 관리</Typography>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={2}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField label="id" value={id} onChange={e => setId(e.target.value)} fullWidth />
            </Grid>
            <Grid item xs={12} sm="auto">
              <Stack direction="row" spacing={1} alignItems="center" sx={{ height: "100%" }}>
                <Button variant="outlined" onClick={loadUnit}>불러오기</Button>
                {loading && <LinearProgress sx={{ width: 160 }} />}
              </Stack>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField label="title" value={title} onChange={e => setTitle(e.target.value)} fullWidth />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="theme" value={theme} onChange={e => setTheme(e.target.value)} fullWidth />
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="goals (콤마 구분)"
                value={goals}
                onChange={e => setGoals(e.target.value)}
                fullWidth
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="objectives (콤마 구분)"
                value={objectives}
                onChange={e => setObjectives(e.target.value)}
                fullWidth
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="vocabIds (콤마 구분, 단어ID)"
                value={vocabIds}
                onChange={e => setVocabIds(e.target.value)}
                placeholder="例) 点, 分, 半 ..."
                fullWidth
              />
            </Grid>
          </Grid>

          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                label="conversation (JSON)"
                value={conversationText}
                onChange={e => setConversationText(e.target.value)}
                multiline minRows={8} fullWidth
                InputProps={{ sx: { fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" } }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="grammar (JSON)"
                value={grammarText}
                onChange={e => setGrammarText(e.target.value)}
                multiline minRows={8} fullWidth
                InputProps={{ sx: { fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" } }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="practice (JSON)"
                value={practiceText}
                onChange={e => setPracticeText(e.target.value)}
                multiline minRows={8} fullWidth
                InputProps={{ sx: { fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" } }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="summary (JSON)"
                value={summaryText}
                onChange={e => setSummaryText(e.target.value)}
                multiline minRows={8} fullWidth
                InputProps={{ sx: { fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" } }}
              />
            </Grid>
          </Grid>

          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              vocabIds 미리보기
            </Typography>
            {previewWords.length === 0 ? (
              <Paper variant="outlined" sx={{ p: 2, color: "text.secondary" }}>
                해당 단어를 찾지 못했거나 비어있음.
              </Paper>
            ) : (
              <Grid container spacing={1}>
                {previewWords.map(w => (
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

          <Stack direction="row" spacing={1} alignItems="center">
            <Button variant="contained" onClick={() => handleSave(true)}>새로 만들기</Button>
            <Button variant="outlined" onClick={() => handleSave(false)}>수정 저장</Button>
          </Stack>

          {!!status && (
            <Alert severity={status.startsWith("에러") ? "error" : "info"} variant="outlined">
              {status}
            </Alert>
          )}
        </Stack>
      </Paper>
    </Container>
  );
}
