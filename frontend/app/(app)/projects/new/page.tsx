import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import ProjectForm from "@/components/projects/ProjectForm";

export default function NewProjectPage() {
  return (
    <div className="panel">
      <Link className="breadcrumb" href="/projects">
        <ArrowLeft size={14} aria-hidden="true" />
        Projects
      </Link>
      <header className="panel__header">
        <div>
          <p className="eyebrow">Proyectos</p>
          <h1>Nuevo proyecto</h1>
        </div>
      </header>
      <ProjectForm mode="create" />
    </div>
  );
}
