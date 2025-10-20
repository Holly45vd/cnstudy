import React, { useMemo, useState } from "react";
import { freeTextPinyinToKorean } from "../../lib/pinyinKorean";
import { speakSafe } from "../../lib/ttsHelper";

/* ===== MUI ===== */
import {
  Container,
  Stack,
  Typography,
  TextField,
  Paper,
  Button,
  Box,
  Tooltip,
} from "@mui/material";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import TranslateIcon from "@mui/icons-material/Translate";

export default function PronunciationPage() {
  const [text, setText] = useState("Nǐ hǎo! Wǒ jiào Lǐ Míng.");
  const koPron = useMemo(() => freeTextPinyinToKorean(text || ""), [text]);

  async function speakZh() {
    if (!text?.trim()) return;
    await speakSafe(text, { lang: "zh-CN", rate: 0.95 });
  }
  async function speakKo() {
    if (!koPron?.trim()) return;
    await speakSafe(koPron, { lang: "ko-KR", rate: 1.0 });
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Stack spacing={2}>
        <Typography variant="h5" fontWeight={700}>
          발음 도우미 (병음 → 한글)
        </Typography>

        <TextField
          multiline
          minRows={6}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="병음을 입력하세요. 문장도 가능합니다."
          fullWidth
        />

        <Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            한글 발음 변환
          </Typography>
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              minHeight: 120,
              whiteSpace: "pre-wrap",
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            }}
          >
            {koPron || "출력할 변환 결과가 없습니다."}
          </Paper>
        </Box>

        <Stack direction="row" spacing={1}>
          <Tooltip title="중국어로 듣기">
            <span>
              <Button
                variant="contained"
                startIcon={<VolumeUpIcon />}
                onClick={speakZh}
                disabled={!text?.trim()}
              >
                중국어 ▶
              </Button>
            </span>
          </Tooltip>
          <Tooltip title="한글 발음으로 듣기">
            <span>
              <Button
                variant="outlined"
                startIcon={<TranslateIcon />}
                onClick={speakKo}
                disabled={!koPron?.trim()}
              >
                한글발음 ▶
              </Button>
            </span>
          </Tooltip>
        </Stack>
      </Stack>
    </Container>
  );
}
