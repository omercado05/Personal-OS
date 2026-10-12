import Link from "next/link";

import ProjectForm from "@/components/projects/ProjectForm";

export default function NewProjectPage() {
  return (
    <div className="panel">
      <header className="panel__header">
        <div>
          <p className="eyebrow">Projects</p>
          <h1>Nuevo proyecto</h1>
        </div>
        <Link className="link-button ghost" href="/projects">
          ← Volver
        </Link>
      </header>
      <ProjectForm mode="create" />
    </div>
  );
}
