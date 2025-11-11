import React from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import App from "./App";

/* Pages */
import UnitListPage from "../pages/units/UnitListPage";
import UnitDetailPage from "../pages/units/UnitDetailPage";
import SummarySection from "../pages/units/sections/SummarySection";
import VocabularySection from "../pages/units/sections/VocabularySection";
import GrammarSection from "../pages/units/sections/GrammarSection";
import SubstitutionSection from "../pages/units/sections/SubstitutionSection";
import ConversationSection from "../pages/units/sections/ConversationSection";
import PracticeSection from "../pages/units/sections/PracticeSection";
import EverydayPage from "../pages/everyday/EverydayPage";
import PronunciationPage from "../pages/pronunciation/PronunciationPage";
import SentenceStudyPage from "../pages/SentenceStudyPage";

/* Grammar Hub (문법/문장 탭) */
import GrammarSentenceHub from "../pages/grammar/GrammarSentenceHub";

/* Admin */
import AdminHome from "../admin/AdminHome";
import WordsAdmin from "../admin/WordsAdmin";
import UnitsAdmin from "../admin/UnitsAdmin";
import DailiesAdmin from "../admin/DailiesAdmin";

/* Flashcards */
import FlashcardsPage from "../pages/card/FlashcardsPage";

const fromVite = typeof import.meta !== "undefined" ? import.meta.env?.BASE_URL : "";
const fromCRA = typeof process !== "undefined" ? process.env.PUBLIC_URL || "" : "";
const BASENAME = (fromVite || fromCRA || "/").replace(/\/+$/, "/");

export const router = createBrowserRouter(
  [
    {
      path: "/",
      element: <App />,
      children: [
        { index: true, element: <UnitListPage /> },

        /* 유닛 내부 탭 */
        {
          path: "units/:id",
          element: <UnitDetailPage />,
          children: [
            { index: true, element: <SummarySection /> },
            { path: "vocabulary", element: <VocabularySection /> },
            { path: "grammar", element: <GrammarSection /> },
            { path: "substitution", element: <SubstitutionSection /> },
            { path: "conversation", element: <ConversationSection /> },
            { path: "practice", element: <PracticeSection /> },
          ],
        },

        /* 상단 네브 */
        // Grammar 허브: 내부에서 탭으로 Grammar(GrammarLine) / Sentence(SentenceStudyPage) 전환
        { path: "grammar", element: <GrammarSentenceHub /> },

        // 과거 단독 문장 학습 경로를 허브의 문장 탭으로 리다이렉트
        { path: "sentence", element: <Navigate to="/grammar?tab=sentence" replace /> },

        { path: "pronunciation", element: <PronunciationPage /> },
        { path: "everyday/:date?", element: <EverydayPage /> },
        { path: "flashcards", element: <FlashcardsPage /> },
        { path: "flashcards/:unitId", element: <FlashcardsPage /> },

        /* Admin */
        {
          path: "admin",
          children: [
            { index: true, element: <AdminHome /> },
            { path: "words", element: <WordsAdmin /> },
            { path: "units", element: <UnitsAdmin /> },
            { path: "dailies", element: <DailiesAdmin /> },
          ],
        },

        { path: "*", element: <UnitListPage /> },
      ],
    },
  ],
  { basename: BASENAME }
);
