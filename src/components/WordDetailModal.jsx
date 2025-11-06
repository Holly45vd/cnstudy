// src/components/WordDetailModal.jsx
import React, { useMemo, useCallback } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  IconButton, Button, Typography, Stack, Chip, Divider, Box,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import LabelImportantIcon from "@mui/icons-material/LabelImportant";
import TranslateIcon from "@mui/icons-material/Translate";
import RecordVoiceOverIcon from "@mui/icons-material/RecordVoiceOver";
import { useSpeechSynthesisLite } from "../hooks/useSpeechSynthesisLite";
import { pinyin as pinyinPro } from "pinyin-pro";
import { pinyinArrayToKorean, freeTextPinyinToKorean } from "../lib/pinyinKorean";

/** 스키마 혼용 대응 정규화 */
function normalizeWord(raw = {}) {
  const zh = raw.zh ?? raw.hanzi ?? raw.id ?? "";
  const pinyin = raw.pinyin ?? raw.py ?? raw.sentencePinyin ?? "";
  const ko = raw.ko ?? raw.meaning ?? raw.translation ?? "";

  let koPron =
    (Array.isArray(raw.pronunciation) &&
      (raw.pronunciation.find((p) => p?.label === zh && p.ko)?.ko ||
        raw.pronunciation[0]?.ko)) ||
    raw.koPronunciation ||
    raw.koPron ||
    "";

if (!koPron) {
    if (zh) {
      // ✅ 한자 → pinyin 배열 → 한글 발음
      try {
        const arr = pinyinPro(zh, { toneType: "none", type: "array" });
        koPron = pinyinArrayToKorean(arr);
      } catch {}
    } else if (pinyin) {
      // ✅ 이미 pinyin이면 freeText 변환(음절 단위 분할 포함)
      koPron = freeTextPinyinToKorean(pinyin);
    }
  }

  const sentence = raw.sentence ?? raw.example ?? "";
  const sentencePinyin = raw.sentencePinyin ?? raw.examplePinyin ?? "";
  let sentenceKoPronunciation =
    raw.sentenceKoPronunciation ?? raw.sentencePron ?? raw.sentencePronunciation ?? "";
  if (!sentenceKoPronunciation) {
    if (sentence) {
      try {
        const arr = pinyinPro(sentence, { toneType: "none", type: "array" });
        sentenceKoPronunciation = pinyinArrayToKorean(arr);
      } catch {}
    } else if (sentencePinyin) {
      sentenceKoPronunciation = freeTextPinyinToKorean(sentencePinyin);
    }
  }

  const sentenceKo = raw.sentenceKo ?? raw.exampleKo ?? "";
  const pos = raw.pos ?? raw.partOfSpeech ?? "";
  const tags = Array.isArray(raw.tags)
    ? raw.tags
    : typeof raw.tags === "string"
      ? raw.tags.split(",").map(s=>s.trim()).filter(Boolean)
      : [];

  const pronunciation =
    Array.isArray(raw.pronunciation)
      ? raw.pronunciation
      : Array.isArray(raw.pronunciation_items)
        ? raw.pronunciation_items
        : [];
  const extensions = Array.isArray(raw.extensions) ? raw.extensions : [];
  const grammar = Array.isArray(raw.grammar) ? raw.grammar : [];
  const keyPoints = Array.isArray(raw.keyPoints) ? raw.keyPoints : [];

  return {
    ...raw,
    zh, pinyin, ko, koPron,
    sentence, sentencePinyin, sentenceKo, sentenceKoPronunciation,
    pos, tags, pronunciation, extensions, grammar, keyPoints,
  };
}

