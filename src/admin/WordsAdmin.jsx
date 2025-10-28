// src/admin/WordsAdmin.jsx
import React, { useMemo, useState } from "react";
import {
  Container, Typography, Paper, Stack, Grid, TextField,
  Button, Alert, Chip
} from "@mui/material";
import { upsertWord } from "../firebase/firestore";

/* ===== 유틸 ===== */
const REQUIRED = ["zh", "pinyin", "ko"];

const normalizeWord = (w) => {
  if (!w) return w;
  // 호환 키 보정
  if (w.koPron) w.koPronunciation = w.koPron;
  if (w.sentencePron) w.sentenceKoPronunciation = w.sentencePron;

  const out = {
    id: w.id || w.zh,
    zh: w.zh ?? "",
    pinyin: w.pinyin ?? "",
    ko: w.ko ?? "",
    pos: w.pos || "",
    tags: Array.isArray(w.tags)
      ? w.tags
      : (w.tags ? String(w.tags).split(",").map((s) => s.trim()) : []),
    sentence: w.sentence || "",
    sentencePinyin: w.sentencePinyin || "",
    sentenceKo: w.sentenceKo || "",
    sentenceKoPronunciation: w.sentenceKoPronunciation || "",
    pronunciation: Array.isArray(w.pronunciation) ? w.pronunciation : [],
    extensions: Array.isArray(w.extensions) ? w.extensions : [],
    grammar: Array.isArray(w.grammar) ? w.grammar : [],
    keyPoints: Array.isArray(w.keyPoints) ? w.keyPoints : [],
    meta: { ...(w.meta || {}), updatedAt: new Date() },
  };

  // 필수 체크
  const missing = [];
  if (!out.id || !out.zh) missing.push("id/zh");
  if (!out.pinyin) missing.push("pinyin");
  if (!out.ko) missing.push("ko");
  if (missing.length) {
    throw new Error(`필수 누락: ${missing.join(", ")} (항목: ${JSON.stringify(w)})`);
  }
  return out;
};

function tryParseJsonArray(input) {
  const txt = String(input || "").trim();
  if (!txt) return { items: [], error: null };
  try {
    const arr = JSON.parse(txt);
    if (!Array.isArray(arr)) {
      return { items: [], error: "JSON은 배열이어야 합니다. 예: [ { ... }, { ... } ]" };
    }
    const normalized = arr.map(normalizeWord);
    return { items: normalized, error: null };
  } catch (e) {
    return { items: [], error: e.message || "JSON 파싱 실패" };
  }
}

