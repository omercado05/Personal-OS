import Link from "next/link";

import KnowledgeForm from "@/components/knowledge/KnowledgeForm";

export default function NewKnowledgePage() {
  return (
    <div className="panel">
      <header className="panel__header">
        <div>
          <p className="eyebrow">Knowledge</p>
          <h1>Nueva entrada</h1>
        </div>
        <Link className="link-button ghost" href="/knowledge">
          ← Volver
        </Link>
      </header>
      <KnowledgeForm mode="create" />
    </div>
  );
}
