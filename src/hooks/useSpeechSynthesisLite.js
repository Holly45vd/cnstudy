// 경량 Web Speech API 훅 (react-speech-kit 대체)
import { useEffect, useMemo, useRef, useState, useCallback } from "react";

export function useSpeechSynthesisLite() {
  const [voices, setVoices] = useState([]);
  const spokenRef = useRef(null);

  // 보이스 초기화/변경 감지
  useEffect(() => {
    const synth = window?.speechSynthesis;
    if (!synth) return;

    const load = () => setVoices(synth.getVoices() || []);
    load();

    // 일부 브라우저는 비동기 로드
    if ("onvoiceschanged" in synth) {
      synth.onvoiceschanged = load;
    } else {
      // 폴백: 몇 번 폴링
      let tries = 0;
      const t = setInterval(() => {
        tries += 1;
        load();
        if (voices.length || tries > 10) clearInterval(t);
      }, 250);
      return () => clearInterval(t);
    }
  }, []);

  const speak = useCallback(({ text, voice, rate = 1, pitch = 1, volume = 1, onend }) => {
    if (!text) return;
    const synth = window?.speechSynthesis;
    if (!synth || !("SpeechSynthesisUtterance" in window)) return;

    // 기존 발화 취소 후 새로
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    if (voice) u.voice = voice;
    u.rate = rate; u.pitch = pitch; u.volume = volume;
    u.onend = onend || null;
    synth.speak(u);
    spokenRef.current = u;
  }, []);

  return { speak, voices };
}
