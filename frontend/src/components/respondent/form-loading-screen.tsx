/**
 * form-loading-screen.tsx — what a respondent sees while a public form is loading.
 *
 * What it does:   a centred "made with Typeform Replica" mark over a thin bar that
 *                 fills, like the loading screen on a Typeform link.
 * Depends on:     nothing (the animation is plain CSS, defined in app/globals.css).
 * Depended on by: public-form-screen.tsx.
 */

export function FormLoadingScreen() {
  return (
    <div role="status" aria-label="Loading form" className="flex min-h-dvh flex-col items-center justify-center bg-white font-form">
      <p className="text-[12px] text-[#3c323e]">made with</p>
      <p className="mt-1 text-[22px] font-semibold leading-7 text-black">Typeform Replica</p>
      <div className="mt-4 h-[3px] w-40 overflow-hidden rounded-full bg-black/25">
        <div className="animate-loading-bar h-full rounded-full bg-black" />
      </div>
    </div>
  );
}
