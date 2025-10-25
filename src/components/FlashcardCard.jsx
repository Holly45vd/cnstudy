// src/components/FlashcardCard.jsx
import React, { useMemo, useCallback } from "react";
import {
  Card,
  CardContent,
  Typography,
  Stack,
  IconButton,
  Chip,
  Box,
  Divider,
} from "@mui/material";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";

/** 중국어 보이스 선택: zh-CN 우선, 그 외 중국어 대체 */
function pickChineseVoice(voices) {
  if (!Array.isArray(voices)) return null;
  const hard = voices.find((v) => (v.lang || "").toLowerCase() === "zh-cn");
  if (hard) return hard;

  const kw = ["chinese", "中文", "普通话", "國語", "国语"];
  const cands = voices.filter((v) => {
    const L = (v.lang || "").toLowerCase();
    const N = (v.name || "").toLowerCase();
    return L.startsWith("zh") || L.includes("cmn") || kw.some((k) => N.includes(k.toLowerCase()));
  });

  // 가중치: 중국 > 대만 > 홍콩/광둥
  const score = (v) => {
    const L = (v.lang || "").toLowerCase();
    if (L.includes("zh-cn") || L.includes("cmn-hans")) return 3;
    if (L.includes("zh-tw") || L.includes("cmn-hant")) return 2;
    if (L.includes("zh-hk") || L.includes("yue")) return 1;
    return 0;
  };
  return cands.sort((a, b) => score(b) - score(a))[0] || null;
}

/** 단어 객체에서 공통 필드 꺼내기 + 한국어 발음 추출 */
function useNormalizedWord(raw) {
  return useMemo(() => {
    const zh = raw?.zh ?? raw?.hanzi ?? raw?.id ?? "";
    const pinyin = raw?.pinyin ?? "";
    const ko = raw?.ko ?? raw?.meaning ?? "";
    const pos = raw?.pos ?? raw?.partOfSpeech ?? "";
    const tags = Array.isArray(raw?.tags) ? raw.tags : [];

    // koPron(한국어 발음) 추출 우선순위:
    // - pronunciation 배열에서 label === zh 인 항목의 ko
    // - pronunciation[0]?.ko
    // - koPron / koPronunciation / pronunciation_ko
    let koPron = "";
    if (Array.isArray(raw?.pronunciation) && raw.pronunciation.length) {
      const exact = raw.pronunciation.find((p) => p?.label === zh && p?.ko);
      koPron = exact?.ko || raw.pronunciation[0]?.ko || "";
    }
    koPron =
      koPron ||
      raw?.koPron ||
      raw?.koPronunciation ||
      raw?.pronunciation_ko ||
      "";

    // 예문(있으면 뒷면에 노출)
    const sentence = raw?.sentence || "";
    const sentencePinyin = raw?.sentencePinyin || "";
    const sentenceKo = raw?.sentenceKo || "";

    return { zh, pinyin, ko, koPron, pos, tags, sentence, sentencePinyin, sentenceKo };
  }, [raw]);
}

/** 안전 재생: 클릭 시 보이스 로드/선택 후 중국어로 말하기 */
function useSpeak() {
  return useCallback(async (text) => {
    if (!text) return;
    const synth = window?.speechSynthesis;
    try {
      if (!synth || !("SpeechSynthesisUtterance" in window)) return;

      // 큐 정리
      synth.cancel();

      // 보이스 강제 로드 유도
      synth.getVoices();
      await new Promise((r) => setTimeout(r, 50));
      const list = synth.getVoices();
      const voice = pickChineseVoice(list);

      const u = new SpeechSynthesisUtterance(text);
      u.lang = "zh-CN";
      u.rate = 1.0;
      u.pitch = 1.0;
      u.volume = 1.0;
      if (voice) u.voice = voice;
      synth.speak(u);
    } catch (e) {
      console.warn("TTS 실패:", e);
    }
  }, []);
}

/**
 * FlashcardCard
 * props:
 *  - word: 단어 객체
 *  - flipped: 앞/뒤 상태 (부모제어)
 *  - onFlip: 카드 클릭 시 호출
 */
export default function FlashcardCard({ word, flipped, onFlip }) {
  const speak = useSpeak();
  const { zh, pinyin, ko, koPron, pos, tags, sentence, sentencePinyin, sentenceKo } =
    useNormalizedWord(word);

  return (
    <Card
      onClick={onFlip}
      elevation={3}
      sx={{
        borderRadius: 3,
        p: 2,
        mb: 2,
        cursor: "pointer",
        userSelect: "none",
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
        "&:hover": { transform: "translateY(-2px)", boxShadow: 6 },
        minHeight: 280,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
      }}
      aria-label={`플래시카드: ${zh}`}
    >
      {!flipped ? (
        /* 앞면: 한자 + 병음 + 한국어 발음 + 재생 버튼 */
        <CardContent sx={{ width: "100%" }}>
          <Stack spacing={1} alignItems="center">
            <Stack direction="row" alignItems="center" spacing={1}>
              <Typography variant="h3" sx={{ fontWeight: 900, letterSpacing: 1 }}>
                {zh}
              </Typography>
              <IconButton
                size="large"
                color="primary"
                onClick={(e) => {
                  e.stopPropagation();
                  speak(zh);
                }}
                aria-label="중국어 발음 듣기"
              >
                <VolumeUpIcon fontSize="inherit" />
              </IconButton>
            </Stack>

            <Typography variant="h6" color="text.secondary">
              {pinyin}
              {koPron ? `  ${koPron}` : ""}
            </Typography>

            {(pos || (tags && tags.length)) && (
              <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                {pos && <Chip size="small" label={pos} />}
                {tags?.slice(0, 4).map((t) => (
                  <Chip key={t} size="small" variant="outlined" label={t} />
                ))}
              </Stack>
            )}

            <Typography variant="body1" sx={{ mt: 1.5 }}>
              (클릭하여 뜻 보기)
            </Typography>
          </Stack>
        </CardContent>
      ) : (
        /* 뒷면: 뜻 + 예문(중/병/한) + 재생 버튼 */
        <CardContent sx={{ width: "100%" }}>
          <Stack spacing={1.25} alignItems="center">
            <Typography variant="h5" sx={{ fontWeight: 800 }}>
              {ko}
            </Typography>

            {(sentence || sentencePinyin || sentenceKo) && (
              <Box
                sx={{
                  width: "100%",
                  maxWidth: 680,
                  bgcolor: "#f9fafb",
                  p: 2,
                  borderRadius: 2,
                  textAlign: "left",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Typography variant="body1" sx={{ fontWeight: 700 }}>
                    {sentence || "예문 없음"}
                  </Typography>
                  {sentence && (
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={() => speak(sentence)}
                      aria-label="예문 듣기"
                    >
                      <VolumeUpIcon fontSize="small" />
                    </IconButton>
                  )}
                </Stack>

                {(sentencePinyin || sentenceKo) && <Divider sx={{ my: 1 }} />}

                {sentencePinyin && (
                  <Typography variant="body2" color="text.secondary">
                    {sentencePinyin}
                  </Typography>
                )}
                {sentenceKo && (
                  <Typography variant="body2" color="text.secondary">
                    {sentenceKo}
                  </Typography>
                )}
              </Box>
            )}

            <Typography variant="body2" color="text.secondary">
              (클릭하여 앞면으로)
            </Typography>
          </Stack>
        </CardContent>
      )}
    </Card>
  );
}
