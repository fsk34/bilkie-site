// 19 Eyl 2026: dersin defter listesi /ders/[ders] ile birleşti (aynı sayfada Konu Defteri | Quiz
// hapları). /defter/[ders]/[unite] (okuma ekranı) olduğu gibi duruyor.
import { redirect } from "next/navigation";

export default async function DefterDersiYonlendir({ params }: { params: Promise<{ ders: string }> }) {
  const { ders } = await params;
  redirect(`/ders/${ders}`);
}
