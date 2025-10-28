import React, { useMemo, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import {
  Stack,
  Paper,
  Typography,
  IconButton,
  Tooltip,
  Chip,
  Box,
  Card,
  CardContent,
  useTheme,
} from "@mui/material";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import TranslateIcon from "@mui/icons-material/Translate";
import { useSpeechSynthesisLite } from "../../../hooks/useSpeechSynthesisLite";

/* ===== 보이스 선택 훅 ===== */
function usePickVoices() {
  const { speak, voices } = useSpeechSynthesisLite();

  const pickVoice = useCallback(
    (langPrefix) => {
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
          (langPrefix === "zh" &&
            (lang.includes("cmn") || lang.includes("yue")));
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
    },
    [voices]
  );

  const speakZh = useCallback(
    (text, rate = 0.95) => {
      if (!text) return;
      const voice = pickVoice("zh");
      speak({ text, voice, lang: "zh-CN", rate, pitch: 1, volume: 1 });
    },
    [pickVoice, speak]
  );

  const speakKo = useCallback(
    (text, rate = 1.0) => {
      if (!text) return;
      const voice = pickVoice("ko");
      speak({ text, voice, lang: "ko-KR", rate, pitch: 1, volume: 1 });
    },
    [pickVoice, speak]
  );

  return { speakZh, speakKo };
}

/* ====== 메인 섹션 ====== */
export default function ConversationSection() {
  const theme = useTheme();
  const { unit } = useOutletContext();
  const conv = unit?.conversation || [];
  const { speakZh, speakKo } = usePickVoices();

  if (conv.length === 0)
    return (
      <Typography variant="body2" color="text.secondary">
        대화가 없습니다.
      </Typography>
    );

  return (
    <Stack spacing={2}>
      {conv.map((c, i) => {
        const isLeft = (c.speaker || "").toUpperCase() === "A";
        return (
          <Box
            key={i}
            sx={{
              display: "flex",
              justifyContent: isLeft ? "flex-start" : "flex-end",
            }}
          >
            <Card
              variant="outlined"
              sx={{
                maxWidth: "85%",
                bgcolor: isLeft
                  ? theme.palette.background.paper
                  : theme.palette.action.hover,
                borderRadius: 3,
                boxShadow: 0,
                px: 2,
                py: 1.5,
              }}
            >
              <CardContent sx={{ p: 0 }}>
                <Stack spacing={0.5}>
                  <Stack
                    direction="row"
                    alignItems="center"
                    spacing={1}
                    sx={{ mb: 0.5 }}
                  >
                    <Chip
                      label={c.speaker || (isLeft ? "A" : "B")}
                      size="small"
                      color={isLeft ? "default" : "primary"}
                      variant={isLeft ? "outlined" : "filled"}
                      
                    />
                    <Typography
                      variant="h6"
                      sx={{
                        fontFamily:
                          '"WDXL Lubrifont SC","Noto Sans SC","sans-serif"',
                        fontSize: "1.25rem",
                      }}
                    >
                      {c.chinese}
                    </Typography>
                  </Stack>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ fontFamily: "Noto Sans SC" }}
                  >
                    {c.pinyin}
                    {c.pronunciation && ` · ${c.pronunciation}`}
                  </Typography>
                  <Typography variant="body2">{c.meaning}</Typography>
                  <Stack direction="row" spacing={0.5} sx={{ mt: 0.5 }}>
                    <Tooltip title="중국어로 듣기">
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => speakZh(c.chinese)}
                      >
                        <VolumeUpIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="한글 발음으로 듣기">
                      <IconButton
                        size="small"
                        color="secondary"
                        onClick={() => speakKo(c.pronunciation)}
                      >
                        <TranslateIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          </Box>
        );
      })}
    </Stack>
  );
}