/* ===== 컴포넌트 ===== */
export default function WordsAdmin() {
  /* 단건 입력 폼 */
  const [form, setForm] = useState({
    zh: "", pinyin: "", ko: "", pos: "", tags: "",
    sentence: "", sentencePinyin: "", sentenceKo: "", sentenceKoPronunciation: "",
  });

  /* 일괄 입력(JSON) */
  const [bulkText, setBulkText] = useState(`[
  {
    "id": "黑板",
    "zh": "黑板",
    "pinyin": "hēibǎn",
    "ko": "칠판",
    "pos": "명사",
    "tags": ["학교","사물","교육"],
    "sentence": "老师在黑板上写字。",
    "sentencePinyin": "Lǎoshī zài hēibǎn shàng xiězì.",
    "sentenceKo": "선생님이 칠판에 글씨를 쓰고 있어요."
  }
]`);
  const bulkParsed = useMemo(() => tryParseJsonArray(bulkText), [bulkText]);
  const [status, setStatus] = useState("");

  /* 단건 저장 */
  async function handleSingleSave() {
    try {
      setStatus("저장 중…");
      for (const k of REQUIRED) {
        if (!form[k]) throw new Error(`필수 누락: ${k}`);
      }
      const doc = normalizeWord({
        zh: form.zh,
        pinyin: form.pinyin,
        ko: form.ko,
        pos: form.pos,
        tags: form.tags ? form.tags.split(",").map((s) => s.trim()) : [],
        sentence: form.sentence,
        sentencePinyin: form.sentencePinyin,
        sentenceKo: form.sentenceKo,
        sentenceKoPronunciation: form.sentenceKoPronunciation,
      });
      await upsertWord(doc);
      setStatus(`단건 저장 완료: ${doc.id}`);
    } catch (e) {
      setStatus("에러: " + (e.message || String(e)));
    }
  }

  /* 일괄 저장 */
  async function handleBulkSave() {
    try {
      setStatus("일괄 업로드 중…");
      if (bulkParsed.error) throw new Error("JSON 파싱 실패: " + bulkParsed.error);
      const items = bulkParsed.items;
      if (!items.length) throw new Error("업로드할 항목이 없습니다.");
      for (const w of items) await upsertWord(w);
      setStatus(`일괄 저장 완료 (${items.length}건)`);
    } catch (e) {
      setStatus("에러: " + (e.message || String(e)));
    }
  }

  /* 미리보기 → 폼 복사 */
  function copyToForm(w) {
    setForm({
      zh: w.zh || "",
      pinyin: w.pinyin || "",
      ko: w.ko || "",
      pos: w.pos || "",
      tags: Array.isArray(w.tags) ? w.tags.join(", ") : (w.tags || ""),
      sentence: w.sentence || "",
      sentencePinyin: w.sentencePinyin || "",
      sentenceKo: w.sentenceKo || "",
      sentenceKoPronunciation: w.sentenceKoPronunciation || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>
        단어 관리
      </Typography>

      {/* ===== 단건 등록 ===== */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 3 }}>
        <Typography variant="subtitle1"  sx={{ mb: 2 }}>
          단건 등록
        </Typography>

        <Grid container spacing={2}>
          {[
            "zh", "pinyin", "ko", "pos", "tags",
            "sentence", "sentencePinyin", "sentenceKo", "sentenceKoPronunciation",
          ].map((k) => (
            <Grid item xs={12} sm={6} key={k}>
              <TextField
                label={k}
                value={form[k]}
                onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))}
                fullWidth
              />
            </Grid>
          ))}
        </Grid>

        <Stack direction="row" spacing={1} sx={{ mt: 2 }} alignItems="center" flexWrap="wrap">
          <Button variant="contained" onClick={handleSingleSave}>
            저장
          </Button>
          <Chip size="small" label="* 필수: zh, pinyin, ko" sx={{ ml: 1 }} />
          {!!status && (
            <Alert
              severity={status.startsWith("에러") ? "error" : (status.includes("완료") ? "success" : "info")}
              variant="outlined"
              sx={{ ml: 2 }}
            >
              {status}
            </Alert>
          )}
        </Stack>
      </Paper>

      {/* ===== 일괄 업로드(JSON) ===== */}
      <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
        <Stack spacing={1.5}>
          <Typography variant="subtitle1" >
            JSON 일괄 업로드
          </Typography>

          <TextField
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            multiline
            minRows={12}
            fullWidth
            placeholder={`[\n  { "zh":"您好","pinyin":"Nín hǎo","ko":"안녕하십니까","pos":"감탄사" }\n]`}
            InputProps={{ sx: { fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" } }}
          />

          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            <Button variant="outlined" onClick={handleBulkSave}>
              업로드
            </Button>
            {bulkParsed.error ? (
              <Alert severity="error" variant="outlined">{bulkParsed.error}</Alert>
            ) : (
              <Chip label={`파싱 ${bulkParsed.items.length}건`} size="small" color="primary" />
            )}
          </Stack>

          {/* 미리보기 + 폼 복사 */}
          {bulkParsed.items.length > 0 && (
            <>
              <Typography variant="caption" color="text.secondary">
                미리보기 (클릭하면 상단 폼으로 복사)
              </Typography>
              <Grid container spacing={1.5}>
                {bulkParsed.items.map((w, i) => (
                  <Grid item xs={12} sm={6} md={4} key={w.id || `${w.zh}-${i}`}>
                    <Paper
                      variant="outlined"
                      sx={{ p: 1.5, borderRadius: 2, cursor: "pointer" }}
                      onClick={() => copyToForm(w)}
                    >
                      <Stack spacing={0.5}>
                        <Typography >{w.zh}</Typography>
                        <Typography variant="body2" color="text.secondary">{w.pinyin}</Typography>
                        <Typography variant="body2">{w.ko}</Typography>
                        {w.pos && <Chip size="small" label={w.pos} sx={{ mt: 0.5, width: "fit-content" }} />}
                        {w.sentence && (
                          <Typography variant="caption" color="text.secondary">
                            예문: {w.sentenceKo || w.sentence}
                          </Typography>
                        )}
                      </Stack>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </>
          )}
        </Stack>
      </Paper>
    </Container>
  );
}
