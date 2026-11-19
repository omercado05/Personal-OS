import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import ProjectForm from "@/components/projects/ProjectForm";

export default function NewProjectPage() {
  return (
    <div className="panel">
      <header className="detail-head glass">
        <Link className="breadcrumb" href="/projects">
          <ArrowLeft size={14} aria-hidden="true" />
          Projects
        </Link>
        <div className="detail-head__row">
          <div>
            <p className="eyebrow">Proyectos</p>
            <h1>Nuevo proyecto</h1>
          </div>
        </div>
      </header>
      <ProjectForm mode="create" />
    </div>
  );
}
