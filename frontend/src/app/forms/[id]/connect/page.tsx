/**
 * /forms/[id]/connect — integrations (placeholder).
 *
 * Route files only read the URL and hand over to a screen component.
 */

import { PlaceholderSectionScreen } from "@/components/builder/placeholder-section-screen";

export default async function ConnectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PlaceholderSectionScreen formId={Number(id)} section="connect" />;
}
