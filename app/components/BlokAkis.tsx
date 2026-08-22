"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

/* ————————————————————————————————————————————————————————————
   AKAN BLOKLAR — yalnız bu bölümün arka planı

   Küp katmanları kameranın yanından geçip gidiyor. Kamera yığının
   İÇİNDE duruyor; bloklar onu geçip kadrajın kenarlarından çıkıyor,
   döngünün başa sarması da kameranın arkasında oluyor — bu yüzden
   hiç yeniden başlıyormuş gibi görünmüyor.

   Ayıklama (hangi hücre duracak) rastgele değil, ızgara üzerinde bir
   GÜRÜLTÜ ALANI. Komşular birbiriyle uyuşuyor, blokla yüz yüze geliyor
   ve havada tek tek asılı kalmak yerine duvar kuruyorlar.

   ⚠️ MALİYET. Bu sayfadaki tek WebGL parçası ve tek ağır bağımlılık.
   Üç sıkı kısıt konuldu:
   ① Yalnız bölüm ekrandayken çiziyor — dışarıdayken rAF hiç dönmüyor.
   ② prefers-reduced-motion açıksa hiç kurulmuyor.
   ③ WebGL yoksa sessizce boş kalıyor, sayfa çalışmaya devam ediyor.
   ———————————————————————————————————————————————————————————— */

/** Site paletine göre. Yakın blok görünür, uzak blok arka plana karışır. */
const YAKIN = "#3A4E9E";
const UZAK = "#0C1A3F";
const KENAR = "#5F79C4";

const IZGARA = 17;
const KATMAN = 13;
const BLOK = 0.72;      // hücre boyu = blok boyu (aralarında boşluk yok)
const ARALIK = 2.6;     // katmanlar arası mesafe = bir vuruşta kat edilen yol
const YOGUNLUK = 0.5;   // hücrelerin kaçta kaçı hayatta kalır
const KUME = 0.85;      // gürültü sıklığı: düşük = geniş kıtalar
const BOS_ORTA = 3;     // ortada boş bırakılan koridorun yarıçapı, hücre
const HIZ = 0.9;        // saniyede kaç katman

const VERTEX = /* glsl */ `
  attribute float aHucre;
  attribute float aKatman;
  uniform float uZaman, uIzgara, uBlok, uAralik, uYogunluk, uKume, uBosOrta, uKatman;
  varying float vDerin, vYasiyor;
  varying vec3 vNormal;
  varying vec2 vYuz;

  float karma(vec2 p) {
    p = fract(p * vec2(127.1, 311.7));
    p += dot(p, p + 34.56);
    return fract(p.x * p.y * 95.43);
  }
  /* Değer gürültüsü. Hücre başına bağımsız zar atılsa hayatta kalanlar
     dağınık olur ve hiçbiri diğerine değmez; yumuşak alan komşuları
     uzlaştırıyor, bloklar yüz yüze geliyor. */
  float gurultu(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(karma(i), karma(i + vec2(1.0,0.0)), u.x),
               mix(karma(i + vec2(0.0,1.0)), karma(i + vec2(1.0,1.0)), u.x), u.y);
  }

  void main() {
    float cx = mod(aHucre, uIzgara);
    float cy = floor(aHucre / uIzgara);
    // "half" YAZILAMAZ — GLSL'de ayrılmış sözcük, gölgelendirici hiç
    // derlenmez ve sonuç bozuk değil TAMAMEN BOŞ bir tuval olur.
    float orta = (uIzgara - 1.0) * 0.5;
    vec2 hucre = vec2(cx, cy) - orta;

    /* Yığın vuruş başına tam bir aralık kayıyor, gürültü tohumu da tam
       bir artıyor — komşusunun yerine varan katman onun desenini de
       devralıyor, yürüyüş hiç başa sarmış gibi görünmüyor. */
    float vurus = floor(uZaman);
    float f = fract(uZaman);
    float derin = aKatman + 1.0 - f;

    float tohum = vurus + aKatman;
    float n = gurultu(vec2(cx, cy) * uKume + tohum * 19.3);
    float yasiyor = step(n, uYogunluk);

    /* Ortadaki koridor. Kamera bu eksende uçuyor; burada kalan blok
       "blok" gibi görünmez, kadrajı doldurup yakın düzlemden geçer.
       Kare kafes olduğu için dairesel test köşe hücrelerini bırakıyor —
       halka indeksiyle ölçülüyor. */
    float halka = max(abs(hucre.x), abs(hucre.y));
    yasiyor *= step(uBosOrta + 0.5, halka);

    float dn = derin / max(1.0, uKatman);
    // En uzakta birkaç piksellik olduğu için "belirme" değil "sisten
    // çıkma" gibi okunuyor.
    float buyu = smoothstep(1.0, 0.84, dn);

    vec3 p = position * uBlok * yasiyor * buyu;
    p.xy += hucre * uBlok;
    // Kamera yığının İÇİNDE, sarmanın olduğu yerin bir aralık önünde.
    p.z += uAralik - derin * uAralik;

    vNormal = normalize(normalMatrix * normal);
    vDerin = clamp(dn, 0.0, 1.0);
    vYasiyor = yasiyor;
    vYuz = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const FRAGMENT = /* glsl */ `
  uniform vec3 uYakin, uUzak, uKenar;
  varying float vDerin, vYasiyor;
  varying vec3 vNormal;
  varying vec2 vYuz;

  void main() {
    if (vYasiyor < 0.5) discard;
    vec3 col = mix(uYakin, uUzak, pow(vDerin, 0.85));
    // Yüz gölgesi: aynı katmandaki iki komşu tek bir şekle kaynaşmasın.
    float yuz = 0.5 + 0.5 * dot(normalize(vNormal), normalize(vec3(-0.4, 0.55, 0.75)));
    col *= 0.82 + 0.36 * yuz;
    // Dikişler — bloklar bitişik durduğu için levhanın kaç küpten
    // oluştuğunu yalnız bu gösteriyor.
    float e = min(min(vYuz.x, 1.0 - vYuz.x), min(vYuz.y, 1.0 - vYuz.y));
    float aa = max(fwidth(e), 0.0001);
    float sinir = 1.0 - smoothstep(0.014 - aa, 0.014 + aa, e);
    col = mix(col, uKenar, sinir * (1.0 - vDerin * 0.7));
    gl_FragColor = vec4(max(col, 0.0), 1.0);
  }
