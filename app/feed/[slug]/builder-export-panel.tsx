"use client";

export default function BuilderExportPanel({ slug, contractMarkdown, cursorRules, sqlSchema }: {
  slug: string; contractMarkdown: string; cursorRules: string; sqlSchema: string;
}) {
  function download(content: string, filename: string) {
    const url = URL.createObjectURL(new Blob([content], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url; link.download = filename;
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <section className="brief-section" aria-labelledby="builder-export-heading">
    <h3 id="builder-export-heading">Download your build files</h3>
    <p>Generated starting points for your coding agent. Review the spec and schema before use. Database hosting and credentials are not provided.</p>
    <div className="watch-actions">
      <button type="button" className="prompt-copy-btn" onClick={() => download(contractMarkdown, "CLAUDE.md")}>Download CLAUDE.md</button>
      <button type="button" className="prompt-copy-btn" onClick={() => download(cursorRules, ".cursorrules")}>Download .cursorrules</button>
      <button type="button" className="prompt-copy-btn" onClick={() => download(sqlSchema, slug + "-schema.sql")}>Download schema.sql</button>
    </div>
  </section>;
}
