/**
 * /forms/[id]/connect — integrations and webhooks (a browsable placeholder).
 *
 * Route files only read the URL and hand over to a screen component.
 */

import { ConnectScreen } from "@/components/builder/connect-screen";

export default async function ConnectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ConnectScreen formId={Number(id)} />;
}
