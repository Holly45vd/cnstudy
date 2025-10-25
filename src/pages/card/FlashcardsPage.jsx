// src/pages/card/FlashcardsPage.jsx
import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import {
  Container, Stack, Typography, LinearProgress, Alert, Button,
  ToggleButton, ToggleButtonGroup, FormControlLabel, Switch, TextField, Autocomplete
} from "@mui/material";
import FlashcardCard from "../../components/FlashcardCard";
import { listUnits, getUnit, getWordsByIds } from "../../firebase/firestore";
import { useParams, useNavigate } from "react-router-dom";

/* 시드 지원 Fisher–Yates */
function shuffle(arr, seed = Date.now()) {
  const a = arr.slice();
  let s = seed >>> 0;
  const rand = () => (s = (s * 1664525 + 1013904223) >>> 0) / 0xffffffff;
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function FlashcardsPage() {
  const { unitId: unitIdParam } = useParams();
  const navigate = useNavigate();

  const [units, setUnits] = useState([]);
  const [unitId, setUnitId] = useState(unitIdParam || "");
  const [wordsAll, setWordsAll] = useState([]);
  const [onlyWithSentence, setOnlyWithSentence] = useState(false);
  const [order, setOrder] = useState("shuffled"); // shuffled | original
  const [queue, setQueue] = useState([]); // 학습 큐(인덱스 배열)
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(false);
  const seedRef = useRef(Date.now());

  // 1) 유닛 목록
  useEffect(() => {
    (async () => {
      try {
        const u = await listUnits({ max: 500 });
        setUnits(u);
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  // 2) 유닛 변경 시 로드
  useEffect(() => {
    if (!unitId) return;
    (async () => {
      setLoading(true);
      setFlipped(false);
      try {
        const u = await getUnit(String(unitId));
        const ids = Array.isArray(u?.vocabIds) ? u.vocabIds.map(String) : [];
        const words = await getWordsByIds(ids);
        setWordsAll(words);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [unitId]);

  // 3) 필터 + 정렬 → 큐 갱신
  const words = useMemo(() => {
    const base = onlyWithSentence
      ? wordsAll.filter(w => (w?.sentence || w?.sentenceKo || w?.sentencePinyin))
      : wordsAll.slice();
    if (order === "original") return base;
    return shuffle(base, seedRef.current);
  }, [wordsAll, onlyWithSentence, order]);

  useEffect(() => {
    setQueue(words.map((_, i) => i));
    setIdx(0);
    setFlipped(false);
  }, [words]);

  const progress = words.length ? (idx / words.length) * 100 : 0;
  const current = words[queue[idx]];

  const flip = useCallback(() => setFlipped(f => !f), []);
  const next = useCallback(() => {
    setFlipped(false);
    setIdx(i => Math.min(i + 1, Math.max(words.length - 1, 0)));
  }, [words.length]);
  const prev = useCallback(() => {
    setFlipped(false);
    setIdx(i => Math.max(i - 1, 0));
  }, []);

  // Again: 현재 카드를 몇 장 뒤에 재삽입
  const again = useCallback(() => {
    if (!words.length) return;
    setQueue(q => {
      const cur = q[idx];
      const rest = q.filter((_, i) => i !== idx);
      const offset = Math.min(4, Math.max(2, Math.floor(words.length * 0.15)));
      const insertAt = Math.min(idx + offset, rest.length);
      const newQ = rest.slice(0, insertAt).concat([cur], rest.slice(insertAt));
      return newQ;
    });
    next();
  }, [idx, next, words.length]);

  const good = useCallback(() => next(), [next]);

  // 키보드
  useEffect(() => {
    const onKey = (e) => {
      if (e.code === "Space") { e.preventDefault(); flip(); }
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [flip, next, prev]);

  // URL 동기화(선택 시 이동)
  useEffect(() => {
    if (unitIdParam !== unitId && unitId) navigate(`/flashcards/${unitId}`, { replace: true });
  }, [unitId, unitIdParam, navigate]);

  return (
    <Container maxWidth="md" sx={{ py: 3 }}>
      <Stack spacing={2}>
        <Typography variant="h4" fontWeight={800}>Flashcards</Typography>

        {/* 유닛 선택 */}
        <Autocomplete
          options={units}
          getOptionLabel={(o) => String(o?.id ?? "")}
          value={units.find(u => String(u.id) === String(unitId)) || null}
          onChange={(_, v) => setUnitId(v?.id ? String(v.id) : "")}
          renderInput={(params) => <TextField {...params} label="Unit 선택" placeholder="예: 1, 2, 3..." />}
          disableClearable
        />

        {/* 옵션 */}
        <Stack direction="row" spacing={2} alignItems="center">
          <ToggleButtonGroup
            exclusive
            value={order}
            onChange={(_, v) => v && setOrder(v)}
            size="small"
          >
            <ToggleButton value="shuffled">랜덤</ToggleButton>
            <ToggleButton value="original">원래 순서</ToggleButton>
          </ToggleButtonGroup>
          <FormControlLabel
            control={
              <Switch
                checked={onlyWithSentence}
                onChange={(e) => setOnlyWithSentence(e.target.checked)}
              />
            }
            label="예문 있는 것만"
          />
          <Button
            onClick={() => (seedRef.current = Date.now() || ((Math.random() * 1e9) | 0))}
            onMouseUp={() => setOrder(o => (o === "shuffled" ? "shuffled" : o))} // 시드 갱신 후 재셔플 유도
          >
            씨드 갱신(다시 섞기)
          </Button>
        </Stack>

        {loading && <LinearProgress />}

        {/* 카드 */}
        {words.length === 0 && !loading && (
          <Alert severity="info">표시할 단어가 없습니다. 유닛을 선택하거나 필터를 확인하세요.</Alert>
        )}

        {words.length > 0 && (
          <>
            <FlashcardCard word={current} flipped={flipped} onFlip={flip} />

            {/* 컨트롤 */}
            <Stack direction="row" spacing={1} justifyContent="center">
              <Button variant="outlined" onClick={prev} disabled={idx === 0}>이전(←)</Button>
              <Button variant="contained" onClick={flip}>뒤집기(Space)</Button>
              <Button variant="outlined" onClick={next} disabled={idx >= words.length - 1}>다음(→)</Button>
            </Stack>

            <Stack direction="row" spacing={1} justifyContent="center">
              <Button onClick={again}>Again(다시)</Button>
              <Button onClick={good}>Good(통과)</Button>
            </Stack>

            {/* 진행률 */}
            <Stack spacing={0.5}>
              <LinearProgress variant="determinate" value={progress} />
              <Typography variant="caption" align="center">
                {idx + 1} / {words.length}
              </Typography>
            </Stack>
          </>
        )}
      </Stack>
    </Container>
  );
}
