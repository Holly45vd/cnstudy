// src/pages/units/sections/SubstitutionSection.jsx
// 리스트 전용 v2.0 (한자 크기↓, 볼드 제거, 담백 UI) + react-speech-kit 제거 버전
import React, {
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
} from "react";
import { useOutletContext, useParams } from "react-router-dom";
import {
  Typography,
  Box,
  IconButton,
  Button,
  Divider,
  Chip,
  Stack,
  Tooltip,
  Skeleton,
  Paper,
} from "@mui/material";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import ReplayIcon from "@mui/icons-material/Replay";
import ShuffleIcon from "@mui/icons-material/Shuffle";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import TuneIcon from "@mui/icons-material/Tune";
import { pinyin as pinyinPro } from "pinyin-pro";
import { pinyinArrayToKorean } from "../../../lib/pinyinKorean";
import { useSpeechSynthesisLite } from "../../../hooks/useSpeechSynthesisLite";

/** ---------- 유틸 ---------- */
const replaceAll = (text, search, replacement) => {
  if (typeof text !== "string") return "";
  if (typeof text.replaceAll === "function")
    return text.replaceAll(search, replacement);
  const escapeForRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(escapeForRegex(search), "g");
  return text.replace(re, replacement);
};

// item 키 정규화
const normItem = (it = {}) => ({
  hanzi: it.hanzi ?? it.zh ?? "",
  pinyin: it.pinyin ?? it.py ?? "",
  pronunciation: it.pronunciation ?? it.pron ?? "",
  meaning: it.meaning ?? it.ko ?? "",
});

