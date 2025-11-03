// src/lib/ttsHelper.js
// 안전한 TTS 헬퍼 (zh 보이스 강제 선택 + 없을 때 자동 대체: 병음/한글발음)
// 사용 예:
//   import { speakZh, speakKo, registerTranscribers, warmUpVoices } from "../lib/ttsHelper";
//   registerTranscribers({ toPinyin: (zh)=>pinyinPro(zh,{toneType:"mark",type:"string"}), toKoPron: freeTextPinyinToKorean });
//   await warmUpVoices();
//   speakZh("你好！");        // 중국어 보이스로 읽기 (없으면 병음/한글발음으로 우회)
//   speakKo("안녕하세요");     // 한국어 보이스로 읽기

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

let __voicesWarmed = false;
export async function warmUpVoices(tries = 12, gap = 250) {
  const synth = typeof window !== "undefined" ? window.speechSynthesis : null;
  if (!synth) { console.warn("[TTS] speechSynthesis 없음"); return false; }
  if (__voicesWarmed) return true;

  // kick
  synth.getVoices();

  // 일부 WebKit(iOS)에서 onvoiceschanged가 늦는 이슈 대비
  const waitOnVoicesChanged = new Promise((res) => {
    const timer = setTimeout(res, tries * gap + 500);
    synth.onvoiceschanged = () => { clearTimeout(timer); res(); };
  });

  for (let i = 0; i < tries; i++) {
    const v = synth.getVoices();
    console.log(`[TTS] warmUp try=${i + 1}/${tries}, voices=${v?.length || 0}`);
    if (v && v.length) { __voicesWarmed = true; return true; }
    await wait(gap);
  }

  // 마지막으로 onvoiceschanged 신호를 추가 대기
  await waitOnVoicesChanged;
  const v2 = synth.getVoices();
  __voicesWarmed = !!(v2 && v2.length);
  return __voicesWarmed;
}

function scoreZh(lang = "") {
  const s = lang.toLowerCase();
  if (s.includes("zh-cn") || s.includes("cmn-hans")) return 3; // 대륙 간체
  if (s.includes("zh-tw") || s.includes("cmn-hant")) return 2; // 대만 번체
  if (s.includes("zh-hk") || s.includes("yue")) return 1;      // 광동어
  return 0;
}

function pickVoice(list, pref /* "zh" | "ko" | "en" */) {
  const arr = Array.isArray(list) ? list : [];
  const kw = pref === "zh"
    ? ["chinese", "中文", "普通话", "國語", "国语", "粤語", "粵語"]
    : pref === "ko"
    ? ["korean", "한국어", "조선말"]
    : ["english", "en-us", "en-gb"];

  const cand = arr.filter((v) => {
    const lang = (v.lang || "").toLowerCase();
    const name = (v.name || "").toLowerCase();
    const langMatch = lang.startsWith(pref) || (pref === "zh" && (lang.includes("cmn") || lang.includes("yue")));
    const nameMatch = kw.some((k) => name.includes(k));
    return langMatch || nameMatch;
  });

  if (pref === "zh") cand.sort((a, b) => scoreZh(b.lang || "") - scoreZh(a.lang || ""));

  const picked = cand[0] || null;
  console.log(`[TTS] pickVoice(${pref}) ->`, picked ? `${picked.name} / ${picked.lang}` : "null");
  return picked;
}

function hasCJK(s = "") {
  return /[\u3400-\u9FFF]/.test(s); // 통합한자 범위
}

// 외부 변환기 주입(선택): zh 텍스트 → 병음 / 한글발음
let _toPinyin = null;
let _toKoPron = null;
export function registerTranscribers({ toPinyin, toKoPron } = {}) {
  if (typeof toPinyin === "function") _toPinyin = toPinyin;
  if (typeof toKoPron === "function") _toKoPron = toKoPron;
}

/**
 * 핵심 호출 함수
 * - lang: "zh" | "ko" | "en"
 * - zh 보이스가 없고 텍스트에 한자가 포함되면:
 *   1) 병음 변환 후 en 보이스로 읽기 → 2) koPron으로 ko 보이스 → 3) 경고 후 기본 재생
 */
export async function speakSafe(text, { lang = "zh", rate, pitch = 1, volume = 1 } = {}) {
  const t = String(text || "");
  if (!t) return;

  const hasAPI = typeof window !== "undefined" && !!window.speechSynthesis && ("SpeechSynthesisUtterance" in window);
  if (!hasAPI) { console.warn("[TTS] 브라우저 미지원"); return; }

  await warmUpVoices();
  const synth = window.speechSynthesis;
  const all = synth.getVoices() || [];
  console.log("[TTS] voices:", all.map((v) => `${v.name}(${v.lang})`).join(", "));

  const voice = pickVoice(all, lang);

  // zh 보이스가 없고 텍스트가 한자이면 안전 대체 경로
  if (lang === "zh" && !voice && hasCJK(t)) {
    if (typeof _toPinyin === "function") {
      const roman = _toPinyin(t);
      console.warn("[TTS] zh voice 없음 → pinyin fallback");
      return speakSafe(roman, { lang: "en", rate: 1.0, pitch, volume });
    }
    if (typeof _toKoPron === "function") {
      const ko = _toKoPron(t);
      console.warn("[TTS] zh voice 없음 → koPron fallback");
      return speakSafe(ko, { lang: "ko", rate: 1.0, pitch, volume });
    }
    console.warn("[TTS] zh voice 없음, 변환기도 없음 → 기본 재생 시도");
  }

  try {
    synth.cancel(); // 중복 방지
    const u = new SpeechSynthesisUtterance(t);
    u.lang = lang === "ko" ? "ko-KR" : lang === "en" ? "en-US" : "zh-CN";
    if (voice) u.voice = voice;
    u.rate = rate ?? (lang === "zh" ? 0.95 : 1.0);
    u.pitch = pitch;
    u.volume = volume;
    u.onerror = (e) => console.error("[TTS] onerror:", e);
    u.onend = () => console.log("[TTS] onend");
    console.log("[TTS] speak:", { sample: t.slice(0, 20), lang: u.lang, rate: u.rate, voice: u.voice?.name });
    synth.speak(u);
  } catch (e) {
    console.error("[TTS] speak 실패", e);
  }
}

// 편의 래퍼
export const speakZh = (text, opts = {}) => speakSafe(text, { ...opts, lang: "zh" });
export const speakKo = (text, opts = {}) => speakSafe(text, { ...opts, lang: "ko" });
export const speakEn = (text, opts = {}) => speakSafe(text, { ...opts, lang: "en" });

// 엔진 프라임 및 간단 테스트 버튼용
export async function primeAndTest() {
  const ok = await warmUpVoices();
  const n = window?.speechSynthesis?.getVoices?.().length || 0;
  alert(`TTS 프라임: ${ok ? "OK" : "실패"}, 보이스 수: ${n}`);
  await speakZh("测试一下。");
}
