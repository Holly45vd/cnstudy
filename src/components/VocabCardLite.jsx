// src/components/VocabCardLite.jsx
import React, { useMemo, memo, useCallback } from "react";
import {
  Card,
  CardActionArea,
  CardContent,
  Typography,
  Box,
} from "@mui/material";
import { pinyin as pinyinPro } from "pinyin-pro";
import { pinyinArrayToKorean, freeTextPinyinToKorean } from "../lib/pinyinKorean";

/**
 * 초경량 단어 카드 (+ 한국어 발음 표시)
 * - props.word 또는 직접 props(zh/pinyin/ko) 모두 지원
 * - onClick이 있으면 전체 카드가 클릭 가능 (onClick(rawWord) 호출)
 * - showPron: 한국어 발음 줄 표시 여부 (기본 true)
 */
function VocabCardLiteInner(props) {
  const { showPron = true } = props;
  const raw = props.word ?? props;

  const data = useMemo(() => {
    const zh = raw.zh ?? raw.hanzi ?? raw.id ?? "";
    const pinyin = raw.pinyin ?? raw.py ?? "";
    const ko = raw.ko ?? raw.meaning ?? "";
    // koPron 원본 필드들
    const koPronRaw =
      raw.koPronunciation ??
      raw.koPron ??
      raw.sentenceKoPronunciation ??
      "";

    // koPron 생성 로직
    let koPron = koPronRaw || "";
    try {
      if (!koPron) {
        if (pinyin) {
          // 이미 pinyin이 있으면 freeText 변환
          koPron = freeTextPinyinToKorean(pinyin);
        } else if (zh) {
          // 한자만 있으면 한자 -> pinyin 배열 -> 한글 발음
          const arr = pinyinPro(zh, { toneType: "none", type: "array" });
          koPron = pinyinArrayToKorean(arr);
        }
      }
    } catch {
      // 생성 실패 시 조용히 무시
    }

    return { zh, pinyin, ko, koPron, _raw: raw };
  }, [raw]);

  const { zh, pinyin, ko, koPron, _raw } = data;

  const clickable = typeof props.onClick === "function";
  const handleClick = useCallback(() => {
    if (clickable) props.onClick(_raw);
  }, [clickable, props, _raw]);

  const handleKeyDown = useCallback(
    (e) => {
      if (!clickable) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        props.onClick?.(_raw);
      }
    },
    [clickable, props, _raw]
  );

  const Content = (
    <CardContent>
      <Box sx={{ display: "grid", rowGap: 0.5 }}>
        <Typography
          variant="h5"
          sx={{ lineHeight: 1.2, letterSpacing: 0 }}
        >
          {zh}
        </Typography>

        {!!pinyin && (
          <Typography variant="body2" color="text.secondary">
            {pinyin} _ {koPron}
          </Typography>
        )}

        {!!ko && (
          <Typography variant="body2" sx={{ mt: 0.25 }}>
            {ko}
          </Typography>
        )}

       
      </Box>
    </CardContent>
  );

  return (
    <Card
      variant="outlined"
      sx={{ borderRadius: 2, height: "100%" }}
      elevation={0}
    >
      {clickable ? (
        <CardActionArea
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          role="button"
          aria-label={`단어 상세: ${zh}`}
          sx={{ height: "100%" }}
        >
          {Content}
        </CardActionArea>
      ) : (
        <Box tabIndex={0}>{Content}</Box>
      )}
    </Card>
  );
}

const VocabCardLite = memo(VocabCardLiteInner);
export default VocabCardLite;
