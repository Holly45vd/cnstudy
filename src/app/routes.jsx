import React from "react";
import { createBrowserRouter } from "react-router-dom";
import App from "./App";

/* Pages */
import UnitListPage from "../pages/units/UnitListPage";
import UnitDetailPage from "../pages/units/UnitDetailPage";
import SummarySection from "../pages/units/sections/SummarySection";
import VocabularySection from "../pages/units/sections/VocabularySection";
import GrammarSection from "../pages/units/sections/GrammarSection"; // ✅ 복원
import SubstitutionSection from "../pages/units/sections/SubstitutionSection";
import ConversationSection from "../pages/units/sections/ConversationSection";
import PracticeSection from "../pages/units/sections/PracticeSection";
import EverydayPage from "../pages/everyday/EverydayPage";

/* Grammar (전체 문법 한 줄) */
import GrammarLine from "../pages/grammar/GrammarLine";

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

        /* ✅ 유닛 내부 탭 */
        {
          path: "units/:id",
          element: <UnitDetailPage />,
          children: [
            { index: true, element: <SummarySection /> },
            { path: "vocabulary", element: <VocabularySection /> },
            { path: "grammar", element: <GrammarSection /> }, // ✅ 유닛별 문법 복원
            { path: "substitution", element: <SubstitutionSection /> },
            { path: "conversation", element: <ConversationSection /> },
            { path: "practice", element: <PracticeSection /> },
          ],
        },

        /* ✅ 새 문법 전체 페이지 (네브바용) */
        { path: "grammar", element: <GrammarLine /> },

        { path: "everyday/:date?", element: <EverydayPage /> },
        { path: "flashcards", element: <FlashcardsPage /> },
        { path: "flashcards/:unitId", element: <FlashcardsPage /> },

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
