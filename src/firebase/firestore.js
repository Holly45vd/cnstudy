// src/firebase/firestore.js
import { db } from "./config";
import {
  collection, doc, getDoc, getDocs, setDoc, updateDoc, serverTimestamp,
  query, where, documentId, orderBy, limit
} from "firebase/firestore";

/* ------------------------ 공통 유틸 ------------------------ */
const IN_CHUNK = 10; // Firestore: where(documentId(), 'in', [...]) 최대 10개
const chunk = (arr, n = IN_CHUNK) => {
  const out = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
};
const orderByIds = (docs, ids) => {
  const m = new Map(docs.map(d => [d.id, d]));
  return ids.map(id => m.get(id)).filter(Boolean);
};

/* ------------------------ words ------------------------ */
// 스키마 최소 보정(키 통일 + 기본값)
const normalizeWord = (w) => {
  if (!w) return w;
  if (w.koPron) w.koPronunciation = w.koPron;
  if (w.sentencePron) w.sentenceKoPronunciation = w.sentencePron;
  const out = {
    id: w.id || w.zh,             // 없으면 한자를 id로
    zh: w.zh ?? "",
    pinyin: w.pinyin ?? "",
    ko: w.ko ?? "",
    pos: w.pos || "",
    tags: Array.isArray(w.tags) ? w.tags : (w.tags ? String(w.tags).split(",").map(s=>s.trim()) : []),
    sentence: w.sentence || "",
    sentencePinyin: w.sentencePinyin || "",
    sentenceKo: w.sentenceKo || "",
    sentenceKoPronunciation: w.sentenceKoPronunciation || "",
    pronunciation: Array.isArray(w.pronunciation) ? w.pronunciation : [],
    extensions: Array.isArray(w.extensions) ? w.extensions : [],
    grammar: Array.isArray(w.grammar) ? w.grammar : [],
    keyPoints: Array.isArray(w.keyPoints) ? w.keyPoints : [],
    meta: { ...(w.meta || {}), updatedAt: serverTimestamp() },
  };
  if (!out.id) throw new Error("word.id/zh가 필요합니다");
  if (!out.zh || !out.pinyin || !out.ko) throw new Error(`필수 누락(zh/pinyin/ko) for ${out.id}`);
  return out;
};

// 단어 upsert
export async function upsertWord(wordDoc) {
  const w = normalizeWord(wordDoc);
  await setDoc(doc(db, "words", w.id), w, { merge: true });
  return w.id;
}

// 단어 여러 개(id 배열) 조회 + 순서 복원
export async function getWordsByIds(ids) {
  if (!ids?.length) return [];
  const batches = chunk([...new Set(ids)]);
  const results = [];
  for (const ids10 of batches) {
    const q = query(collection(db, "words"), where(documentId(), "in", ids10));
    const snap = await getDocs(q);
    results.push(...snap.docs.map(d => ({ id: d.id, ...d.data() })));
  }
  return orderByIds(results, ids);
}

/* ------------------------ units ------------------------ */
export async function listUnits({ max = 100 } = {}) {
  // id가 숫자라면 정렬을 위해 일단 전부 읽고 소팅(간단 버전)
  const snap = await getDocs(query(collection(db, "units"), limit(max)));
  const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  // 숫자 id 우선 정렬 → 그 외는 문자열 정렬
  return all.sort((a, b) => {
    const na = Number(a.id), nb = Number(b.id);
    const an = Number.isFinite(na), bn = Number.isFinite(nb);
    if (an && bn) return na - nb;
    if (an) return -1;
    if (bn) return 1;
    return String(a.id).localeCompare(String(b.id), "ko");
  });
}

export async function getUnit(id) {
  const snap = await getDoc(doc(db, "units", id));
  return snap.exists() ? ({ id: snap.id, ...snap.data() }) : null;
}

export async function createUnit(unitDoc) {
  if (!unitDoc?.id) throw new Error("unit.id 필수");
  const docData = {
    title: unitDoc.title || `유닛 ${unitDoc.id}`,
    theme: unitDoc.theme || "",
    goals: unitDoc.goals || [],
    objectives: unitDoc.objectives || [],
    vocabIds: unitDoc.vocabIds || [],
    conversation: unitDoc.conversation || [],
    grammar: unitDoc.grammar || [],
    practice: unitDoc.practice || {},
    summary: unitDoc.summary || { vocabulary: [], grammar: [] },
    updatedAt: serverTimestamp(),
  };
  await setDoc(doc(db, "units", String(unitDoc.id)), docData, { merge: true });
  return unitDoc.id;
}

export async function updateUnit(id, patch) {
  const docRef = doc(db, "units", String(id));
  const data = { ...patch, updatedAt: serverTimestamp() };
  await updateDoc(docRef, data);
  return id;
}

/* ------------------------ dailies ------------------------ */
export async function getDaily(date) {
  const snap = await getDoc(doc(db, "dailies", date));
  return snap.exists() ? ({ id: snap.id, ...snap.data() }) : null;
}

// 날짜별 단어 세팅(3개 권장)
export async function setDailyWords(date, wordIds) {
  if (!date) throw new Error("date 필수(YYYY-MM-DD)");
  const ids = (wordIds || []).map(String).filter(Boolean);
  const payload = {
    date,
    wordIds: ids,
    updatedAt: serverTimestamp(),
  };
  await setDoc(doc(db, "dailies", date), payload, { merge: true });
  return date;
}
