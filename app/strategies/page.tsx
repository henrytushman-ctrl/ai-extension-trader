import StrategiesList from "./strategies-list";
import type { MatrixCell } from "@/lib/api";

const AI_TRADER_API = process.env.NEXT_PUBLIC_AI_TRADER_API || "https://ai-trader-jylt.onrender.com";

async function getStrategies(): Promise<MatrixCell[]> {
  try {
    const res = await fetch(`${AI_TRADER_API}/analytics/matrix`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export default async function StrategiesPage() {
  const cells = await getStrategies();
  return (
    <main className="flex-1">
      <StrategiesList cells={cells} />
    </main>
  );
}