// 패턴 구조 정규화
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
      // 패턴 자체의 한국어 문장(치환 가능)
      meaning: raw.meaning || raw.meaning_ko || raw.ko || raw.translation || "",
      tags: raw.tags || [],
    };
  }
  const slots = Array.isArray(raw.slots) ? raw.slots : [];
  const items = {};
  if (raw.items && typeof raw.items === "object") {
    for (const k of Object.keys(raw.items))
      items[k] = (raw.items[k] || []).map(normItem);
  }
  return {
    title: raw.title || raw.pattern || "교체연습",
    pattern:
      raw.pattern ||
      (slots.length ? slots.map((s) => `{${s}}`).join(" ") : ""),
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

// 슬롯 치환
const buildWithField = (
  patternStr,
  slots,
  selected,
  field,
  placeholder = "____"
) => {
  let out = patternStr || "";
  slots.forEach((slot) => {
    const v = selected?.[slot]?.[field]?.toString()?.trim();
    out = replaceAll(out, `{${slot}}`, v && v.length > 0 ? v : placeholder);
  });
  return out;
};

// 발음 사전 치환
const buildPronByDict = (zh, pronDict = []) => {
  if (!zh || !Array.isArray(pronDict) || pronDict.length === 0) return "";
  let out = zh;
  const dictSorted = [...pronDict].sort(
    (a, b) => (b?.hanzi?.length || 0) - (a?.hanzi?.length || 0)
  );
  dictSorted.forEach((m) => {
    if (!m?.hanzi || !m?.pron) return;
    out = replaceAll(out, m.hanzi, m.pron);
  });
  return out.replace(/\s+/g, " ").trim();
};

// 의미 사전 치환
const buildMeaningByDict = (zh, meaningDict = []) => {
  if (!zh || !Array.isArray(meaningDict) || meaningDict.length === 0) return "";
  let out = zh;
  const dictSorted = [...meaningDict].sort(
    (a, b) => (b?.hanzi?.length || 0) - (a?.hanzi?.length || 0)
  );
  dictSorted.forEach((m) => {
    if (!m?.hanzi || !m?.ko) return;
    out = replaceAll(out, m.hanzi, m.ko);
  });
  return out.replace(/\s+/g, " ").trim();
};

const PREF_KEY = "subs_section_prefs_min_v2";

export default function SubstitutionSection() {
  const { id } = useParams();
  const { unit } = useOutletContext(); // 상위에서 unit 제공
  const [selected, setSelected] = useState({});
  const [copied, setCopied] = useState(null);

  // 표시 토글 (기본: 담백)
  const [show, setShow] = useState({
    pinyin: true,
    pron: false,
    meaning: true,
  });

  // speech (react-speech-kit 대체)
  const { speak, voices } = useSpeechSynthesisLite();
  const speakingRef = useRef(false);

  // 보이스 웜업 + 중국어 보이스 선택
  useEffect(() => {
    const synth = window?.speechSynthesis;
    if (!synth) return;
    // 비동기 로드 대비
    synth.getVoices();
    let tries = 0;
    const t = setInterval(() => {
      tries += 1;
      const v = synth.getVoices();
      if (v && v.length) clearInterval(t);
      if (tries >= 8) clearInterval(t);
    }, 250);
    return () => clearInterval(t);
  }, []);

  const pickChineseVoice = useCallback((list) => {
    const arr = Array.isArray(list) ? list : [];
    const score = (v) => {
      const name = (v.name || "").toLowerCase();
      const lang = (v.lang || "").toLowerCase();
      let s = 0;
      if (lang.startsWith("zh")) s += 5;
      if (lang.includes("cmn")) s += 3;
      if (lang.includes("zh-cn") || lang.includes("cmn-hans")) s += 2;
      if (
        name.includes("chinese") ||
        name.includes("中文") ||
        name.includes("普通话") ||
        name.includes("國語") ||
        name.includes("国语")
      )
        s += 2;
      if (lang.includes("zh-tw") || lang.includes("cmn-hant")) s += 1;
      return s;
    };
    return arr.sort((a, b) => score(b) - score(a))[0] || null;
  }, []);

  const chineseVoice = useMemo(() => {
    const native = window?.speechSynthesis?.getVoices?.() || [];
    const list = (native.length ? native : voices) || [];
    return (
      list.find((v) => v.lang === "zh-CN") || pickChineseVoice(list) || null
    );
  }, [voices, pickChineseVoice]);

  // prefs 로드/저장
  useEffect(() => {
    try {
      const raw = localStorage.getItem(PREF_KEY);
      if (raw) {
        const p = JSON.parse(raw);
        if (p.show) setShow(p.show);
      }
    } catch {}
  }, []);
  useEffect(() => {
    localStorage.setItem(PREF_KEY, JSON.stringify({ show }));
  }, [show]);

  const subs = useMemo(() => {
    const raw = unit?.practice?.substitution || [];
    return raw.map(normalizePattern).filter(Boolean);
  }, [unit]);

  // 병음
  const makePinyin = (zh) => {
    try {
      const clean = (zh || "").replace(/_+/g, "").trim();
      if (!clean) return "";
      return pinyinPro(clean, { toneType: "mark", type: "array" }).join(" ");
    } catch {
      return "";
    }
  };
  const makePinyinArrayNoTone = (zh) => {
    try {
      const clean = (zh || "").replace(/_+/g, "").trim();
      if (!clean) return [];
      return pinyinPro(clean, { toneType: "none", type: "array" });
    } catch {
      return [];
    }
  };

  // 발화/복사
  const handleSpeak = useCallback(
    (text) => {
      if (!text) return;
      const synth = window?.speechSynthesis;
      try {
        if (synth) synth.cancel();
        speakingRef.current = true;
        if (chineseVoice) {
          speak({
            text,
            voice: chineseVoice,
            rate: 0.95,
            pitch: 1.0,
            volume: 1.0,
            onend: () => (speakingRef.current = false),
          });
        } else if (synth && "SpeechSynthesisUtterance" in window) {
          const u = new SpeechSynthesisUtterance(text);
          u.lang = "zh-CN";
          u.rate = 0.95;
          u.pitch = 1.0;
          u.volume = 1.0;
          u.onend = () => (speakingRef.current = false);
          synth.speak(u);
        }
      } catch {
        speakingRef.current = false;
      }
    },
    [chineseVoice, speak]
  );

  const handleCopy = useCallback(async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(text);
      setTimeout(() => setCopied(null), 1200);
    } catch {}
  }, []);

  // 선택/랜덤/초기화
  const handleSelect = useCallback((pi, slotKey, item) => {
    setSelected((prev) => ({
      ...prev,
      [pi]: { ...(prev[pi] || {}), [slotKey]: item },
    }));
  }, []);
  const handleReset = useCallback((pi) => {
    setSelected((prev) => {
      const next = { ...prev };
      delete next[pi];
      return next;
    });
  }, []);
  const randPick = (arr) => {
    if (!Array.isArray(arr) || arr.length === 0) return undefined;
    if (window?.crypto?.getRandomValues) {
      const buf = new Uint32Array(1);
      window.crypto.getRandomValues(buf);
      return arr[buf[0] % arr.length];
    }
    return arr[Math.floor(Math.random() * arr.length)];
  };
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
  }, [subs]);

  // 로딩/빈 데이터 처리
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

  return (
    <Box>
      {/* 헤더: 담백 + 볼드 제거 */}
      <Box
        p={2}
        sx={{
          position: "sticky",
          top: 0,
          zIndex: 2,
          bgcolor: "background.paper",
          borderBottom: 1,
          borderColor: "divider",
          backdropFilter: "saturate(160%) blur(3px)",
        }}
      >
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={1.5}
          alignItems={{ xs: "stretch", md: "center" }}
        >
          <Typography variant="h5">
            교체연습 {id ? `(Unit ${id})` : ""}
          </Typography>
          <Box sx={{ flexGrow: 1 }} />
          <Tooltip title="모든 패턴에 랜덤 적용">
            <Button
              startIcon={<ShuffleIcon />}
              onClick={handleRandomAll}
              variant="outlined"
              size="small"
            >
              랜덤 전체
            </Button>
          </Tooltip>
        </Stack>
        <Stack direction="row" spacing={1} alignItems="center" mt={1}>
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
      </Box>

      {/* 본문: 리스트 뷰 */}
      <Box p={2}>
        {!subs.length ? (
          <Paper sx={{ p: 4, textAlign: "center" }} variant="outlined">
            <Typography color="text.secondary">
              등록된 교체연습이 없습니다.
            </Typography>
          </Paper>
        ) : (
          <Stack spacing={2}>
            {subs.map((pattern, pi) => {
              const sel = selected[pi] || {};
              const zh = buildWithField(
                pattern.pattern,
                pattern.slots,
                sel,
                "hanzi"
              );
              const py = makePinyin(zh);
              const pron =
                pattern.pron_pattern && pattern.pron_pattern.trim().length > 0
                  ? buildWithField(
                      pattern.pron_pattern,
                      pattern.slots,
                      sel,
                      "pronunciation"
                    )
                  : pattern.pron_dict && pattern.pron_dict.length > 0
                  ? buildPronByDict(zh, pattern.pron_dict)
                  : pinyinArrayToKorean(makePinyinArrayNoTone(zh));

              // 한국어 라인
              const meaningLine = (() => {
                if (pattern.meaning && String(pattern.meaning).trim()) {
                  const hasSlots = /\{[^}]+\}/.test(pattern.meaning);
                  return hasSlots
                    ? buildWithField(
                        pattern.meaning,
                        pattern.slots,
                        sel,
                        "meaning",
                        "____"
                      ).trim()
                    : String(pattern.meaning).trim();
                }
                if (
                  pattern.meaning_pattern &&
                  pattern.meaning_pattern.trim()
                ) {
                  return buildWithField(
                    pattern.meaning_pattern,
                    pattern.slots,
                    sel,
                    "meaning",
                    "____"
                  )
                    .replace(/\s+/g, " ")
                    .trim();
                }
                if (pattern.meaning_dict && pattern.meaning_dict.length > 0) {
                  let baseKo = buildMeaningByDict(zh, pattern.meaning_dict);
                  pattern.slots.forEach((s) => {
                    const m = sel?.[s]?.meaning;
                    if (m) baseKo = baseKo.replace("____", m);
                  });
                  return baseKo || "";
                }
                const joined = pattern.slots
                  .map((s) => sel?.[s]?.meaning)
                  .filter(Boolean)
                  .join(" / ");
                return joined;
              })();

              return (
                <Paper
                  key={`${pattern.title}-${pi}`}
                  sx={{ p: 2, borderRadius: 2 }}
                  variant="outlined"
                >
                  {/* 헤더 */}
                  <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                    spacing={1}
                  >
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="subtitle1">
                        {pattern.title || `패턴 ${pi + 1}`}
                      </Typography>
                      {(pattern.tags || []).map((t, i) => (
                        <Chip key={i} size="small" label={t} />
                      ))}
                    </Stack>
                    <Stack direction="row" spacing={0.5}>
                      <Tooltip title="랜덤 선택">
                        <IconButton
                          onClick={() => handleRandom(pi, pattern)}
                          aria-label="랜덤 선택"
                        >
                          <ShuffleIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="초기화">
                        <IconButton
                          onClick={() => handleReset(pi)}
                          aria-label="초기화"
                        >
                          <ReplayIcon />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </Stack>

                  {pattern.hint_ko && (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mt: 0.5 }}
                    >
                      힌트: {pattern.hint_ko}
                    </Typography>
                  )}

                  <Divider sx={{ my: 1 }} />

                  {/* 완성 문장 (한자: 크기↓, 굵기 400) */}
                  <Stack
                    direction="row"
                    alignItems="center"
                    spacing={1}
                    sx={{ mb: 0.25, flexWrap: "wrap" }}
                  >
                    <Typography
                      sx={{
                        lineHeight: 1.25,
                        fontWeight: 400, // 볼드 제거
                        fontSize: "clamp(18px, 3.6vw, 26px)", // 한자 크기 축소
                        letterSpacing: 0,
                      }}
                    >
                      {zh}
                    </Typography>
                    <Tooltip title={copied === zh ? "복사됨" : "복사"}>
                      <IconButton
                        size="small"
                        onClick={() => handleCopy(zh)}
                        aria-label="복사"
                      >
                        <ContentCopyIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="듣기">
                      <IconButton
                        color="primary"
                        size="small"
                        onClick={() => handleSpeak(zh)}
                        aria-label="중국어 문장 듣기"
                      >
                        <VolumeUpIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>

                  {/* 보조 줄 */}
                  {show.pinyin && !!py && (
                    <Typography
                      variant="body2"
                      sx={{ lineHeight: 1.7, fontWeight: 400 }}
                    >
                      {py}
                    </Typography>
                  )}
                  {show.pron && !!pron && (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ lineHeight: 1.7, fontWeight: 400 }}
                    >
                      {pron}
                    </Typography>
                  )}
                  {show.meaning && !!meaningLine && (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ lineHeight: 1.7, fontWeight: 400 }}
                    >
                      {meaningLine}
                    </Typography>
                  )}

                  {/* 슬롯 선택 */}
                  <Divider sx={{ my: 1.25 }} />
                  {pattern.slots.map((slotKey) => {
                    const selForPi = selected[pi] || {};
                    return (
                      <Box key={slotKey} sx={{ mb: 1.0 }}>
                        <Typography
                          variant="subtitle2"
                          color="text.secondary"
                          gutterBottom
                          sx={{ fontWeight: 400 }}
                        >
                          {slotKey} 선택
                        </Typography>
                        <Stack
                          direction="row"
                          flexWrap="wrap"
                          gap={0.75}
                          role="listbox"
                          aria-label={`${slotKey} 후보`}
                        >
                          {(pattern.items?.[slotKey] || []).map((item, idx) => {
                            const active =
                              selForPi?.[slotKey]?.hanzi === item.hanzi;
                            return (
                              <Chip
                                key={`${slotKey}-${idx}-${item.hanzi}`}
                                variant={active ? "filled" : "outlined"}
                                color={active ? "primary" : "default"}
                                label={
                                  <span style={{ fontWeight: 400 }}>
                                    {item.hanzi}
                                  </span>
                                }
                                size="small"
                                onClick={() =>
                                  handleSelect(pi, slotKey, item)
                                }
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
                            sx={{ display: "block", mt: 0.5, fontWeight: 400 }}
                          >
                            {selForPi[slotKey].pinyin}
                            {selForPi[slotKey].pronunciation
                              ? ` · ${selForPi[slotKey].pronunciation}`
                              : ""}
                            {selForPi[slotKey].meaning
                              ? ` · ${selForPi[slotKey].meaning}`
                              : ""}
                          </Typography>
                        )}
                      </Box>
                    );
                  })}
                </Paper>
              );
            })}
          </Stack>
        )}
      </Box>
    </Box>
  );
}
