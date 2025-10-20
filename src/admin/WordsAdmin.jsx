import React, { useMemo, useState } from "react";
import { upsertWord, getWordsByIds } from "../firebase/firestore";
import {
  Container, Typography, Paper, Stack, Grid, TextField,
  Button, Alert
} from "@mui/material";

const required = ["zh", "pinyin", "ko"];
const normalizeWord = (w) => {
  if (!w) return w;
  if (w.koPron) w.koPronunciation = w.koPron;
  if (w.sentencePron) w.sentenceKoPronunciation = w.sentencePron;
  return {
    id: w.id || w.zh,
    zh: w.zh,
    pinyin: w.pinyin,
    ko: w.ko,
    pos: w.pos || "",
    tags: w.tags || [],
    sentence: w.sentence || "",
    sentencePinyin: w.sentencePinyin || "",
    sentenceKo: w.sentenceKo || "",
    sentenceKoPronunciation: w.sentenceKoPronunciation || "",
    pronunciation: w.pronunciation || [],
    extensions: w.extensions || [],
    grammar: w.grammar || [],
    keyPoints: w.keyPoints || [],
    meta: { ...(w.meta || {}), updatedAt: new Date() },
  };
};

function parseJsonSafe(input) {
  try { return [JSON.parse(input), null]; }
  catch (e) { return [null, e.message]; }
}

export default function WordsAdmin() {
  const [form, setForm] = useState({
    zh: "", pinyin: "", ko: "", pos: "", tags: "",
    sentence: "", sentencePinyin: "", sentenceKo: "", sentenceKoPronunciation: "",
  });
  const [bulkText, setBulkText] = useState(`[
  { "zh":"您好", "pinyin":"Nín hǎo", "ko":"안녕하십니까", "pos":"감탄사",
    "sentence":"您好，请问您是王老师吗？",
    "sentencePinyin":"Nín hǎo, qǐngwèn nín shì Wáng lǎoshī ma?",
    "sentenceKo":"안녕하십니까, 혹시 왕 선생님이신가요?",
    "tags":["인사","존칭"]
  }
]`);
  const [status, setStatus] = useState("");

  const previewIds = useMemo(() => {
    const [arr] = parseJsonSafe(bulkText);
    return Array.isArray(arr) ? arr.slice(0, 10).map(v => v.id || v.zh).filter(Boolean) : [];
  }, [bulkText]);

  async function handleSingleSave() {
    setStatus("저장 중…");
    try {
      for (const k of required) {
        if (!form[k]) throw new Error(`필수 누락: ${k}`);
      }
      const doc = normalizeWord({
        zh: form.zh,
        pinyin: form.pinyin,
        ko: form.ko,
        pos: form.pos,
        tags: form.tags ? form.tags.split(",").map(s => s.trim()) : [],
        sentence: form.sentence,
        sentencePinyin: form.sentencePinyin,
        sentenceKo: form.sentenceKo,
        sentenceKoPronunciation: form.sentenceKoPronunciation,
      });
      await upsertWord(doc);
      setStatus("단건 저장 완료");
    } catch (e) {
      setStatus("에러: " + (e.message || String(e)));
    }
  }

  async function handleBulkSave() {
    setStatus("일괄 업로드 중…");
    try {
      const [arr, err] = parseJsonSafe(bulkText);
      if (err) throw new Error("JSON 파싱 실패: " + err);
      if (!Array.isArray(arr)) throw new Error("배열 형태 JSON이어야 함");
      for (const w of arr.map(normalizeWord)) {
        for (const k of required) {
          if (!w[k]) throw new Error(`${w.id || "항목"}: 필수 누락 ${k}`);
        }
        await upsertWord(w);
      }
      setStatus(`일괄 저장 완료 (${arr.length}건)`);
    } catch (e) {
      setStatus("에러: " + (e.message || String(e)));
    }
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 2 }}>단어 관리</Typography>

      {/* 단건 입력 */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>단건 등록</Typography>
        <Grid container spacing={2}>
          {["zh","pinyin","ko","pos","tags","sentence","sentencePinyin","sentenceKo","sentenceKoPronunciation"].map(k => (
            <Grid item xs={12} sm={6} key={k}>
              <TextField
                label={k}
                value={form[k]}
                onChange={e => setForm(f => ({...f, [k]: e.target.value}))}
                fullWidth
              />
            </Grid>
          ))}
        </Grid>
        <Stack direction="row" spacing={1} sx={{ mt: 2 }} alignItems="center">
          <Button variant="contained" onClick={handleSingleSave}>저장</Button>
          {!!status && (
            <Alert severity={status.startsWith("에러") ? "error" : "info"} variant="outlined">
              {status}
            </Alert>
          )}
        </Stack>
      </Paper>

      {/* 일괄 업로드 */}
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>JSON 일괄 업로드</Typography>
        <TextField
          value={bulkText}
          onChange={(e) => setBulkText(e.target.value)}
          multiline minRows={10} fullWidth
          InputProps={{ sx: { fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" } }}
        />
        <Stack direction="row" spacing={1} sx={{ mt: 2 }} alignItems="center">
          <Button variant="outlined" onClick={handleBulkSave}>업로드</Button>
          {!!status && (
            <Alert severity={status.startsWith("에러") ? "error" : "info"} variant="outlined">
              {status}
            </Alert>
          )}
        </Stack>
        {previewIds.length > 0 && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
            업로드 예정 ID 예시: {previewIds.join(", ")}
          </Typography>
        )}
      </Paper>
    </Container>
  );
}
