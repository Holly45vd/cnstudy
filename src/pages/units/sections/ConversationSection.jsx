// src/pages/units/sections/ConversationSection.jsx
import React, { useMemo, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
/* MUI */
import {
  Stack, Paper, Typography, IconButton, Tooltip, Chip
} from "@mui/material";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import TranslateIcon from "@mui/icons-material/Translate";
import { useSpeechSynthesisLite } from "../../../hooks/useSpeechSynthesisLite";

/** langPrefix에 맞는 보이스 선택: zh 우선순위(중국 표준 > 대만 > 홍콩) */
function usePickVoices() {
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
        (langPrefix === "zh" && (lang.includes("cmn") || lang.includes("yue"))); // 만다린/광둥어 키워드
      const nameMatch = kws.some((k) => name.includes(k.toLowerCase()));
      return langMatch || nameMatch;
    });
    const scoreZh = (L) => {
      if (L.includes("zh-cn") || L.includes("cmn-hans")) return 3;
      if (L.includes("zh-tw") || L.includes("cmn-hant")) return 2;
      if (L.includes("zh-hk") || L.includes("yue")) return 1;
      return 0;
    };
    return (cands.sort((a, b) => {
      const La = (a.lang || "").toLowerCase();
      const Lb = (b.lang || "").toLowerCase();
      if (langPrefix === "zh") return scoreZh(Lb) - scoreZh(La);
      return 0; // ko는 단순 첫 후보
    })[0]) || null;
  }, [voices]);

  const speakZh = useCallback((text, rate = 0.95) => {
    if (!text) return;
    const voice = pickVoice("zh");
    // 보이스가 없을 때는 lang으로 강제
    speak({ text, voice, lang: "zh-CN", rate, pitch: 1, volume: 1 });
  }, [pickVoice, speak]);

  const speakKo = useCallback((text, rate = 1.0) => {
    if (!text) return;
    const voice = pickVoice("ko");
    speak({ text, voice, lang: "ko-KR", rate, pitch: 1, volume: 1 });
  }, [pickVoice, speak]);

  return { speakZh, speakKo };
}

export default function ConversationSection() {
  const { unit } = useOutletContext();
  const conv = unit?.conversation || [];
  const { speakZh, speakKo } = usePickVoices();

  if (conv.length === 0) {
    return <Typography variant="body2" color="text.secondary">대화가 없습니다.</Typography>;
  }

  return (
    <Stack spacing={1.5}>
      {conv.map((c, i) => (
        <Paper key={i} variant="outlined" sx={{ p: 2, display: "flex", gap: 2, alignItems: "flex-start" }}>
          <Chip label={c.speaker || "A"} size="small" sx={{ minWidth: 32, textAlign: "center" }} />
          <Stack sx={{ flex: 1 }}>
            <Typography variant="h6">{c.chinese}</Typography>
            <Typography variant="body2" color="text.secondary">
              {c.pinyin} · {c.pronunciation}
            </Typography>
            <Typography variant="body2">{c.meaning}</Typography>
          </Stack>
          <Stack direction="row" spacing={1}>
            <Tooltip title="중국어로 듣기">
              <span>
                <IconButton size="small" onClick={() => speakZh(c.chinese)}>
                  <VolumeUpIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="한글 발음으로 듣기">
              <span>
                <IconButton size="small" onClick={() => speakKo(c.pronunciation)}>
                  <TranslateIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          </Stack>
        </Paper>
      ))}
    </Stack>
  );
}
