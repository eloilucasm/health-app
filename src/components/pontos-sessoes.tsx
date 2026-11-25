/** Um ponto por sessão do pacote, como a "coluna" do protótipo. */
export function PontosSessoes({ usadas, total }: { usadas: number; total: number }) {
  return (
    <span className="spine" role="img" aria-label={`${Math.min(usadas, total)} de ${total} sessões usadas`}>
      {Array.from({ length: total }, (_, i) => (
        <i key={i} className={i < usadas ? "used" : undefined} />
      ))}
    </span>
  );
}
