// src/app/routes.jsx
import React from "react";
import { createBrowserRouter } from "react-router-dom";
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

import PronunciationPage from "../pages/pronunciation/PronunciationPage";
import EverydayPage from "../pages/everyday/EverydayPage";

/* Admin */
import AdminHome from "../admin/AdminHome";
import WordsAdmin from "../admin/WordsAdmin";
import UnitsAdmin from "../admin/UnitsAdmin";
import DailiesAdmin from "../admin/DailiesAdmin";

/* Flashcards */
import FlashcardsPage from "../pages/card/FlashcardsPage";

/** ===== basename 자동 분기 =====
 * - Vite(dev): import.meta.env.BASE_URL === "/"
 * - Vite(build): vite.config.base 값 주입(예: "/cnstudy/")
 * - CRA(build): process.env.PUBLIC_URL === "/cnstudy"
 */
const fromVite =
  typeof import.meta !== "undefined" ? import.meta.env?.BASE_URL : "";
const fromCRA =
  typeof process !== "undefined" ? process.env.PUBLIC_URL || "" : "";
const BASENAME = (fromVite || fromCRA || "/").replace(/\/+$/, "/");

export const router = createBrowserRouter(
  [
    {
      path: "/",
      element: <App />,
      children: [
        { index: true, element: <UnitListPage /> },

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

        { path: "pronunciation", element: <PronunciationPage /> },
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

        // 404 fallback
        { path: "*", element: <UnitListPage /> },
      ],
    },
  ],
  { basename: BASENAME }
);
