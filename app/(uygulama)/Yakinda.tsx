"use client";

// Menüdeki bölümlerin yer tutucusu. Her biri sırayla gerçek ekrana dönüşecek.
import Link from "next/link";
import Kabuk from "./Kabuk";

export default function Yakinda({
  baslik,
  aciklama,
  ikon,
}: {
  baslik: string;
  aciklama: string;
  ikon: string;
}) {
  return (
    <Kabuk>
      <div style={{ textAlign: "center", padding: "60px 20px" }}>
        <div style={{ fontSize: 56, marginBottom: 10 }}>{ikon}</div>
        <h1 style={{ fontSize: 24, marginBottom: 8 }}>{baslik}</h1>
        <p className="bk-soluk" style={{ maxWidth: 420, margin: "0 auto 24px" }}>{aciklama}</p>
        <Link className="bk-dugme" href="/">Ana ekrana dön</Link>
      </div>
    </Kabuk>
  );
}
