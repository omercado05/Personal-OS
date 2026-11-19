import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import KnowledgeForm from "@/components/knowledge/KnowledgeForm";

export default function NewKnowledgePage() {
  return (
    <div className="panel">
      <header className="detail-head glass">
        <Link className="breadcrumb" href="/knowledge">
          <ArrowLeft size={14} aria-hidden="true" />
          Knowledge
        </Link>
        <div className="detail-head__row">
          <div>
            <p className="eyebrow">Conocimiento</p>
            <h1>Nueva entrada</h1>
          </div>
        </div>
      </header>
      <KnowledgeForm mode="create" />
    </div>
  );
}
