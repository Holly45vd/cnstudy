// src/pages/units/sections/SubstitutionSection.jsx
// v3.1: 상단 컨트롤 경량화(속도/재생/상단 듣기/복사포맷/간격/전체복사 제거) + 슬롯 필터 제거 + 선택 한자 가독성↑
import React, {
  useEffect, useMemo, useState, useCallback, useRef,
} from "react";
import { useOutletContext, useParams } from "react-router-dom";
import {
  Typography, Box, IconButton, Button, Divider, Chip, Stack,
  Tooltip, Skeleton, Paper,
} from "@mui/material";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import ReplayIcon from "@mui/icons-material/Replay";
import ShuffleIcon from "@mui/icons-material/Shuffle";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import TuneIcon from "@mui/icons-material/Tune";
import FavoriteIcon from "@mui/icons-material/Favorite";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import SkipNextIcon from "@mui/icons-material/SkipNext";
import SkipPreviousIcon from "@mui/icons-material/SkipPrevious";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import VisibilityIcon from "@mui/icons-material/Visibility";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import { pinyin as pinyinPro } from "pinyin-pro";
import { pinyinArrayToKorean } from "../../../lib/pinyinKorean";
import { useSpeechSynthesisLite } from "../../../hooks/useSpeechSynthesisLite";

/* ---------- 유틸 ---------- */
const replaceAll = (text, search, replacement) => {
  if (typeof text !== "string") return "";
  if (typeof text.replaceAll === "function") return text.replaceAll(search, replacement);
  const escape = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return text.replace(new RegExp(escape(search), "g"), replacement);
};
const normItem = (it = {}) => ({
  hanzi: it.hanzi ?? it.zh ?? "",
  pinyin: it.pinyin ?? it.py ?? "",
  pronunciation: it.pronunciation ?? it.pron ?? "",
  meaning: it.meaning ?? it.ko ?? "",
});
const normalizePattern = (raw) => {
  if (!raw) return null;
  if (raw.slot && Array.isArray(raw.items)) {
    return {
      title: raw.title || raw.pattern || "교체연습",
      pattern: raw.pattern || `{${raw.slot}}`,
      slots: [raw.slot],
      items: { [raw.slot]: raw.items.map(normItem) },
      hint_ko: raw.hint_ko || "",
      pron_pattern: raw.pron_pattern || "",
      pron_dict: raw.pron_dict || [],
      meaning_pattern: raw.meaning_pattern || "",
      meaning_dict: raw.meaning_dict || [],
      meaning: raw.meaning || raw.meaning_ko || raw.ko || raw.translation || "",
      tags: raw.tags || [],
    };
  }
  const slots = Array.isArray(raw.slots) ? raw.slots : [];
  const items = {};
  if (raw.items && typeof raw.items === "object") {
    for (const k of Object.keys(raw.items)) items[k] = (raw.items[k] || []).map(normItem);
  }
  return {
    title: raw.title || raw.pattern || "교체연습",
    pattern: raw.pattern || (slots.length ? slots.map((s) => `{${s}}`).join(" ") : ""),
    slots,
    items,
    hint_ko: raw.hint_ko || "",
    pron_pattern: raw.pron_pattern || "",
    pron_dict: raw.pron_dict || [],
    meaning_pattern: raw.meaning_pattern || "",
    meaning_dict: raw.meaning_dict || [],
    meaning: raw.meaning || raw.meaning_ko || raw.ko || raw.translation || "",
    tags: raw.tags || [],
  };
};
const buildWithField = (patternStr, slots, selected, field, placeholder = "____") => {
  let out = patternStr || "";
  slots.forEach((slot) => {
    const v = selected?.[slot]?.[field]?.toString()?.trim();
    out = replaceAll(out, `{${slot}}`, v && v.length > 0 ? v : placeholder);
  });
  return out;
};
const buildPronByDict = (zh, dict = []) => {
  if (!zh || !Array.isArray(dict) || dict.length === 0) return "";
  let out = zh;
  const sorted = [...dict].sort((a, b) => (b?.hanzi?.length || 0) - (a?.hanzi?.length || 0));
  sorted.forEach((m) => { if (m?.hanzi && m?.pron) out = replaceAll(out, m.hanzi, m.pron); });
  return out.replace(/\s+/g, " ").trim();
};
const buildMeaningByDict = (zh, dict = []) => {
  if (!zh || !Array.isArray(dict) || dict.length === 0) return "";
  let out = zh;
  const sorted = [...dict].sort((a, b) => (b?.hanzi?.length || 0) - (a?.hanzi?.length || 0));
  sorted.forEach((m) => { if (m?.hanzi && m?.ko) out = replaceAll(out, m.hanzi, m.ko); });
  return out.replace(/\s+/g, " ").trim();
};
const makePinyin = (zh) => {
  try {
    const clean = (zh || "").replace(/_+/g, "").trim();
    if (!clean) return "";
    return pinyinPro(clean, { toneType: "mark", type: "array" }).join(" ");
  } catch { return ""; }
};
const makePinyinArrayNoTone = (zh) => {
  try {
    const clean = (zh || "").replace(/_+/g, "").trim();
    if (!clean) return [];
    return pinyinPro(clean, { toneType: "none", type: "array" });
  } catch { return []; }
};

