/** Tela provisória das abas que chegam nos próximos dias do roadmap. */
export function EmConstrucao({ titulo, dia }: { titulo: string; dia: number }) {
  return (
    <>
      <h1 className="title">{titulo}</h1>
      <div className="empty">
        <b>Em construção</b>
        Esta tela chega no Dia {dia} do projeto.
      </div>
    </>
  );
}
