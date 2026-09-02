import Link from "next/link";
import type { IdeaDrop } from "@/types/idea-drop";
import { truncate } from "@/lib/seo";

/** Shared paginated idea grid for the platform/stack/tools facet pages (category has its own, DB-backed variant). */
export function FacetIdeaGrid({
  ideas,
  page,
  pageSize,
  basePath,
}: {
  ideas: IdeaDrop[];
  page: number;
  pageSize: number;
  basePath: string;
}) {
  const totalPages = Math.max(1, Math.ceil(ideas.length / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const pageItems = ideas.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <>
      <div className="feed-grid">
        {pageItems.map((idea) => (
          <Link key={idea.id} href={`/feed/${idea.slug}`} className="feed-card">
            <div className="feed-card-cover cover-2">
              <span className="tag">{idea.category}</span>
              <span className="score">{idea.demandScore}% demand</span>
            </div>
            <div className="feed-card-body">
              <h2>{idea.title}</h2>
              <p>{truncate(idea.problem.summary, 160)}</p>
            </div>
          </Link>
        ))}
      </div>

      {totalPages > 1 ? (
        <nav className="pagination" aria-label="Pagination">
          {currentPage > 1 ? (
            <Link href={currentPage - 1 === 1 ? basePath : `${basePath}?page=${currentPage - 1}`}>← Prev</Link>
          ) : (
            <span className="is-disabled">← Prev</span>
          )}
          <span className="page-current">
            {currentPage} / {totalPages}
          </span>
          {currentPage < totalPages ? (
            <Link href={`${basePath}?page=${currentPage + 1}`}>Next →</Link>
          ) : (
            <span className="is-disabled">Next →</span>
          )}
        </nav>
      ) : null}
    </>
  );
}
