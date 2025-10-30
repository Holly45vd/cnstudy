// src/pages/card/FlashcardsPage.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  Container, Stack, Typography, LinearProgress, Alert, Button,
  ToggleButton, ToggleButtonGroup, FormControlLabel, Switch,
  Paper, Chip, Box, FormControl, InputLabel, Select, MenuItem,
  Checkbox, ListItemText, OutlinedInput
} from "@mui/material";

import FlashcardCard from "../../components/FlashcardCard";
import {
  listUnits, getUnit, getWordsByIds,
  getPassedSet, markPassed, listDailiesInRange
} from "../../firebase/firestore";
import { useParams, useNavigate } from "react-router-dom";
import { freeTextPinyinToKorean } from "../../lib/pinyinKorean";
import { getAuth, onAuthStateChanged } from "firebase/auth";

/* ========= UI constants ========= */
const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
  PaperProps: { style: { maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP, width: 260 } }
};

/* ========= Seeded shuffle ========= */
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

/* ========= Stable word key ========= */
function stableWordKey(w) {
  const id = w?.id ?? w?.zh ?? w?.hanzi ?? "";
  if (id) return String(id);
  const raw = [
    w?.zh ?? "", w?.hanzi ?? "",
    Array.isArray(w?.pinyin) ? w.pinyin.join(" ") : (w?.pinyin ?? ""),
    w?.sentence ?? ""
  ].join("|");
  let h = 2166136261 >>> 0;
  for (let i = 0; i < raw.length; i++) {
    h ^= raw.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return `anon_${h}`;
}

/* ========= Normalize Korean pronunciation ========= */
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
  return {
    ...word,
    ...(koPron ? { koPron, pronunciation_ko: koPron } : {}),
    ...(sentenceKo ? { sentenceKo } : {}),
  };
}

