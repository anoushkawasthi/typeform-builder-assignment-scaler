/**
 * /forms/[id]/create — the builder.
 *
 * Route files only read the URL and hand over to a screen component.
 */

import { BuilderScreen } from "@/components/builder/builder-screen";

export default async function CreatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <BuilderScreen formId={Number(id)} />;
}
