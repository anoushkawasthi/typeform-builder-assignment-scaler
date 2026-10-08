/**
 * /forms/[id]/workflow — an overview of the form's logic jumps.
 *
 * Route files only read the URL and hand over to a screen component.
 */

import { WorkflowScreen } from "@/components/builder/workflow-screen";

export default async function WorkflowPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <WorkflowScreen formId={Number(id)} />;
}
