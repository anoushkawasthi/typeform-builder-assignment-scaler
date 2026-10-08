/**
 * form-message-screen.tsx — a full-screen message in the form's default look.
 *
 * What it does:   used while a public form is loading and when it cannot be shown
 *                 (unpublished, deleted, or the link is wrong).
 * Depends on:     nothing.
 * Depended on by: public-form-screen.tsx, components/builder/preview-screen.tsx.
 */

interface FormMessageScreenProps {
  title: string;
  text?: string;
}

export function FormMessageScreen({ title, text }: FormMessageScreenProps) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-form-bg p-6 text-center font-form">
      <h1 className="text-[24px] leading-[32px] text-form-question sm:text-[32px] sm:leading-[40px]">{title}</h1>
      {text !== undefined && <p className="mt-2 text-[18px] leading-[24px] text-form-question-80">{text}</p>}
    </div>
  );
}
