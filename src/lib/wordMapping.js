// src/lib/wordMapping.js
// 예전/현재 키 혼재를 정리해 WordDetailModal/VocabularyCard 모두가 이해할 수 있는 형태로 변환
export function mapToEverydayWord(v = {}) {
  const zh = v.zh ?? v.hanzi ?? v.id ?? v.cn ?? "";
  const pinyin = v.pinyin ?? v.py ?? "";
  const ko = v.ko ?? v.meaning ?? "";

  const koPronunciation =
    v.koPronunciation ?? v.koPron ?? v.pronunciation_korean ?? v.pron_korean ?? "";

  const pos = v.pos ?? v.partOfSpeech ?? "";
  const tags = Array.isArray(v.tags) ? v.tags : [];

  // 예문(문장)
  const sentence = v.sentence ?? v.exampleZh ?? v.example_zh ?? "";
  const sentencePinyin = v.sentencePinyin ?? v.examplePy ?? v.example_pinyin ?? "";
  const sentenceKo = v.sentenceKo ?? v.exampleKo ?? v.example_ko ?? "";
  const sentenceKoPronunciation =
    v.sentenceKoPronunciation ?? v.sentencePron ?? v.sentencePronunciation ?? "";

  // 확장/문법/발음(구키 폴백 포함)
  const grammar = Array.isArray(v.grammar) ? v.grammar : [];
  const extensionsRaw = Array.isArray(v.extensions) ? v.extensions : [];
  const extensions = extensionsRaw.map((e) => ({
    ...e,
    koPron: e.koPron ?? e.pron ?? null, // 구키 보정
  }));
  const keyPoints = Array.isArray(v.keyPoints) ? v.keyPoints : [];
  const pronunciation =
    Array.isArray(v.pronunciation)
      ? v.pronunciation
      : Array.isArray(v.pronunciation_items)
      ? v.pronunciation_items
      : [];

  return {
    zh,
    pinyin,
    ko,
    koPronunciation,
    pos,
    tags,
    sentence,
    sentencePinyin,
    sentenceKo,
    sentenceKoPronunciation,
    // WordDetailModal이 구키(sentecePron/koPron)도 다 받도록 넉넉히 전달
    sentencePron: sentenceKoPronunciation,
    grammar,
    extensions,
    keyPoints,
    pronunciation,
    // 원문 필드도 같이 둠(있으면 표시)
    sourceUrl: v.sourceUrl || v.source || "",
  };
}
