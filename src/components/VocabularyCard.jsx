// src/components/VocabularyCard.jsx  (혹은 /components/vocabulary/VocabularyCard.jsx 를 사용 중이면 그 파일에 적용)
import React, { useState, useMemo } from "react";

export default function VocabularyCard(props) {
  const [flipped, setFlipped] = useState(false);

  // ✅ word prop 또는 직접 props 모두 지원
  const raw = props.word ?? props;

  const { zh, pinyin, ko, koPron } = useMemo(() => {
    const zh = raw.zh ?? raw.hanzi ?? raw.id ?? "";
    const pinyin = raw.pinyin ?? "";
    const ko = raw.ko ?? raw.meaning ?? "";

    // pronunciation 배열에서 ko(한글발음) 우선 표시 + 폴백 키
    let koPron =
      (Array.isArray(raw.pronunciation) &&
        (raw.pronunciation.find((p) => p?.label === zh && p.ko)?.ko ||
         raw.pronunciation[0]?.ko)) ||
      raw.koPronunciation || raw.koPron || "";

    return { zh, pinyin, ko, koPron };
  }, [raw]);

  const clickable = typeof props.onClick === "function";

  const handleClick = () => {
    if (clickable) props.onClick(raw);
    else setFlipped((v) => !v);
  };

  return (
    <div
      onClick={handleClick}
      className="border rounded-lg shadow-md w-36 h-36 flex flex-col items-center justify-center text-center cursor-pointer bg-white hover:bg-gray-50 transition-all duration-200"
      role="button"
      aria-label={clickable ? `단어 상세: ${zh}` : `단어 카드 뒤집기: ${zh}`}
    >
      {flipped && !clickable ? (
        <div>
          <p className="text-lg font-bold">{ko}</p>
          {koPron && <p className="text-gray-500 text-sm">{koPron}</p>}
        </div>
      ) : (
        <div>
          <p className="text-3xl font-bold">{zh}</p>
          <p className="text-gray-600 text-sm">{pinyin}</p>
        </div>
      )}
    </div>
  );
}
