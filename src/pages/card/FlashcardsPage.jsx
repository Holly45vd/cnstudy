// src/pages/card/FlashcardsPage.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  Container, Stack, Typography, LinearProgress, Alert, Button,
  ToggleButton, ToggleButtonGroup, FormControlLabel, Switch, TextField, Autocomplete, Paper
} from "@mui/material";
import FlashcardCard from "../../components/FlashcardCard";
import { listUnits, getUnit, getWordsByIds, getPassedSet, markPassed } from "../../firebase/firestore";
import { useParams, useNavigate } from "react-router-dom";
import { freeTextPinyinToKorean } from "../../lib/pinyinKorean";
import { getAuth, onAuthStateChanged } from "firebase/auth";

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

/** koPron/예문 발음 자동 보정 */
function normalizeKoPron(word) {
  if (!word || typeof word !== "object") return word;
  const zh = word.zh ?? word.hanzi ?? word.id ?? "";
  let koPron =
    word.koPron ||
    word.koPronunciation ||
    word.pronunciation_ko ||
    (() => {
      if (Array.isArray(word.pronunciation) && word.pronunciation.length) {
        const exact = word.pronunciation.find((p) => p?.label === zh && p?.ko);
        return exact?.ko || word.pronunciation[0]?.ko || "";
      }
      return "";
    })();
  if (!koPron && word.pinyin) {
    try {
      const pin = Array.isArray(word.pinyin) ? word.pinyin.join(" ") : String(word.pinyin);
      koPron = freeTextPinyinToKorean(pin);
    } catch {}
  }
  let sentenceKo = word.sentenceKo;
  if (!sentenceKo && word.sentencePinyin) {
    try {
      const sp = Array.isArray(word.sentencePinyin) ? word.sentencePinyin.join(" ") : String(word.sentencePinyin);
      sentenceKo = freeTextPinyinToKorean(sp);
    } catch {}
  }
  if (!koPron && !sentenceKo) return word;
  return {
    ...word,
    ...(koPron ? { koPron, pronunciation_ko: koPron } : {}),
    ...(sentenceKo ? { sentenceKo } : {}),
  };
}

export default function FlashcardsPage() {
  const { unitId: unitIdParam } = useParams();
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [units, setUnits] = useState([]);
  const [unitId, setUnitId] = useState(unitIdParam || "");
  const [wordsAll, setWordsAll] = useState([]);
  const [onlyWithSentence, setOnlyWithSentence] = useState(false);
  const [order, setOrder] = useState("shuffled");
  const [queue, setQueue] = useState([]);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(false);
  const [seed, setSeed] = useState(Date.now());
  const [passedIds, setPassedIds] = useState(() => new Set());

  // 로그인 상태
  useEffect(() => {
    const auth = getAuth();
    return onAuthStateChanged(auth, (u) => setUser(u || null));
  }, []);

  // 유닛 목록
  useEffect(() => {
    (async () => {
      try {
        const u = await listUnits({ max: 500 });
        setUnits(Array.isArray(u) ? u : []);
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  // 유닛 변경 시 단어 + 통과 이력 로드
  useEffect(() => {
    (async () => {
      if (!unitId) return;
      setLoading(true);
      setFlipped(false);
      try {
        const u = await getUnit(String(unitId));
        const ids = Array.isArray(u?.vocabIds) ? u.vocabIds.map(String) : [];
        const raw = await getWordsByIds(ids);
        setWordsAll(raw.map(normalizeKoPron));

        // 통과 이력
        let passed = new Set();
        if (user?.uid) {
          try {
            passed = await getPassedSet(user.uid, String(unitId));
          } catch (e) {
            console.warn("getPassedSet 실패, localStorage 사용", e);
          }
        }
        if (!user?.uid) {
          const key = `progress:${unitId}`;
          try {
            const arr = JSON.parse(localStorage.getItem(key) || "[]");
            passed = new Set(arr.map(String));
          } catch {}
        }
        setPassedIds(passed);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [unitId, user?.uid]);

  // 필터 + 정렬 → 큐 갱신
  const words = useMemo(() => {
    const base = onlyWithSentence
      ? wordsAll.filter(w => (w?.sentence || w?.sentenceKo || w?.sentencePinyin))
      : wordsAll.slice();
    if (order === "original") return base;
    return shuffle(base, seed);
  }, [wordsAll, onlyWithSentence, order, seed]);

  useEffect(() => {
    setQueue(words.map((_, i) => i));
    setIdx(0);
    setFlipped(false);
  }, [words]);

  const current = words.length ? words[queue[idx]] : null;
  const currentKey = current ? String(current.id ?? current.zh ?? current.hanzi ?? queue[idx]) : "";

  const flip = useCallback(() => setFlipped(f => !f), []);
  const next = useCallback(() => {
    setFlipped(false);
    setIdx(i => Math.min(i + 1, Math.max(words.length - 1, 0)));
  }, [words.length]);
  const prev = useCallback(() => {
    setFlipped(false);
    setIdx(i => Math.max(i - 1, 0));
  }, []);

  // Good: 통과 기록 + 영속화 + 다음
  const good = useCallback(async () => {
    if (!currentKey) return;
    setPassedIds(prev => {
      const n = new Set(prev);
      n.add(currentKey);
      return n;
    });
    try {
      if (user?.uid) {
        await markPassed(user.uid, String(unitId), String(currentKey));
      } else {
        const key = `progress:${unitId}`;
        const arr = Array.from(new Set([...(JSON.parse(localStorage.getItem(key) || "[]")), String(currentKey)]));
        localStorage.setItem(key, JSON.stringify(arr));
      }
    } catch (e) {
      console.error("통과 저장 실패", e);
    }
    next();
  }, [currentKey, next, unitId, user?.uid]);

  // URL 동기화
  useEffect(() => {
    if (unitIdParam !== unitId && unitId) navigate(`/flashcards/${unitId}`, { replace: true });
  }, [unitId, unitIdParam, navigate]);

  // 진행 퍼센트: "통과(Set.size) / 총 단어"
  const goodCount = passedIds.size;
  const progressPercent = words.length ? (goodCount / words.length) * 100 : 0;

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

        {/* ← 요청: 진행바를 유닛 선택 '바로 아래'로 이동 */}
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Stack spacing={1}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="subtitle2" fontWeight={700}>오늘의 학습 진행</Typography>
              <Typography variant="caption" color="text.secondary">
                통과 {goodCount} · 총 {words.length}
              </Typography>
            </Stack>
            <LinearProgress variant="determinate" value={progressPercent} />
          </Stack>
        </Paper>

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
          <Button onClick={() => setSeed(Date.now())}>씨드 갱신(다시 섞기)</Button>
        </Stack>

        {loading && <LinearProgress />}

        {/* 카드 */}
        {(!words.length || !current) && !loading && (
          <Alert severity="info">표시할 단어가 없습니다. 유닛을 선택하거나 필터를 확인하세요.</Alert>
        )}

        {words.length > 0 && current && (
          <>
            <FlashcardCard
              word={current}
              flipped={flipped}
              onFlip={flip}
              onGood={good}
              passed={passedIds.has(currentKey)}
            />

            {/* 이동 컨트롤 */}
            <Stack direction="row" spacing={1} justifyContent="center">
              <Button variant="outlined" onClick={prev} disabled={idx === 0}>이전(←)</Button>
              <Button variant="contained" onClick={flip}>뒤집기(Space)</Button>
              <Button variant="outlined" onClick={next} disabled={idx >= words.length - 1}>다음(→)</Button>
            </Stack>
          </>
        )}
      </Stack>
    </Container>
  );
}