/* ========= yyyy-mm-dd ========= */
function fmtYMD(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function FlashcardsPage() {
  const { unitId: unitIdParam } = useParams();
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [units, setUnits] = useState([]);
  const [unitsError, setUnitsError] = useState("");

  const [selectedUnitIds, setSelectedUnitIds] = useState(() => {
    const fromUrl = unitIdParam ? [String(unitIdParam)] : [];
    const saved = JSON.parse(localStorage.getItem("flashcards:selectedUnits") || "[]");
    return fromUrl.length ? fromUrl : saved;
  });

  const [unitWordsAll, setUnitWordsAll] = useState([]);
  const [dailyWordsAll, setDailyWordsAll] = useState([]);
  const [includeDaily, setIncludeDaily] = useState(() => {
    const v = localStorage.getItem("flashcards:includeDaily");
    return v === null ? true : v === "1";
  });
  const [onlyWithSentence, setOnlyWithSentence] = useState(() => {
    const v = localStorage.getItem("flashcards:onlyWithSentence");
    return v === "1";
  });
  const [order, setOrder] = useState(() => localStorage.getItem("flashcards:order") || "shuffled");

  const [queue, setQueue] = useState([]);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loadingUnit, setLoadingUnit] = useState(false);
  const [loadingDaily, setLoadingDaily] = useState(false);
  const [passedIds, setPassedIds] = useState(() => new Set());

  /* Auth */
  useEffect(() => {
    const auth = getAuth();
    return onAuthStateChanged(auth, (u) => setUser(u || null));
  }, []);

  /* 유닛 목록 */
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const u = await listUnits({ max: 500 });
        if (!alive) return;
        setUnits(Array.isArray(u) ? u : []);
      } catch (e) {
        if (!alive) return;
        setUnitsError("유닛 목록을 불러오지 못했습니다.");
      }
    })();
    return () => { alive = false; };
  }, []);

  /* 선택 유닛 로컬 저장 */
  useEffect(() => {
    localStorage.setItem("flashcards:selectedUnits", JSON.stringify(selectedUnitIds));
  }, [selectedUnitIds]);
  useEffect(() => {
    localStorage.setItem("flashcards:includeDaily", includeDaily ? "1" : "0");
  }, [includeDaily]);
  useEffect(() => {
    localStorage.setItem("flashcards:onlyWithSentence", onlyWithSentence ? "1" : "0");
  }, [onlyWithSentence]);
  useEffect(() => {
    localStorage.setItem("flashcards:order", order);
  }, [order]);

  /* 유닛 변경 시 단어 로드 */
  useEffect(() => {
    if (!selectedUnitIds.length) { setUnitWordsAll([]); setPassedIds(new Set()); return; }

    const first = selectedUnitIds[0];
    if (first) navigate(`/flashcards/${first}`, { replace: true });

    let alive = true;
    setLoadingUnit(true);
    setFlipped(false);

    (async () => {
      try {
        const unitsDocs = await Promise.all(selectedUnitIds.map(id => getUnit(String(id))));
        if (!alive) return;

        const mergedIds = Array.from(
          new Set(
            unitsDocs.flatMap(u => Array.isArray(u?.vocabIds) ? u.vocabIds.map(String) : [])
          )
        );
        const raw = mergedIds.length ? await getWordsByIds(mergedIds) : [];
        if (!alive) return;

        const words = raw.map(w => ({ ...normalizeKoPron(w), __source: "UNIT" }));
        setUnitWordsAll(words);

        let passed = new Set();
        if (selectedUnitIds.length === 1 && user?.uid) {
          const s = await getPassedSet(user.uid, String(first));
          passed = s instanceof Set ? s : new Set(Array.from(s ?? []).map(String));
        } else {
          const scope = selectedUnitIds.length === 1
            ? String(first)
            : `mix:${[...selectedUnitIds].sort().join("+")}`;
          const key = `progress:${scope}`;
          const arr = JSON.parse(localStorage.getItem(key) || "[]");
          passed = new Set(arr.map(String));
        }
        if (alive) setPassedIds(passed);
      } catch (e) {
        console.error(e);
        if (alive) setUnitWordsAll([]);
      } finally {
        if (alive) setLoadingUnit(false);
      }
    })();

    return () => { alive = false; };
  }, [selectedUnitIds, user?.uid, navigate]);

  /* 최근 7일 데일리 로드 */
  useEffect(() => {
    let alive = true;
    if (!includeDaily) { setDailyWordsAll([]); return () => {}; }

    setLoadingDaily(true);
    (async () => {
      try {
        const end = new Date();
        const start = new Date(end);
        start.setDate(end.getDate() - 6);
        const dailyDocs = await listDailiesInRange({
          startDate: fmtYMD(start),
          endDate: fmtYMD(end),
          limit: 7
        });
        if (!alive) return;

        const ids = Array.from(
          new Set(dailyDocs.flatMap(d => Array.isArray(d?.wordIds) ? d.wordIds.map(String) : []))
        );
        const raw = ids.length ? await getWordsByIds(ids) : [];
        if (alive) setDailyWordsAll(raw.map(w => ({ ...normalizeKoPron(w), __source: "DAILY" })));
      } catch (e) {
        if (!alive) return;
        setDailyWordsAll([]);
      } finally {
        if (alive) setLoadingDaily(false);
      }
    })();

    return () => { alive = false; };
  }, [includeDaily]);

  /* 단어 합치기 */
  const wordsAll = useMemo(() => {
    const all = includeDaily ? [...unitWordsAll, ...dailyWordsAll] : [...unitWordsAll];
    const seen = new Set();
    const out = [];
    for (const w of all) {
      const k = stableWordKey(w);
      if (!seen.has(k)) {
        seen.add(k);
        out.push(w);
      }
    }
    return out;
  }, [unitWordsAll, dailyWordsAll, includeDaily]);

  const words = useMemo(() => {
    const base = onlyWithSentence
      ? wordsAll.filter(w => (w?.sentence || w?.sentenceKo || w?.sentencePinyin))
      : wordsAll.slice();
    const seed = Number(localStorage.getItem("flashcards:shuffleSeed")) || Date.now();
    if (order === "original") return base;
    const mixed = shuffle(base, seed);
    // 첫 계산 시 시드 저장(세션 내 랜덤 재현)
    if (!localStorage.getItem("flashcards:shuffleSeed")) {
      localStorage.setItem("flashcards:shuffleSeed", String(seed));
    }
    return mixed;
  }, [wordsAll, onlyWithSentence, order]);

  /* 상태 초기화 */
  useEffect(() => {
    setQueue(words.map((_, i) => i));
    setIdx(0);
    setFlipped(false);
  }, [words]);

  const current = words.length ? words[queue[idx]] : null;
  const currentKey = current ? stableWordKey(current) : "";

  const flip = useCallback(() => setFlipped(f => !f), []);
  const next = useCallback(() => {
    setFlipped(false);
    setIdx(i => Math.min(i + 1, words.length - 1));
  }, [words.length]);
  const prev = useCallback(() => {
    setFlipped(false);
    setIdx(i => Math.max(i - 1, 0));
  }, []);

  const good = useCallback(async () => {
    if (!currentKey) return;
    setPassedIds(prev => {
      const n = new Set(prev);
      n.add(currentKey);
      return n;
    });
    try {
      const scope = selectedUnitIds.length === 1
        ? String(selectedUnitIds[0])
        : `mix:${[...selectedUnitIds].sort().join("+")}`;

      if (selectedUnitIds.length === 1 && user?.uid) {
        await markPassed(user.uid, scope, String(currentKey));
      } else {
        const key = `progress:${scope}`;
        const prevArr = JSON.parse(localStorage.getItem(key) || "[]");
        const arr = Array.from(new Set([...prevArr, String(currentKey)]));
        localStorage.setItem(key, JSON.stringify(arr));
      }
    } catch (e) {
      console.error("통과 저장 실패", e);
    }
    next();
  }, [currentKey, next, selectedUnitIds, user?.uid]);

  /* 진행률 계산 */
  const goodCountShown = useMemo(() => {
    const keysShown = new Set(words.map(w => stableWordKey(w)));
    let c = 0;
    passedIds.forEach(k => { if (keysShown.has(k)) c++; });
    return c;
  }, [words, passedIds]);
  const progressPercent = words.length ? (goodCountShown / words.length) * 100 : 0;

  const loading = loadingUnit || loadingDaily;

  /* 키보드 단축키: ← → Space */
  useEffect(() => {
    const onKey = (e) => {
      if (!current) return;
      if (e.code === "ArrowLeft") { e.preventDefault(); prev(); }
      else if (e.code === "ArrowRight") { e.preventDefault(); next(); }
      else if (e.code === "Space") { e.preventDefault(); flip(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current, next, prev, flip]);

  return (
    <Container maxWidth="md" sx={{ py: 3 }}>
      <Stack spacing={3}>
        <Typography variant="h5">Flashcards</Typography>

        {/* 에러 표시 */}
        {unitsError ? <Alert severity="error">{unitsError}</Alert> : null}

        {/* ===== 유닛 선택 + 진행상황 ===== */}
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          justifyContent="space-between"
          alignItems="stretch"
          flexWrap="wrap"
        >
          {/* 유닛 선택 */}
          <FormControl sx={{ width: { xs: "100%", sm: 280 } }}>
            <InputLabel id="unit-multi-label">Unit 선택(복수)</InputLabel>
            <Select
              labelId="unit-multi-label"
              multiple
              value={selectedUnitIds}
              onChange={(e) => {
                const v = typeof e.target.value === "string"
                  ? e.target.value.split(",")
                  : e.target.value;
                setSelectedUnitIds(v.map(String));
              }}
              input={<OutlinedInput label="Unit 선택(복수)" />}
              renderValue={(selected) => selected.map(id => `Unit ${id}`).join(", ")}
              MenuProps={MenuProps}
            >
              {units.map((u) => {
                const id = String(u?.id ?? "");
                return (
                  <MenuItem key={id} value={id}>
                    <Checkbox checked={selectedUnitIds.includes(id)} />
                    <ListItemText primary={`Unit ${id}`} />
                  </MenuItem>
                );
              })}
            </Select>
          </FormControl>

          {/* 진행상황 카드 */}
          <Paper variant="outlined" sx={{ p: 2, flex: 1, minWidth: { xs: "100%", sm: 320 } }}>
            <Stack spacing={1}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="subtitle2">오늘의 학습 진행</Typography>
                <Typography variant="caption" color="text.secondary">
                  통과 {goodCountShown} · 총 {words.length}
                </Typography>
              </Stack>
              <LinearProgress variant="determinate" value={progressPercent} />
              <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 1 }} flexWrap="wrap">
                <FormControlLabel
                  control={
                    <Switch
                      checked={includeDaily}
                      onChange={(e) => setIncludeDaily(e.target.checked)}
                    />
                  }
                  label="7일 데일"
                />
                <Chip label={`UNIT ${unitWordsAll.length}`} size="small" color="primary" />
                <Chip label={`DAILY ${dailyWordsAll.length}`} size="small" />
              </Stack>
            </Stack>
          </Paper>
        </Stack>

        {/* ===== 옵션 ===== */}
        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
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

          {/* 현재 단어 출처 */}
          {current && (
            <Chip
              label={current.__source === "DAILY" ? "DAILY" : "UNIT"}
              size="small"
              variant="outlined"
              sx={{ mb: 1 }}
            />
          )}
        </Stack>

        {loading && <LinearProgress />}

        {/* ===== 카드 표시 ===== */}
        {(!words.length || !current) && !loading && (
          <Alert severity="info">표시할 단어가 없습니다. 유닛을 선택하거나 필터/데일리 옵션을 확인하세요.</Alert>
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