const PREF_KEY = "subs_section_prefs_min_v3_1";
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

/* ---------- 메인 ---------- */
export default function SubstitutionSection() {
  const { id } = useParams();
  const { unit } = useOutletContext();

  const [show, setShow] = useState({ pinyin: true, pron: false, meaning: true });
  const [quizHide, setQuizHide] = useState(false);

  const [selected, setSelected] = useState({});
  const [copied, setCopied] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [cursor, setCursor] = useState(0);

  const recentRef = useRef(new Set());
  const RECENT_MAX = 32;

  const { speak, voices } = useSpeechSynthesisLite();
  const speakingRef = useRef(false);

  // 음성 보이스 웜업
  useEffect(() => {
    const synth = typeof window !== "undefined" ? window.speechSynthesis : null;
    if (!synth) return;
    synth.getVoices();
    let tries = 0;
    const t = setInterval(() => {
      tries += 1;
      synth.getVoices();
      if (tries >= 8) clearInterval(t);
    }, 250);
    return () => clearInterval(t);
  }, []);

  const chineseVoice = useMemo(() => {
    const native = (typeof window !== "undefined" && window.speechSynthesis?.getVoices?.()) || [];
    const list = (native.length ? native : voices) || [];
    const score = (v) => {
      const name = (v.name || "").toLowerCase();
      const lang = (v.lang || "").toLowerCase();
      let s = 0;
      if (lang.startsWith("zh")) s += 5;
      if (lang.includes("cmn")) s += 3;
      if (lang.includes("zh-cn") || lang.includes("cmn-hans")) s += 2;
      if (/chinese|中文|普通话|國語|国语/.test(name)) s += 2;
      if (lang.includes("zh-tw") || lang.includes("cmn-hant")) s += 1;
      return s;
    };
    const sorted = [...list].sort((a, b) => score(b) - score(a));
    return sorted[0] || null;
  }, [voices]);

  // 상태 로드/저장
  useEffect(() => {
    try {
      const raw = localStorage.getItem(PREF_KEY);
      if (!raw) return;
      const p = JSON.parse(raw);
      if (p.show) setShow(p.show);
      if (p.quizHide != null) setQuizHide(!!p.quizHide);
      if (p.favorites) setFavorites(Array.isArray(p.favorites) ? p.favorites : []);
      if (p.selected) setSelected(p.selected);
    } catch {}
  }, []);
  useEffect(() => {
    localStorage.setItem(PREF_KEY, JSON.stringify({ show, quizHide, favorites, selected }));
  }, [show, quizHide, favorites, selected]);

  // 패턴 정규화
  const subs = useMemo(() => {
    const raw = unit?.practice?.substitution || [];
    return raw.map(normalizePattern).filter(Boolean);
  }, [unit]);

  // 랜덤(최근 중복 완화)
  const randPick = (arr) => {
    if (!Array.isArray(arr) || arr.length === 0) return undefined;
    const candidates = arr.filter((x) => x?.hanzi && !recentRef.current.has(x.hanzi));
    const target = candidates.length ? candidates : arr;
    const pick = target[Math.floor(Math.random() * target.length)];
    if (pick?.hanzi) {
      recentRef.current.add(pick.hanzi);
      if (recentRef.current.size > RECENT_MAX) {
        const first = recentRef.current.values().next().value;
        recentRef.current.delete(first);
      }
    }
    return pick;
  };

  // 발화/복사
  const handleSpeak = useCallback((text) => {
    if (!text) return;
    const synth = typeof window !== "undefined" ? window.speechSynthesis : null;
    try {
      if (synth) synth.cancel();
      speakingRef.current = true;
      if (chineseVoice) {
        speak({ text, voice: chineseVoice, rate: 0.95, pitch: 1.0, volume: 1.0, onend: () => (speakingRef.current = false) });
      } else if (synth && "SpeechSynthesisUtterance" in window) {
        const u = new SpeechSynthesisUtterance(text);
        u.lang = "zh-CN"; u.rate = 0.95; u.pitch = 1.0; u.volume = 1.0;
        u.onend = () => (speakingRef.current = false);
        synth.speak(u);
      }
    } catch {
      speakingRef.current = false;
    }
  }, [chineseVoice, speak]);

  const handleCopy = useCallback(async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(text);
      setTimeout(() => setCopied(null), 900);
    } catch {}
  }, []);

  // 선택/랜덤/초기화
  const handleSelect = useCallback((pi, slotKey, item) => {
    setSelected((prev) => ({ ...prev, [pi]: { ...(prev[pi] || {}), [slotKey]: item } }));
  }, []);
  const handleReset = useCallback((pi) => {
    setSelected((prev) => { const next = { ...prev }; delete next[pi]; return next; });
  }, []);
  const handleRandom = useCallback((pi, pattern) => {
    const next = {};
    pattern.slots.forEach((slotKey) => {
      const arr = pattern.items?.[slotKey] || [];
      const pick = randPick(arr);
      if (pick) next[slotKey] = pick;
    });
    setSelected((prev) => ({ ...prev, [pi]: next }));
  }, []);
  const handleRandomAll = useCallback(() => {
    const next = {};
    subs.forEach((p, pi) => {
      const sel = {};
      p.slots.forEach((s) => {
        const arr = p.items?.[s] || [];
        const pick = randPick(arr);
        if (pick) sel[s] = pick;
      });
      next[pi] = sel;
    });
    setSelected(next);
    setCursor(0);
  }, [subs]);

  // 문장 계산
  const builtList = useMemo(() => {
    return subs.map((pattern, pi) => {
      const sel = selected[pi] || {};
      const zh = buildWithField(pattern.pattern, pattern.slots, sel, "hanzi");
      const py = makePinyin(zh);
      const pron = pattern.pron_pattern?.trim()
        ? buildWithField(pattern.pron_pattern, pattern.slots, sel, "pronunciation")
        : pattern.pron_dict?.length
        ? buildPronByDict(zh, pattern.pron_dict)
        : pinyinArrayToKorean(makePinyinArrayNoTone(zh));

      const meaningLine = (() => {
        if (pattern.meaning && String(pattern.meaning).trim()) {
          return /\{[^}]+\}/.test(pattern.meaning)
            ? buildWithField(pattern.meaning, pattern.slots, sel, "meaning", "____").trim()
            : String(pattern.meaning).trim();
        }
        if (pattern.meaning_pattern?.trim()) {
          return buildWithField(pattern.meaning_pattern, pattern.slots, sel, "meaning", "____")
            .replace(/\s+/g, " ")
            .trim();
        }
        if (pattern.meaning_dict?.length) {
          let baseKo = buildMeaningByDict(zh, pattern.meaning_dict);
          pattern.slots.forEach((s) => {
            const m = sel?.[s]?.meaning;
            if (m) baseKo = baseKo.replace("____", m);
          });
          return baseKo || "";
        }
        const joined = pattern.slots.map((s) => sel?.[s]?.meaning).filter(Boolean).join(" / ");
        return joined;
      })();

      return { zh, py, pron, meaningLine, pattern, pi };
    });
  }, [subs, selected]);

  // 즐겨찾기
  const addFav = (entry) => setFavorites((prev) => [{ ...entry, ts: Date.now() }, ...prev].slice(0, 200));
  const exportFav = async () => {
    const lines = favorites.map(({ zh, py, meaningLine }) => [zh, py, meaningLine].filter(Boolean).join(" — "));
    if (!lines.length) return;
    await handleCopy(lines.join("\n"));
  };

  // 단축키: 랜덤 전체/이전/다음/가림토글
  useEffect(() => {
    const onKey = (e) => {
      if (e.target?.tagName?.match(/input|textarea|select/i)) return;
      if (e.key === "r" || e.key === "R") { e.preventDefault(); handleRandomAll(); }
      else if (e.key === "q" || e.key === "Q") { setQuizHide((v) => !v); }
      else if (e.key === "ArrowRight") { setCursor((i) => clamp(i + 1, 0, builtList.length - 1)); }
      else if (e.key === "ArrowLeft") { setCursor((i) => clamp(i - 1, 0, builtList.length - 1)); }
      else if (e.key === "p" || e.key === "P") { setShow((s) => ({ ...s, pinyin: !s.pinyin })); }
      else if (e.key === "k" || e.key === "K") { setShow((s) => ({ ...s, pron: !s.pron })); }
      else if (e.key === "m" || e.key === "M") { setShow((s) => ({ ...s, meaning: !s.meaning })); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleRandomAll, builtList.length]);

  if (!unit) {
    return (
      <Box p={2}>
        <Stack spacing={2}>
          <Skeleton variant="rounded" height={56} />
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} variant="rounded" height={120} />
          ))}
        </Stack>
      </Box>
    );
  }

  const current = builtList[cursor];

  return (
    <Box>
      {/* 헤더(심플) */}
      <Box
        p={2}
        sx={{
          position: "sticky", top: 0, zIndex: 3,
          bgcolor: "background.paper", borderBottom: 1, borderColor: "divider",
          backdropFilter: "saturate(160%) blur(3px)",
        }}
      >
        <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems={{ xs: "stretch", md: "center" }}>
          <Typography variant="h5">교체연습 {id ? `(Unit ${id})` : ""}</Typography>
          <Box sx={{ flexGrow: 1 }} />
          <Stack direction="row" spacing={1} alignItems="center">
            {/* 남겨둘 컨트롤: 랜덤 전체 / 퀴즈 가림 / 이전/다음 */}
            <Tooltip title="모든 패턴에 랜덤 적용 (R)">
              <Button startIcon={<ShuffleIcon />} onClick={handleRandomAll} variant="outlined" size="small">
                랜덤 전체
              </Button>
            </Tooltip>
            <Tooltip title={quizHide ? "퀴즈: 가림 해제 (Q)" : "퀴즈: 보조줄 가림 (Q)"}>
              <Button
                startIcon={quizHide ? <VisibilityIcon /> : <VisibilityOffIcon />}
                onClick={() => setQuizHide((v) => !v)}
                variant="outlined"
                size="small"
              >
                {quizHide ? "보기" : "가림"}
              </Button>
            </Tooltip>
            <Tooltip title="이전(←)">
              <IconButton onClick={() => setCursor((i) => clamp(i - 1, 0, builtList.length - 1))}>
                <SkipPreviousIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="다음(→)">
              <IconButton onClick={() => setCursor((i) => clamp(i + 1, 0, builtList.length - 1))}>
                <SkipNextIcon />
              </IconButton>
            </Tooltip>
            {/* 표기 토글은 유지 */}
            <TuneIcon fontSize="small" />
            <Chip
              size="small"
              label={`병음 ${show.pinyin ? "ON" : "OFF"}`}
              variant={show.pinyin ? "filled" : "outlined"}
              onClick={() => setShow((s) => ({ ...s, pinyin: !s.pinyin }))}
            />
            <Chip
              size="small"
              label={`발음 ${show.pron ? "ON" : "OFF"}`}
              variant={show.pron ? "filled" : "outlined"}
              onClick={() => setShow((s) => ({ ...s, pron: !s.pron }))}
            />
            <Chip
              size="small"
              label={`뜻 ${show.meaning ? "ON" : "OFF"}`}
              variant={show.meaning ? "filled" : "outlined"}
              onClick={() => setShow((s) => ({ ...s, meaning: !s.meaning }))}
            />
          </Stack>
        </Stack>
      </Box>

      {/* 본문 */}
      <Box p={2}>
        {!subs.length ? (
          <Paper sx={{ p: 4, textAlign: "center" }} variant="outlined">
            <Typography color="text.secondary">등록된 교체연습이 없습니다.</Typography>
          </Paper>
        ) : (
          <Stack spacing={2}>
            {builtList.map(({ zh, py, pron, meaningLine, pattern, pi }, i) => {
              const sel = selected[pi] || {};
              const isCurrent = i === cursor;
              return (
                <Paper key={`${pattern.title}-${pi}`} sx={{ p: 2, borderRadius: 2, outline: isCurrent ? "2px solid rgba(25,118,210,0.35)" : "none" }} variant="outlined">
                  {/* 헤더 */}
                  <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="subtitle1">
                        {pattern.title || `패턴 ${pi + 1}`} <Typography component="span" variant="caption" color="text.secondary">({i + 1}/{builtList.length})</Typography>
                      </Typography>
                      {(pattern.tags || []).map((t, ti) => (
                        <Chip key={ti} size="small" label={t} />
                      ))}
                    </Stack>
                    <Stack direction="row" spacing={0.5}>
                      <Tooltip title="현재 문장 즐겨찾기 추가">
                        <IconButton onClick={() => addFav({ zh, py, pron, meaningLine, pi })} aria-label="즐겨찾기">
                          <FavoriteBorderIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="랜덤 선택(이 패턴)">
                        <IconButton onClick={() => handleRandom(pi, pattern)} aria-label="랜덤 선택">
                          <ShuffleIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="초기화">
                        <IconButton onClick={() => handleReset(pi)} aria-label="초기화">
                          <ReplayIcon />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </Stack>

                  {pattern.hint_ko && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      힌트: {pattern.hint_ko}
                    </Typography>
                  )}

                  <Divider sx={{ my: 1 }} />

                  {/* 완성 문장 */}
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.25, flexWrap: "wrap" }}>
                    <Typography
                      sx={{
                        lineHeight: 1.25,
                        fontSize: "clamp(18px, 3.6vw, 26px)",
                        letterSpacing: 0,
                       
                      }}
                    >
                      {zh}
                    </Typography>
                    <Tooltip title={copied === zh ? "복사됨" : "복사"}>
                      <IconButton size="small" onClick={() => handleCopy(zh)} aria-label="복사">
                        <ContentCopyIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    {/* 카드 내부 문장 듣기는 유지 */}
                    <Tooltip title="듣기">
                      <IconButton color="primary" size="small" onClick={() => handleSpeak(zh)} aria-label="중국어 문장 듣기">
                        <VolumeUpIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Chip
                      size="small"
                      color={isCurrent ? "primary" : "default"}
                      label={isCurrent ? "현재" : "이동"}
                      onClick={() => setCursor(i)}
                      variant={isCurrent ? "filled" : "outlined"}
                      sx={{ ml: 0.5 }}
                    />
                  </Stack>

                  {/* 보조 줄(퀴즈 모드면 가림) */}
                  {!quizHide && show.pinyin && !!py && (
                    <Typography variant="body2" sx={{ lineHeight: 1.7 }}>
                      {py}
                    </Typography>
                  )}
                  {!quizHide && show.pron && !!pron && (
                    <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                      {pron}
                    </Typography>
                  )}
                  {!quizHide && show.meaning && !!meaningLine && (
                    <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                      {meaningLine}
                    </Typography>
                  )}

                  {/* 슬롯 선택 (필터 삭제) */}
                  <Divider sx={{ my: 1.25 }} />
                  {pattern.slots.map((slotKey) => {
                    const selForPi = sel;
                    const items = pattern.items?.[slotKey] || [];
                    return (
                      <Box key={slotKey} sx={{ mb: 1 }}>
                        <Typography variant="subtitle2" color="text.secondary" >
                          {slotKey} 선택
                        </Typography>

                        <Stack
                          direction="row"
                          flexWrap="wrap"
                          gap={0.75}
                          role="listbox"
                          aria-label={`${slotKey} 후보`}
                          onKeyDown={(e) => {
                            const chips = e.currentTarget.querySelectorAll('button[role="option"]');
                            if (!chips.length) return;
                            const idx = Array.from(chips).findIndex((el) => el === document.activeElement);
                            if (e.key === "ArrowRight" || e.key === "ArrowDown") {
                              e.preventDefault();
                              const next = chips[Math.min(idx + 1, chips.length - 1)] || chips[0];
                              next.focus();
                            } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
                              e.preventDefault();
                              const prev = chips[Math.max(idx - 1, 0)] || chips[chips.length - 1];
                              prev.focus();
                            } else if (e.key === "Home") {
                              e.preventDefault(); chips[0].focus();
                            } else if (e.key === "End") {
                              e.preventDefault(); chips[chips.length - 1].focus();
                            }
                          }}
                        >
                          {items.map((item, idx) => {
                            const active = selForPi?.[slotKey]?.hanzi === item.hanzi;
                            return (
                              <Chip
                                key={`${slotKey}-${idx}-${item.hanzi}`}
                                variant={active ? "filled" : "outlined"}
                                color={active ? "primary" : "default"}
                                // === 선택 한자 크게(가독성↑) ===
                                sx={{
                                  px: active ? 1.25 : 0.75,
                                  py: active ? 0.75 : 0.25,
                                  borderRadius: 2,
                                  '& .MuiChip-label': {
                                    fontWeight: active ? 600 : 400,
                                    fontSize: active ? "1.125rem" : "0.95rem", // 18px / 15.2px
                                    lineHeight: 1.1,
                                  },
                                }}
                                label={<span>{item.hanzi}</span>}
                                size="medium"
                                onClick={() => handleSelect(pi, slotKey, item)}
                                clickable
                                tabIndex={0}
                                role="option"
                                aria-selected={active}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    handleSelect(pi, slotKey, item);
                                  }
                                }}
                              />
                            );
                          })}
                        </Stack>
                        {selForPi?.[slotKey] && (
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{
                              display: "block",
                              mt: 0.75,
                              
                              // 선택 상세도 살짝 크게
                              fontSize: "0.9rem",
                            }}
                          >
                            {selForPi[slotKey].pinyin}
                            {selForPi[slotKey].pronunciation ? ` · ${selForPi[slotKey].pronunciation}` : ""}
                            {selForPi[slotKey].meaning ? ` · ${selForPi[slotKey].meaning}` : ""}
                          </Typography>
                        )}
                      </Box>
                    );
                  })}
                </Paper>
              );
            })}

            {/* 즐겨찾기 영역 */}
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <FavoriteIcon fontSize="small" color="error" />
                  <Typography variant="subtitle1">즐겨찾기</Typography>
                </Stack>
                <Stack direction="row" spacing={1}>
                  <Tooltip title="즐겨찾기 내보내기(클립보드)">
                    <Button size="small" variant="outlined" startIcon={<FileDownloadIcon />} onClick={async () => {
                      const lines = favorites.map(({ zh, py, meaningLine }) => [zh, py, meaningLine].filter(Boolean).join(" — "));
                      if (lines.length) await navigator.clipboard.writeText(lines.join("\n"));
                    }}>
                      내보내기
                    </Button>
                  </Tooltip>
                </Stack>
              </Stack>
              {favorites.length === 0 ? (
                <Typography variant="body2" color="text.secondary">각 카드의 하트 아이콘으로 추가하세요.</Typography>
              ) : (
                <Stack spacing={0.75}>
                  {favorites.slice(0, 12).map((f, idx) => (
                    <Typography key={idx} variant="body2">
                      {f.zh}
                      {(!quizHide && f.py) ? ` — ${f.py}` : ""}
                      {(!quizHide && f.meaningLine) ? ` — ${f.meaningLine}` : ""}
                    </Typography>
                  ))}
                  {favorites.length > 12 && (
                    <Typography variant="caption" color="text.secondary">…외 {favorites.length - 12}개</Typography>
                  )}
                </Stack>
              )}
            </Paper>
          </Stack>
        )}
      </Box>
    </Box>
  );
}
