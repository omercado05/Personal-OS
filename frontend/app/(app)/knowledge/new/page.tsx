import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import KnowledgeForm from "@/components/knowledge/KnowledgeForm";

export default function NewKnowledgePage() {
  return (
    <div className="panel">
      <Link className="breadcrumb" href="/knowledge">
        <ArrowLeft size={14} aria-hidden="true" />
        Knowledge
      </Link>
      <header className="panel__header">
        <div>
          <p className="eyebrow">Conocimiento</p>
          <h1>Nueva entrada</h1>
        </div>
      </header>
      <KnowledgeForm mode="create" />
    </div>
  );
}
