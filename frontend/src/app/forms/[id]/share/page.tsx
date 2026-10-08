/**
 * /forms/[id]/share — the public link and publish controls.
 *
 * Route files only read the URL and hand over to a screen component.
 */

import { ShareScreen } from "@/components/builder/share-screen";

export default async function SharePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ShareScreen formId={Number(id)} />;
}
