/**
 * /forms/[id]/results — responses and summary.
 *
 * Route files only read the URL and hand over to a screen component.
 */

import { ResultsScreen } from "@/components/results/results-screen";

export default async function ResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ResultsScreen formId={Number(id)} />;
}
