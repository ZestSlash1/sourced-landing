import Link from "next/link";
import { breadcrumbJsonLd, type BreadcrumbItem } from "@/lib/seo";

/** Visible breadcrumb nav + matching BreadcrumbList JSON-LD. `items` excludes Home — it's prepended here. */
export default function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  const trail: BreadcrumbItem[] = [{ name: "Home", path: "/" }, ...items];

  return (
    <>
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        {trail.map((item, i) => (
          <span key={item.path}>
            {i > 0 ? <span className="breadcrumb-sep"> / </span> : null}
            {i === trail.length - 1 ? (
              <span aria-current="page">{item.name}</span>
            ) : (
              <Link href={item.path}>{item.name}</Link>
            )}
          </span>
        ))}
      </nav>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd(trail)) }}
      />
    </>
  );
}
