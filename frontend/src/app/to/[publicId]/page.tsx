/**
 * /to/[publicId] — the public, shareable form. No login.
 *
 * Route files only read the URL and hand over to a screen component.
 */

import { PublicFormScreen } from "@/components/respondent/public-form-screen";

export default async function PublicFormPage({ params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params;
  return <PublicFormScreen publicId={publicId} />;
}
