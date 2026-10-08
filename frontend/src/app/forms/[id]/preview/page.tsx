/**
 * /forms/[id]/preview — a full preview of the draft; nothing is saved.
 *
 * Route files only read the URL and hand over to a screen component.
 */

import { PreviewScreen } from "@/components/builder/preview-screen";

export default async function PreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PreviewScreen formId={Number(id)} />;
}
