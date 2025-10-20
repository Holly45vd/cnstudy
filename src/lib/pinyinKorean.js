// src/lib/pinyinKorean.js
import pinyinData from "./pinyinData.json"

const MAX_PINYIN_LENGTH = 5;

// 빠른 조회용 맵
const PINYIN_MAP = new Map(
  pinyinData.map((i) => [String(i.pinyin).toLowerCase(), String(i.korean)])
);

// 성조있는 모음 → 기본모음
const TONE_GROUPS = {
  a: "āáǎà",
  e: "ēéěè",
  i: "īíǐì",
  o: "ōóǒò",
  u: "ūúǔù",
  "ü": "ǖǘǚǜ",
};
const stripTone = (s = "") => {
  let out = s;
  for (const [plain, tones] of Object.entries(TONE_GROUPS)) {
    out = out.replace(new RegExp(`[${tones}]`, "g"), plain);
  }
  return out;
};

// 성조/기호 정리 + ü 표준화
const normalizePinyin = (str = "") =>
  stripTone(str.toLowerCase())
    .replace(/u:/g, "ü")
    .replace(/v/g, "ü")
    .replace(/[^a-zü]/g, "");

/** 알파벳 병음 문자열을 음절 리스트로 분해 (사전 기반 최대매칭) */
export const splitPinyin = (alpha, dictSet) => {
  const out = [];
  let buf = alpha;
  while (buf.length > 0) {
    let matched = false;
    for (let len = Math.min(MAX_PINYIN_LENGTH, buf.length); len > 0; len--) {
      const chunk = buf.slice(0, len);
      if (dictSet.has(chunk)) {
        out.push(chunk);
        buf = buf.slice(len);
        matched = true;
        break;
      }
    }
    if (!matched) { // 미등록 문자 1개 탈락
      out.push(buf[0]);
      buf = buf.slice(1);
    }
  }
  return out;
};

/**
 * 문장(한자) → 병음 배열(성조 없음) → 한국어 발음 문자열
 * @param {string[]} pinyinArray e.g. ['ni','men','hao']
 * @returns {string} e.g. '니 먼 하오'
 */
export const pinyinArrayToKorean = (pinyinArray = []) =>
  pinyinArray
    .map((sy) => PINYIN_MAP.get(normalizePinyin(sy)) || sy)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

/**
 * 병음 토큰(성조/공백/문장부호 섞임) → 한국어 발음
 * SubstitutionPage처럼 pinyin-pro 없이도 쓸 수 있게 보조 제공
 */
export const freeTextPinyinToKorean = (text = "") => {
  if (!text.trim()) return "";
  const dictSet = new Set(PINYIN_MAP.keys());
  return text
    .toLowerCase()
    .replace(/[^a-z\sāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜü]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => splitPinyin(normalizePinyin(word), dictSet)
      .map((sy) => PINYIN_MAP.get(sy) || sy)
      .join(" "))
    .join(" ");
};
