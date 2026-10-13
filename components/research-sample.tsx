import Link from "next/link";
import CopyPromptButton from "@/app/feed/[slug]/copy-prompt-button";

const prompt = `Build a local-only Prisma migration review notebook in Next.js and TypeScript.
This is a prototype to test a workflow hypothesis, not a migration engine.
Let a developer paste a SQL migration, note externally managed tables, and complete a review checklist.
Show the pasted SQL beside notes about custom SQL, table ownership, deployment environment, and recovery planning.
Allow export of the checklist and notes as Markdown. Keep state in local storage with a clear reset button.
Never request database credentials, execute SQL, infer that a migration is safe, or generate automatic rollback SQL.
Test persistence after reload, export accuracy, empty input, and keyboard navigation.
Keep OAuth, billing, database connections, schema parsers, and multi-ORM support out of scope.
Before building beyond this prototype, test the checklist on a real anonymized migration with a consenting developer.`;

export default function ResearchSample() {
  return <article className="research-sample" aria-labelledby="research-sample-title">
    <div className="sample-intro">
      <span className="tag">Historical research walkthrough · free in full</span>
      <h3 id="research-sample-title">A migration review notebook for Prisma teams</h3>
      <p>Backend developers handling custom SQL, externally managed tables, or private deployment environments need a reviewable migration plan. A small review tool is a hypothesis worth testing before building another migration engine.</p>
      <p className="research-note">Sources opened and checked 14 October 2026. Original discussions date from 2020–2021. This is an archived teaching example, outside our 90-day freshness bar for new drops. It is not fresh demand, a customer interview, or evidence of payment.</p>
    </div>
    <nav className="sample-jump-links" aria-label="Sample brief sections">
      <a href="#sample-evidence">Evidence</a><a href="#sample-alternatives">Alternatives</a><a href="#sample-scope">MVP scope</a><a href="#sample-validation">Validation</a><a href="#sample-prompt">Build prompt</a>
    </nav>
    <section id="sample-evidence">
      <h4>Three discussions. One platform. Independence unverified.</h4>
      <ol className="sample-source-list">
        <li><a href="https://github.com/prisma/orm/issues/4688" target="_blank" rel="noopener noreferrer">Prisma #4688 · imperative migrations</a><time dateTime="2020-07-01">1 July 2020</time><p>The author asks for an imperative escape hatch for custom indexes and data migrations. This supports investigating review needs around custom SQL.</p></li>
        <li><a href="https://github.com/prisma/orm/issues/4703" target="_blank" rel="noopener noreferrer">Prisma #4703 · programmatic migration commands</a><time dateTime="2020-05-05">5 May 2020</time><p>The author describes SSHing into an EC2 instance to run migrations inside a VPC. This is a concrete workaround, not a measured market cost.</p></li>
        <li><a href="https://github.com/prisma/orm/issues/8864" target="_blank" rel="noopener noreferrer">Prisma #8864 · externally managed tables</a><time dateTime="2021-08-23">23 August 2021</time><p>The author reports drift with dynamic tables in SQL Server and describes a restricted database user workaround. Applicability to PostgreSQL needs separate testing.</p></li>
      </ol>
      <p className="research-note">These are distinct issue URLs with different original authors; they are related workflow requests, not three confirmations of the same product. Cross-posts, overlapping organizations, current pain, and buying authority have not been verified. No engagement count is treated as a buyer count.</p>
    </section>
    <section id="sample-alternatives">
      <h4>Start with the tools that already exist</h4>
      <ul className="brief-list">
        <li><a href="https://www.prisma.io/docs/orm/migrations/editing-a-migration" target="_blank" rel="noopener noreferrer">Prisma custom SQL migrations</a> already support editing generated SQL. Test this documented workflow first.</li>
        <li><a href="https://github.com/salsita/node-pg-migrate" target="_blank" rel="noopener noreferrer">node-pg-migrate</a> offers PostgreSQL migrations from Node.js.</li>
        <li><a href="https://github.com/amacneil/dbmate" target="_blank" rel="noopener noreferrer">dbmate</a> provides a framework-independent SQL migration workflow.</li>
      </ul>
      <p className="research-note">Alternatives checked 14 October 2026. The possible opening is a shared review checklist around an existing tool. We have not established that it beats a Markdown template or that anyone needs another paid product.</p>
    </section>
    <section id="sample-scope">
      <h4>A deliberately small first build</h4>
      <p><strong>Proposed first user:</strong> a backend developer who owns migration reviews for a small Prisma team. The prospective buyer would be the engineering lead; budget and purchase authority remain untested.</p>
      <p><strong>Core loop:</strong> paste an anonymized migration → record table ownership and deployment constraints → review with a teammate → export a Markdown plan.</p>
      <div className="sample-scope-grid"><div><h5>Build first</h5><ul className="brief-list"><li>SQL input and a manual review checklist</li><li>Notes for external tables, environment, and recovery</li><li>Local draft persistence and Markdown export</li></ul></div><div><h5>Leave out</h5><ul className="brief-list"><li>Database credentials or SQL execution</li><li>Automatic rollback or safety certification</li><li>ORM parsers, cloud hosting, billing, and integrations</li></ul></div></div>
      <p><strong>Data:</strong> one local ReviewDraft with migration text, checklist answers, notes, and updatedAt. <strong>API needs:</strong> none for this prototype. Use anonymized SQL; do not upload company secrets. Build effort is unmeasured.</p>
    </section>
    <section id="sample-validation">
      <h4>Validate the review job before writing the engine</h4>
      <p>Ask five consenting Prisma developers who reviewed a migration recently to walk through an anonymized example. Recruit through your own network or communities that permit research requests; issue authors have not agreed to be contacted.</p>
      <ol className="brief-list"><li>Ask what failed or needed review last time, how they handled it, and how much work it caused. Record observed facts separately from opinions.</li><li>Run the checklist manually against their example. Compare it with their existing review process and the alternatives above.</li><li>Ask whether they will try it on their next migration and who could approve a paid pilot. A compliment or hypothetical price answer is not a purchase.</li></ol>
      <p><strong>Continue</strong> if developers voluntarily reuse the checklist on real work and a budget holder agrees to a concrete pilot. <strong>Change direction</strong> if only one narrow review step matters. <strong>Stop</strong> if existing tooling or a shared Markdown template solves the problem. These are proposed decision rules, not test results.</p>
    </section>
    <section><h4>What we would reject</h4><p>The broader “one engine for migrations, rollback, every ORM, and private-network deployments” concept bundles different requests into one large product. We would reject that scope for a first build: the evidence does not establish a common buyer or a need to replace the existing engines. This is editorial judgment about this example, not a fabricated pipeline rejection.</p><Link href="/rejected">Inspect the actual pipeline rejection log →</Link></section>
    <section id="sample-prompt"><h4>Try the scoped prototype</h4><CopyPromptButton label="Codex / Claude Code / Cursor / Windsurf" prompt={prompt} /><p className="research-note">This proposed prompt has not been used to build or validate the migration tool.</p></section>
    <div className="sample-next"><h4>Use the same scrutiny on your next idea</h4><p>Browse the published briefs, save an opportunity to your account, and revisit its current evidence before committing to a build. Builder provides four new brief unlocks per calendar month; previously unlocked briefs remain available.</p><Link className="btn btn-primary" href="/feed">Find an opportunity to investigate</Link> <a href="#pricing">Compare plans</a></div>
  </article>;
}
