/** Shared layout for the simple text pages linked from the footer (about, contact, privacy, terms). */
export function InfoPage({ title, intro, children }: { title: string; intro?: string; children: React.ReactNode }) {
  return (
    <article className="card mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold">{title}</h1>
      {intro && <p className="mt-2 text-slate-600">{intro}</p>}
      <div className="mt-6 space-y-6 text-sm leading-6 text-slate-700 [&_h2]:mb-2 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-slate-900 [&_li]:ml-5 [&_li]:list-disc">
        {children}
      </div>
    </article>
  );
}
