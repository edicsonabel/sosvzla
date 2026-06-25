import Link from 'next/link';

export default function Home() {
  return (
    <>
      <div className="reveal">
        <span className="kicker">● Respuesta de emergencia</span>
      </div>
      <h1 className="reveal">
        Cuando cada minuto cuenta,<br />
        la ayuda llega más rápido.
      </h1>
      <p className="lead reveal">
        Reporta una emergencia con tu ubicación, encuentra a tus seres queridos
        y coordina el rescate. Funciona aunque la señal sea débil.
      </p>

      <div className="reveal" style={{ marginTop: '1.25rem' }}>
        <Link href="/sos" className="btn btn-sos">
          🆘 Pedir ayuda ahora
        </Link>
      </div>

      <div className="grid-acciones">
        <Link href="/mapa" className="card reveal">
          <div className="emoji">🗺️</div>
          <h3>Mapa de SOS</h3>
          <p>Voluntarios y rescatistas ven dónde se necesita ayuda, en vivo.</p>
        </Link>
        <Link href="/buscar" className="card reveal">
          <div className="emoji">🔎</div>
          <h3>Buscar personas</h3>
          <p>Busca o reporta a alguien desaparecido tras el sismo.</p>
        </Link>
        <Link href="/estoy-bien" className="card reveal">
          <div className="emoji">✅</div>
          <h3>Estoy bien</h3>
          <p>Avisa a tu familia que estás a salvo en segundos.</p>
        </Link>
        <Link href="/sos" className="card reveal">
          <div className="emoji">📍</div>
          <h3>Reportar SOS</h3>
          <p>Médico, rescate, atrapado, agua o comida.</p>
        </Link>
      </div>
    </>
  );
}
