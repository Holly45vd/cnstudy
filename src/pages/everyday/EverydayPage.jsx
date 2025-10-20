import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getDaily, getWordsByIds } from "../../firebase/firestore";
import VocabCardLite from "../../components/VocabCardLite";
import WordDetailModal from "../../components/WordDetailModal";
import { mapToEverydayWord } from "../../lib/wordMapping";

function yyyyMmDd(d) {
  return d.toISOString().slice(0, 10);
}
function addDays(dateStr, delta) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + delta);
  return yyyyMmDd(d);
}

export default function EverydayPage() {
  const { date: paramDate } = useParams();
  const [date, setDate] = useState(paramDate || yyyyMmDd(new Date()));
  const nav = useNavigate();

  const [loading, setLoading] = useState(true);
  const [wordIds, setWordIds] = useState([]);
  const [words, setWords] = useState([]);
  const [err, setErr] = useState(null);

  // 상세 모달
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);

  // URL ↔ 상태 동기화
  useEffect(() => {
    if (paramDate && paramDate !== date) setDate(paramDate);
  }, [paramDate]); // eslint-disable-line

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const daily = await getDaily(date);
        const ids = daily?.wordIds || [];
        if (!alive) return;
        setWordIds(ids);
        const ws = await getWordsByIds(ids);
        if (!alive) return;
        setWords(ws);
      } catch (e) {
        if (!alive) return;
        setErr(e.message || String(e));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [date]);

  const prevDate = useMemo(() => addDays(date, -1), [date]);
  const nextDate = useMemo(() => addDays(date, +1), [date]);

  const handleOpen = (w) => { setSelected(mapToEverydayWord(w)); setOpen(true); };
  const handleClose = () => setOpen(false);

  return (
    <div className="space-y-4">
      <header className="flex items-center gap-2">
        <h1 className="text-xl font-bold">데일리 단어</h1>
        <div className="ml-auto flex items-center gap-2">
          <button className="px-3 py-1 border rounded" onClick={() => nav(`/everyday/${prevDate}`)}>◀ 어제</button>
          <input
            type="date"
            value={date}
            onChange={(e) => nav(`/everyday/${e.target.value}`)}
            className="border rounded px-2 py-1"
          />
          <button className="px-3 py-1 border rounded" onClick={() => nav(`/everyday/${nextDate}`)}>내일 ▶</button>
        </div>
      </header>

      {loading && <div className="text-sm text-gray-500">로드 중…</div>}
      {err && <div className="text-sm text-red-600">에러: {err}</div>}

      {!loading && !err && wordIds.length === 0 && (
        <div className="text-sm text-gray-500">이 날짜에는 등록된 단어가 없습니다.</div>
      )}

      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {words.map((w) => (
          <VocabCardLite key={w.id || w.zh} word={w} onClick={handleOpen} />
        ))}
      </section>

      {/* 모달: selected를 그대로 전달 */}
      <WordDetailModal open={open} onClose={handleClose} word={selected} />
    </div>
  );
}
