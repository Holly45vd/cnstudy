// src/lib/ttsHelper.js
const wait = (ms) => new Promise(r => setTimeout(r, ms));

export async function warmUpVoices(tries = 8, gap = 250) {
  const synth = window?.speechSynthesis;
  if (!synth) { console.warn("[TTS] speechSynthesis 없음"); return false; }
  synth.getVoices(); // kick
  for (let i = 0; i < tries; i++) {
    const v = synth.getVoices();
    console.log(`[TTS] warmUp try=${i+1}/${tries}, voices=${v?.length||0}`);
    if (v && v.length) return true;
    await wait(gap);
  }
  return false;
}

function scoreZh(L) {
  const s = (L || "").toLowerCase();
  if (s.includes("zh-cn") || s.includes("cmn-hans")) return 3;
  if (s.includes("zh-tw") || s.includes("cmn-hant")) return 2;
  if (s.includes("zh-hk") || s.includes("yue")) return 1;
  return 0;
}

function pickVoice(list, pref) {
  const arr = Array.isArray(list) ? list : [];
  const kw = pref === "zh"
    ? ["chinese","中文","普通话","國語","国语","粤語","粵語"]
    : ["korean","한국어","조선말"];

  const cand = arr.filter(v => {
    const lang = (v.lang||"").toLowerCase();
    const name = (v.name||"").toLowerCase();
    const langMatch =
      lang.startsWith(pref) ||
      (pref==="zh" && (lang.includes("cmn") || lang.includes("yue")));
    const nameMatch = kw.some(k => name.includes(k));
    return langMatch || nameMatch;
  });

  if (pref === "zh") {
    cand.sort((a,b)=>scoreZh((b.lang||""))-scoreZh((a.lang||"")));
  }
  const picked = cand[0] || null;
  console.log(`[TTS] pickVoice(${pref}) ->`, picked ? `${picked.name} / ${picked.lang}` : "null");
  return picked;
}

/** 사용자 제스처 안에서 호출 권장 */
export async function speakSafe(text, { lang="zh", rate, pitch=1, volume=1 } = {}) {
  if (!text) return;
  const synth = window?.speechSynthesis;
  if (!synth || !("SpeechSynthesisUtterance" in window)) {
    console.warn("[TTS] 브라우저 미지원");
    return;
  }

  const ready = await warmUpVoices();
  const all = synth.getVoices() || [];
  console.log("[TTS] voices detected:", all.map(v=>`${v.name}(${v.lang})`));

  const voice = pickVoice(all, lang);

  try {
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang === "ko" ? "ko-KR" : "zh-CN";
    if (voice) u.voice = voice;
    u.rate = rate ?? (lang === "zh" ? 0.95 : 1.0);
    u.pitch = pitch; u.volume = volume;
    u.onerror = (e)=>console.error("[TTS] onerror:", e);
    u.onend = ()=>console.log("[TTS] onend");
    console.log("[TTS] speak:", { text, lang: u.lang, rate: u.rate });
    synth.speak(u);
  } catch (e) {
    console.error("[TTS] speak 실패", e);
  }
}

/** 버튼 한번 눌러서 엔진 프라임 및 가시적 테스트 */
export async function primeAndTest() {
  const ok = await warmUpVoices();
  const n = window?.speechSynthesis?.getVoices?.().length || 0;
  alert(`TTS 프라임: ${ok ? "OK" : "실패"}, 보이스 수: ${n}`);
  await speakSafe("测试一下。", { lang: "zh" });
}