`;

export default function BlokAkis() {
  const kapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const kap = kapRef.current;
    if (!kap) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let cizici: THREE.WebGLRenderer;
    try {
      cizici = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      return; // WebGL yok — bölüm düz lacivert kalır, sayfa çalışır.
    }
    cizici.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    cizici.setClearColor(0x000000, 0);
    const tuval = cizici.domElement;
    tuval.style.cssText = "position:absolute;inset:0;width:100%;height:100%";
    kap.appendChild(tuval);

    const sahne = new THREE.Scene();
    const kamera = new THREE.PerspectiveCamera(62, 1, 0.02, ARALIK * (KATMAN + 2));

    const hucreSayisi = IZGARA * IZGARA;
    const adet = hucreSayisi * KATMAN;
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const hucre = new Float32Array(adet);
    const katman = new Float32Array(adet);
    for (let i = 0, l = 0; l < KATMAN; l++)
      for (let c = 0; c < hucreSayisi; c++, i++) { hucre[i] = c; katman[i] = l; }
    geo.setAttribute("aHucre", new THREE.InstancedBufferAttribute(hucre, 1));
    geo.setAttribute("aKatman", new THREE.InstancedBufferAttribute(katman, 1));

    const malzeme = new THREE.ShaderMaterial({
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      uniforms: {
        uZaman: { value: 0 }, uIzgara: { value: IZGARA }, uBlok: { value: BLOK },
        uAralik: { value: ARALIK }, uYogunluk: { value: YOGUNLUK },
        uKume: { value: KUME }, uBosOrta: { value: BOS_ORTA }, uKatman: { value: KATMAN },
        uYakin: { value: new THREE.Color(YAKIN) },
        uUzak: { value: new THREE.Color(UZAK) },
        uKenar: { value: new THREE.Color(KENAR) },
      },
    });

    const ag = new THREE.InstancedMesh(geo, malzeme, adet);
    // Yerleştirmenin tamamı gölgelendiricide, ama matris tamponu sıfır
    // dolu başlıyor ve sıfır matris her kutuyu çökertiyor — bir kez birim
    // matrisle yazılıyor.
    const birim = new THREE.Matrix4();
    for (let i = 0; i < adet; i++) ag.setMatrixAt(i, birim);
    ag.instanceMatrix.needsUpdate = true;
    ag.frustumCulled = false;
    sahne.add(ag);

    const boyutla = () => {
      const g = kap.clientWidth || 1, y = kap.clientHeight || 1;
      cizici.setSize(g, y, false);
      kamera.aspect = g / y;
      kamera.fov = g / y < 1 ? 78 : 62;
      kamera.position.set(0, 0, 0);
      kamera.lookAt(0, 0, -1);
      kamera.updateProjectionMatrix();
    };
    boyutla();
    const ro = new ResizeObserver(boyutla);
    ro.observe(kap);

    let zaman = 0, son = performance.now(), raf = 0, gorunur = false;
    const kare = () => {
      raf = gorunur ? requestAnimationFrame(kare) : 0;
      const simdi = performance.now();
      let dt = (simdi - son) / 1000;
      son = simdi;
      // Sekme arkaya atılıp dönünce dev bir fark gelir ve her şey ışınlanır.
      if (!Number.isFinite(dt) || dt < 0) dt = 0;
      if (dt > 0.05) dt = 0.05;
      zaman += dt * HIZ;
      malzeme.uniforms.uZaman.value = zaman;
      cizici.render(sahne, kamera);
    };

    /* Bölüm ekranda değilken TEK KARE bile çizilmiyor. Kaynak bileşen
       sayfa açık olduğu sürece durmadan çiziyordu; bu sayfada WebGL'i
       ödeyen tek bölüm burası, bedeli de yalnız burada ödenmeli. */
    const gozlemci = new IntersectionObserver(
      ([g]) => {
        gorunur = g.isIntersecting;
        if (gorunur && !raf) { son = performance.now(); raf = requestAnimationFrame(kare); }
      },
      { rootMargin: "10% 0px" }
    );
    gozlemci.observe(kap);

    return () => {
      gozlemci.disconnect();
      ro.disconnect();
      cancelAnimationFrame(raf);
      ag.dispose(); geo.dispose(); malzeme.dispose(); cizici.dispose();
      if (tuval.parentNode === kap) kap.removeChild(tuval);
    };
  }, []);

  return <div ref={kapRef} aria-hidden="true" className="blok-akis" />;
}
