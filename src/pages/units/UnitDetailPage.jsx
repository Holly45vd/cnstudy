import React, { useEffect, useState } from "react";
import { Outlet, useParams } from "react-router-dom";
import { getUnit } from "../../firebase/firestore";
import UnitTabs from "./UnitTabs";

export default function UnitDetailPage() {
  const { id } = useParams();
  const [unit, setUnit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const u = await getUnit(id);
        if (!alive) return;
        setUnit(u);
      } catch (e) {
        if (!alive) return;
        setErr(e.message || String(e));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [id]);

  if (loading) return <div className="text-sm text-gray-500">유닛 로드 중…</div>;
  if (err) return <div className="text-sm text-red-600">에러: {err}</div>;
  if (!unit) return <div className="text-sm text-gray-500">유닛을 찾을 수 없습니다.</div>;

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-xl font-bold">{unit.title || `유닛 ${unit.id}`}</h1>
        <p className="text-sm text-gray-600">{unit.theme}</p>
      </header>

      <UnitTabs unitId={unit.id} />
      {/* 하위 섹션에 unit 전달 */}
      <Outlet context={{ unit }} />
    </div>
  );
}