/** 안전 발화 */
function useSpeak() {
  const { speak, voices } = useSpeechSynthesisLite();

  const pickVoice = useCallback((langPrefix) => {
    const arr = Array.isArray(voices) ? voices : [];
    const kwMap = {
      zh: ["chinese", "中文", "普通话", "國語", "国语", "粤語", "粵語"],
      ko: ["korean", "한국어", "조선말"],
    };
    const kws = kwMap[langPrefix] || [];
    const cands = arr.filter((v) => {
      const lang = (v.lang || "").toLowerCase();
      const name = (v.name || "").toLowerCase();
      const langMatch =
        lang.startsWith(langPrefix) ||
        (langPrefix === "zh" && (lang.includes("cmn") || lang.includes("yue")));
      const nameMatch = kws.some((k) => name.includes(k.toLowerCase()));
      return langMatch || nameMatch;
    });
    const scoreZh = (L) => {
      if (L.includes("zh-cn") || L.includes("cmn-hans")) return 3;
      if (L.includes("zh-tw") || L.includes("cmn-hant")) return 2;
      if (L.includes("zh-hk") || L.includes("yue")) return 1;
      return 0;
    };
    return (
      cands.sort((a, b) => {
        const La = (a.lang || "").toLowerCase();
        const Lb = (b.lang || "").toLowerCase();
        if (langPrefix === "zh") return scoreZh(Lb) - scoreZh(La);
        return 0;
      })[0] || null
    );
  }, [voices]);

  const speakZh = useCallback(
    (text, rate = 0.95) => {
      if (!text) return;
      const voice = pickVoice("zh");
      speak({ text, voice, rate, pitch: 1, volume: 1 });
    },
    [pickVoice, speak]
  );

  const speakKo = useCallback(
    (text, rate = 1.0) => {
      if (!text) return;
      const voice = pickVoice("ko");
      speak({ text, voice, rate, pitch: 1, volume: 1 });
    },
    [pickVoice, speak]
  );

  return { speakZh, speakKo };
}

/** 안전 텍스트 변환 (객체/배열 방어) */
function asText(v) {
  if (v == null) return "";
  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") return String(v);

  // 문법 객체 패턴 케이스: {term, desc, structure}
  if (typeof v === "object") {
    if (v.term || v.title || v.rule) return String(v.term ?? v.title ?? v.rule);
    if (v.text) return String(v.text);
    // 기타 객체는 JSON 축약
    try { return JSON.stringify(v); } catch { return "[object]"; }
  }
  if (Array.isArray(v)) return v.map(asText).join(", ");
  return String(v);
}

/** 문법 아이템 렌더링 (문자/객체 모두 지원) */
function GrammarItem({ item }) {
  if (item == null) return null;
  if (typeof item === "string") {
    return <Typography variant="body2">{item}</Typography>;
  }
  if (typeof item === "object") {
    const term = asText(item.term ?? item.title ?? item.rule ?? "");
    const desc = asText(item.desc ?? item.description ?? "");
    const structure = item.structure;

    return (
      <Box sx={{ mb: 1 }}>
        {term && <Typography variant="body2">{term}</Typography>}
        {desc && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
            {desc}
          </Typography>
        )}
        {structure && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: "inline-block", mt: 0.5, px: 0.75, py: 0.25, bgcolor: "action.hover", borderRadius: 1 }}
          >
            {asText(structure)}
          </Typography>
        )}
      </Box>
    );
  }
  return <Typography variant="body2">{asText(item)}</Typography>;
}

/** 키포인트 아이템 렌더 */
function KeyPointItem({ item }) {
  if (item == null) return null;
  if (typeof item === "string") return <li><Typography variant="body2">{item}</Typography></li>;
  if (typeof item === "object") {
    const text = asText(item.text ?? item.title ?? item.term ?? item.rule ?? item.desc ?? "");
    return <li><Typography variant="body2">{text}</Typography></li>;
  }
  return <li><Typography variant="body2">{asText(item)}</Typography></li>;
}

