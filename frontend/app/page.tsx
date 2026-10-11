export default function HomePage() {
  return (
    <main className="page">
      <section className="card">
        <p className="eyebrow">Fase 1 · Bootstrap</p>
        <h1>Personal OS</h1>
        <p className="lead">
          Centro privado para proyectos, conocimiento e ideas. El shell de la aplicación, la
          autenticación y los módulos se construirán en las siguientes fases.
        </p>
        <ul className="status">
          <li>
            <span className="dot ok" /> Frontend operativo
          </li>
          <li>
            <span className="dot ok" /> Backend con <code>/api/v1/health</code>
          </li>
          <li>
            <span className="dot pending" /> Autenticación y módulos (próximas fases)
          </li>
        </ul>
      </section>
    </main>
  );
}
