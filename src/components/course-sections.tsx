import { SECTIONS, linkKind } from "@/lib/course-content";
import { fileLabel, formatBytes } from "@/lib/file-types";
import { deleteCourseContent } from "@/actions/content";
import { SubmitButton } from "@/components/submit-button";

export type ContentItem = {
  id: string;
  section: string;
  kind: string;
  title: string;
  url: string | null;
  fileName: string | null;
  fileSize: number | null;
};

/**
 * The three fixed, colour-coded sections shown above the lessons on every
 * course. `visible` decides which sections this viewer can open (the outline
 * is public; materials and resources need course access). Locked sections are
 * still shown so the layout is the same for everyone.
 */
export function CourseSections({
  items,
  canAccess,
  canEdit,
}: {
  items: ContentItem[];
  canAccess: boolean;
  canEdit: boolean;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-3" data-testid="course-sections">
      {SECTIONS.map((section) => {
        const sectionItems = items.filter((i) => i.section === section.key);
        const locked = !section.public && !canAccess;
        return (
          <section
            key={section.key}
            aria-labelledby={`section-${section.key}`}
            data-section={section.key}
            className={`flex flex-col rounded-xl border-2 p-4 ${section.styles.card}`}
          >
            <h2 id={`section-${section.key}`} className={`mb-3 flex items-center gap-2 font-semibold ${section.styles.title}`}>
              <span aria-hidden>{section.icon}</span>
              {section.label}
              {!locked && sectionItems.length > 0 && (
                <span className={`badge ml-auto ${section.styles.chip}`}>{sectionItems.length}</span>
              )}
            </h2>

            {locked ? (
              <p className="text-sm text-slate-600">🔒 Enroll to see the {section.label.toLowerCase()}.</p>
            ) : sectionItems.length === 0 ? (
              <p className="text-sm text-slate-600">Nothing posted yet.</p>
            ) : (
              <ul className="space-y-2">
                {sectionItems.map((item) => (
                  <li key={item.id} className="flex items-start gap-2 rounded-lg bg-surface/70 p-2 text-sm">
                    <div className="min-w-0 flex-1">
                      <a
                        href={item.kind === "FILE" ? `/api/files/content/${item.id}` : item.url!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium break-words text-brand-700 hover:underline"
                      >
                        {item.title}
                      </a>
                      <div className="mt-0.5 flex flex-wrap gap-1">
                        <span className={`badge ${section.styles.chip}`}>
                          {item.kind === "FILE" ? fileLabel(item.fileName) : linkKind(item.url!)}
                        </span>
                        {item.kind === "FILE" && item.fileSize ? (
                          <span className="text-xs text-slate-500">{formatBytes(item.fileSize)}</span>
                        ) : null}
                      </div>
                    </div>
                    {canEdit && (
                      <form action={deleteCourseContent}>
                        <input type="hidden" name="contentId" value={item.id} />
                        <SubmitButton
                          className="btn px-2 py-1 text-xs text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                          pendingText="…"
                          confirm={`Remove "${item.title}"?`}
                        >
                          Remove
                        </SubmitButton>
                      </form>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