export default function WordDetailModal({ open, onClose, word }) {
  const data = useMemo(() => (word ? normalizeWord(word) : null), [word]);
  const { speakZh, speakKo } = useSpeak();

  if (!data) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>
          단어 정보
          <IconButton onClick={onClose} sx={{ position: "absolute", right: 8, top: 8 }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Typography color="text.secondary">선택된 단어가 없습니다.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} variant="contained">닫기</Button>
        </DialogActions>
      </Dialog>
    );
  }

  const {
    zh, pinyin, ko, koPron,
    sentence, sentencePinyin, sentenceKo, sentenceKoPronunciation,
    pos, tags, pronunciation, extensions, grammar, keyPoints,
  } = data;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ pr: 7 }}>
        단어 상세
        <IconButton onClick={onClose} sx={{ position: "absolute", right: 8, top: 8 }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        {/* 헤더: 한자 / 병음 / 뜻 */}
        <Stack spacing={1.2}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography sx={{ fontSize: "clamp(24px, 4.2vw, 36px)" }}>
              {zh}
            </Typography>
            <IconButton color="primary" onClick={() => speakZh(zh)} aria-label="중국어 발음 듣기">
              <VolumeUpIcon />
            </IconButton>
          </Stack>

          {!!pinyin && (
            <Typography variant="body1" color="text.secondary">
              <TranslateIcon fontSize="small" style={{ verticalAlign: "text-bottom" }} /> {pinyin}
            </Typography>
          )}

          {!!ko && (
            <Typography variant="body1">
              <LabelImportantIcon fontSize="small" style={{ verticalAlign: "text-bottom" }} /> {ko}
            </Typography>
          )}

          {!!koPron && (
            <Typography variant="body2" color="text.secondary">
              <RecordVoiceOverIcon fontSize="small" style={{ verticalAlign: "text-bottom" }} /> {koPron}
              <IconButton size="small" onClick={() => speakKo(koPron)} sx={{ ml: 0.5 }}>
                <VolumeUpIcon fontSize="small" />
              </IconButton>
            </Typography>
          )}

          {(pos || (tags && tags.length)) && (
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
              {!!pos && <Chip size="small" label={pos} />}
              {(tags || []).map((t, i) => <Chip key={`${t}-${i}`} size="small" label={asText(t)} variant="outlined" />)}
            </Stack>
          )}
        </Stack>

        {/* 발음 메모 */}
        {Array.isArray(pronunciation) && pronunciation.length > 0 && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle1" gutterBottom>발음 메모</Typography>
            <Stack spacing={0.75}>
              {pronunciation.map((p, i) => (
                <Typography key={i} variant="body2" color="text.secondary">
                  {p?.label ? `${asText(p.label)}: ` : ""}
                  {asText(p?.ko ?? p?.note ?? p?.text)}
                </Typography>
              ))}
            </Stack>
          </>
        )}

        {/* 예문 */}
        {(sentence || sentencePinyin || sentenceKo || sentenceKoPronunciation) && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle1" gutterBottom>예문</Typography>
            {sentence && (
              <Stack direction="row" alignItems="center" spacing={1}>
                <Typography>{sentence}</Typography>
                <IconButton size="small" color="primary" onClick={() => speakZh(sentence)}>
                  <VolumeUpIcon fontSize="small" />
                </IconButton>
              </Stack>
            )}
            {!!sentencePinyin && (
              <Typography variant="body2" color="text.secondary">{sentencePinyin}</Typography>
            )}
            {!!sentenceKo && (
              <Typography variant="body2">{sentenceKo}</Typography>
            )}
            {!!sentenceKoPronunciation && (
              <Typography variant="body2" color="text.secondary">
                {sentenceKoPronunciation}
                <IconButton size="small" onClick={() => speakKo(sentenceKoPronunciation)} sx={{ ml: 0.5 }}>
                  <VolumeUpIcon fontSize="small" />
                </IconButton>
              </Typography>
            )}
          </>
        )}

        {/* 확장 표현 */}
        {Array.isArray(extensions) && extensions.length > 0 && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle1" gutterBottom>확장 표현</Typography>
            <Stack spacing={1.0}>
              {extensions.map((e, i) => (
                <Box key={i}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Typography>{asText(e.zh ?? e.hanzi ?? e.term ?? "")}</Typography>
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={() => speakZh(asText(e.zh ?? e.hanzi ?? e.term ?? ""))}
                    >
                      <VolumeUpIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                  {!!e.pinyin && (
                    <Typography variant="body2" color="text.secondary">{asText(e.pinyin)}</Typography>
                  )}
                  {!!e.pron && (
                    <Typography variant="body2" color="text.secondary">
                      {asText(e.pron)}
                      <IconButton size="small" onClick={() => speakKo(asText(e.pron))} sx={{ ml: 0.5 }}>
                        <VolumeUpIcon fontSize="small" />
                      </IconButton>
                    </Typography>
                  )}
                  {!!e.ko && (
                    <Typography variant="body2">{asText(e.ko)}</Typography>
                  )}
                  {i < extensions.length - 1 && <Divider sx={{ mt: 1, mb: 1 }} />}
                </Box>
              ))}
            </Stack>
          </>
        )}

        {/* 핵심 포인트 / 문법 */}
        {(Array.isArray(keyPoints) && keyPoints.length > 0) || (Array.isArray(grammar) && grammar.length > 0) ? (
          <>
            <Divider sx={{ my: 2 }} />
            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              {Array.isArray(keyPoints) && keyPoints.length > 0 && (
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle1" gutterBottom>핵심 포인트</Typography>
                  <ul style={{ margin: 0, paddingInlineStart: 18 }}>
                    {keyPoints.map((k, i) => <KeyPointItem key={i} item={k} />)}
                  </ul>
                </Box>
              )}
              {Array.isArray(grammar) && grammar.length > 0 && (
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle1" gutterBottom>문법</Typography>
                  <div>
                    {grammar.map((g, i) => <GrammarItem key={i} item={g} />)}
                  </div>
                </Box>
              )}
            </Stack>
          </>
        ) : null}
      </DialogContent>

     
    </Dialog>
  );
}
