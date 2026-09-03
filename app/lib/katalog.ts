// Android: CatalogData.kt / iOS: CatalogData.swift — otomatik dönüştürüldü.
// Konu başlıklarındaki [tN] eki testin Firebase anahtarıdır (tests/grade{N}/{ders}/{tN}).

export type Unite = {
  key: string;
  title: string;
  topics: string[];
  defterKey?: string;
  quizKey?: string;
};

export const KATALOG: Record<number, Record<string, Unite[]>> = 
{
  "3": {
    "turkce": [
      {
        "key": "u1_okuma",
        "title": "OKUMA",
        "topics": [
          "Metnin Konusu [t1]",
          "Ana Fikir / Ana Duygu [t2]",
          "Ne, Kim, Nerede, Nasıl? [t3]",
          "Başlık Belirleme [t4]",
          "Görsel Okuma [t5]",
          "Metinle İlgili Sorular [t6]",
          "Hikâye Unsurları [t7]",
          "Metin Türleri [t8]",
          "Gerçek ve Hayal Unsurları [t9]"
        ],
        "defterKey": "u1"
      },
      {
        "key": "u2_yazma",
        "title": "YAZMA",
        "topics": [
          "Olayların Oluş Sırası [t10]",
          "Büyük Harflerin Kullanımı [t11]",
          "Noktalama İşaretleri [t12]"
        ],
        "defterKey": "u2"
      },
      {
        "key": "u3_sozvarligi",
        "title": "SÖZ VARLIĞI",
        "topics": [
          "Varlıkları Niteleyen Sözcükler (Sıfatlar) [t13]",
          "Sözcüğün Anlamı [t14]",
          "Eş / Zıt / Eş Sesli Sözcükler [t15]",
          "Yabancı Sözcüklerin Yerine Türkçeleri [t16]"
        ],
        "defterKey": "u3"
      },
      {
        "key": "u4_ekkonular",
        "title": "EK KONULAR",
        "topics": [
          "Cümle Çeşitleri [t17]",
          "Adlar (İsimler) [t18]",
          "Zamirler [t19]",
          "Bağlaçlar [t20]",
          "Eylemler ve Zamanları [t21]"
        ],
        "defterKey": "u4"
      }
    ],
    "matematik": [
      {
        "key": "u1",
        "title": "Ünite 1 – Doğal Sayılarla Çıkarma İşlemi",
        "topics": [
          "Sayıları Okuyup Yazma [t1]",
          "Ritmik Sayma [t2]",
          "Basamak Adları ve Değerleri [t3]",
          "Yuvarlama [t4]",
          "Karşılaştırma ve Sıralama [t5]",
          "Sayı Örüntüleri [t6]",
          "Tek ve Çift Sayılar [t7]",
          "Romen Rakamları [t8]",
          "Toplama ve Çıkarma İşlemleri [t9]"
        ]
      },
      {
        "key": "u2",
        "title": "Ünite 2 – Veri Toplama ve Değerlendirme",
        "topics": [
          "Toplam Tahmini [t10]",
          "Zihinden Toplama [t11]",
          "Problem Çözme [t12]",
          "Veri Toplama, Tablolar, Veri Problemleri [t13]"
        ]
      },
      {
        "key": "u3",
        "title": "Ünite 3 – Doğal Sayılarla Bölme İşlemi",
        "topics": [
          "Kat ve Çarpım Tablosu [t14]",
          "Çarpma ve Kısa Yoldan Çarpma [t15]",
          "Bölme İşlemi ve Kısa Yoldan Bölme [t16]",
          "Bölünen, Bölen, Bölüm, Kalan [t17]",
          "Bölme Problemleri [t18]"
        ]
      },
      {
        "key": "u4",
        "title": "Ünite 4 – Tartma ve Zaman Ölçme",
        "topics": [
          "Bütün, Yarım, Çeyrek [t19]",
          "Kesirler [t20]",
          "Birim Kesir [t21]",
          "Saatler, Olay Süreleri [t22]",
          "Lira–Kuruş, Kütle (g–kg) [t23]"
        ]
      },
      {
        "key": "u5",
        "title": "Ünite 5 – Geometride Temel Kavramlar",
        "topics": [
          "Geometrik Cisim ve Şekiller [t24]",
          "Kare, Dikdörtgen, Üçgen [t25]",
          "Nokta, Doğru, Işın, Açı [t26]",
          "Simetri [t27]"
        ]
      },
      {
        "key": "u6",
        "title": "Ünite 6 – Sıvı ve Alan Ölçme",
        "topics": [
          "Metre–Santimetre–Kilometre [t28]",
          "Çevre Uzunluğu ve Problemleri [t29]",
          "Alan Ölçme [t30]",
          "Litre ve Litre Problemleri [t31]"
        ]
      }
    ],
    "sosyal": [
      {
        "key": "u1",
        "title": "Okulumuzda Hayat",
        "topics": [
          "Güçlü ve Zayıf Yönlerim [t1]",
          "Doğru Davranışlar [t2]",
          "Arkadaşlardan Etkilenmek [t3]",
          "Sosyal Yardımlaşma ve Dayanışma [t4]",
          "Demokratik Çözümler [t5]",
          "Okul Kaynaklarını Kullanma [t6]",
          "Meslekler [t7]"
        ]
      },
      {
        "key": "u2",
        "title": "Evimizde Hayat",
        "topics": [
          "Çocukluk Dönemleri [t8]",
          "Komşuluk İlişkileri [t9]",
          "Evimizin Krokisi [t10]",
          "Evde Sorumluluklarım [t11]",
          "Kullandığımız Aletler ve Teknolojik Ürünler [t12]",
          "Kaynakları Verimli Kullanma [t13]",
          "Planlı Olmak [t14]",
          "İstek ve İhtiyaçlar [t15]"
        ]
      },
      {
        "key": "u3",
        "title": "Sağlıklı Hayat",
        "topics": [
          "Kişisel Bakım [t16]",
          "Bilinçli Tüketim [t17]",
          "Mevsimsel Beslenme [t18]",
          "Dengeli Beslenme [t19]",
          "Temizlik ve Hijyen [t20]"
        ]
      },
      {
        "key": "u4",
        "title": "Güvenli Hayat",
        "topics": [
          "Trafik İşaretleri [t21]",
          "Trafik Kuralları [t22]",
          "Dikkatli Olmak [t23]",
          "Acil Durumlar ve Yardım [t24]",
          "Oyun Alanlarındaki Araçlar [t25]"
        ]
      },
      {
        "key": "u5",
        "title": "Ülkemizde Hayat",
        "topics": [
          "Yönetim Birimleri [t26]",
          "Tarihî ve Turistik Yerler [t27]",
          "Ortak Kullanım Alanları [t28]",
          "Millî Birlik ve Beraberlik [t29]",
          "Farklı Kültürler [t30]",
          "Atatürk'ün Kişilik Özellikleri [t31]",
          "Ülkemize Katkı Sağlayan Kişiler [t32]"
        ]
      },
      {
        "key": "u6",
        "title": "Doğada Hayat",
        "topics": [
          "Bitkiler ve Hayvanlar [t33]",
          "Meyve ve Sebzeler [t34]",
          "Yönler [t35]",
          "Doğa ve Çevre [t36]",
          "Geri Dönüşüm [t37]"
        ]
      }
    ],
    "ingilizce": [
      {
        "key": "u1",
        "title": "Greeting",
        "topics": [
          "Greetings [t1]",
          "Introducing Oneself [t2]",
          "Numbers [t3]"
        ]
      },
      {
        "key": "u2",
        "title": "My Family",
        "topics": [
          "Family Members [t4]",
          "Who is This? [t5]",
          "Possessive Pronouns [t6]"
        ]
      },
      {
        "key": "u3",
        "title": "People I Love",
        "topics": [
          "Adjectives [t7]",
          "Can / Can't [t8]"
        ]
      },
      {
        "key": "u4",
        "title": "Feelings",
        "topics": [
          "Feelings [t9]",
          "Suggestions (Let's …) [t10]"
        ]
      },
      {
        "key": "u5",
        "title": "Toys and Games",
        "topics": [
          "Numbers 1–20 [t11]",
          "Colors [t12]",
          "Have/Has got [t13]"
        ]
      },
      {
        "key": "u6",
        "title": "My House",
        "topics": [
          "Rooms [t14]",
          "Prepositions [t15]",
          "Shapes [t16]",
          "Have got/Has got [t17]"
        ]
      },
      {
        "key": "u7",
        "title": "In My City",
        "topics": [
          "Places [t18]",
          "Directions [t19]",
          "Apologizing [t20]"
        ]
      },
      {
        "key": "u8",
        "title": "Transportation",
        "topics": [
          "Vehicles [t21]",
          "How can I get to …? [t22]"
        ]
      },
      {
        "key": "u9",
        "title": "Weather",
        "topics": [
          "Weather Descriptions [t23]",
          "How is the Weather in …? [t24]"
        ]
      },
      {
        "key": "u10",
        "title": "Nature",
        "topics": [
          "Animals [t25]",
          "Colors [t26]",
          "Likes/Dislikes [t27]"
        ]
      }
    ],
    "fen": [
      {
        "key": "u1",
        "title": "Gezegenimizi Tanıyalım",
        "topics": [
          "Dünya'nın Şekli ve Hareketi [t1]",
          "Gece–Gündüz ve Mevsimler [t2]"
        ]
      },
      {
        "key": "u2",
        "title": "Beş Duyumuz",
        "topics": [
          "Görme Duyusu ve Göz Sağlığı [t3]",
          "İşitme Duyusu ve Kulak Sağlığı [t4]",
          "Koku ve Tat Alma [t5]",
          "Dokunma Duyusu [t6]",
          "Duyu Organlarının Sağlığı [t7]"
        ]
      },
      {
        "key": "u3",
        "title": "Kuvveti Tanıyalım",
        "topics": [
          "Hareket Çeşitleri (Hızlı–Yavaş) [t8]",
          "İtme ve Çekme Kuvveti [t9]",
          "Sürtünme Kuvveti ve Etkileri [t10]",
          "Günlük Hayatta Kuvvet [t11]"
        ]
      },
      {
        "key": "u4",
        "title": "Maddeyi Tanıyalım",
        "topics": [
          "Maddenin Hâlleri [t12]",
          "Hâl Değişimleri [t13]",
          "Güvenli Madde Kullanımı [t14]"
        ]
      },
      {
        "key": "u5",
        "title": "Işık ve Sesler",
        "topics": [
          "Işık Kaynakları [t15]",
          "Aydınlık–Karanlık ve Gölge [t16]",
          "Ses Kaynakları ve Sesin Şiddeti [t17]",
          "Gürültü ve Korunma [t18]"
        ]
      },
      {
        "key": "u6",
        "title": "Canlılar Dünyasına Yolculuk",
        "topics": [
          "Bitkilerin Bölümleri ve Görevleri [t19]",
          "Hayvanlar ve Yaşam Alanları [t20]",
          "İnsan ve Çevre İlişkisi [t21]",
          "Temizlik ve Sağlıklı Yaşam [t22]"
        ]
      },
      {
        "key": "u7",
        "title": "Elektrikli Araçlar",
        "topics": [
          "Basit Elektrik Devresi ve Bileşenleri [t23]",
          "Piller ve Güvenli Kullanım [t24]",
          "Elektriğin Tasarruflu Kullanımı [t25]"
        ]
      }
    ]
  },
  "4": {
    "turkce": [
      {
        "key": "u_okuma",
        "title": "Okuma",
        "topics": [
          "Metnin Konusu [t1]",
          "Ana Fikir / Ana Duygu [t2]",
          "5N 1K [t3]",
          "Başlık Belirleme [t4]",
          "Görsel Okuma [t5]",
          "Metinle İlgili Sorular [t6]",
          "Hikâye Unsurları [t7]",
          "Metin Türleri [t8]",
          "Metnin Bölümleri [t9]",
          "Gerçek ve Hayal Unsurları [t10]",
          "Karşılaştırma [t11]",
          "Neden-Sonuç [t12]",
          "Benzetme [t13]",
          "Örneklendirme [t14]"
        ],
        "defterKey": "u1",
        "quizKey": "u1_okuma"
      },
      {
        "key": "u_yazma",
        "title": "Yazma",
        "topics": [
          "Olayların Oluş Sırası [t15]",
          "Büyük Harflerin Kullanımı [t16]",
          "Kısaltmaların Yazımı [t17]",
          "Sayıların Yazımı / Romen [t18]",
          "'de' ve 'ki' [t19]",
          "Pekiştirmeli Sözcükler [t20]",
          "Noktalama İşaretleri [t21]"
        ],
        "defterKey": "u2",
        "quizKey": "u2_yazma"
      },
      {
        "key": "u_soz",
        "title": "Söz Varlığı",
        "topics": [
          "Eş / Zıt / Eş Sesli [t22]",
          "Gerçek–Mecaz–Terim [t23]",
          "Sözcük Gruplarının Anlamı [t24]",
          "Yabancı Sözcüklerin Yerine Türkçeleri [t25]",
          "Deyimler ve Atasözleri [t26]"
        ],
        "defterKey": "u3",
        "quizKey": "u3_sozvarligi"
      },
      {
        "key": "u_ek",
        "title": "Ek Konular",
        "topics": [
          "Çekim–Yapım Ekleri [t27]",
          "Cümle Çeşitleri [t28]",
          "Adlar [t29]",
          "Sıfatlar [t30]",
          "Zamirler [t31]",
          "Bağlaçlar [t32]",
          "Zarflar [t33]",
          "Eylemler ve Zamanları [t34]",
          "Ses Olayları [t35]"
        ],
        "defterKey": "u4",
        "quizKey": "u4_dilbilgisi"
      },
      {
        "key": "u_temalar",
        "title": "Temalar",
        "topics": [
          "Erdemler [t36]",
          "Millî Mücadele ve Atatürk [t37]",
          "Doğa ve Evren [t38]",
          "Okuma Kültürü [t39]",
          "Kişisel Gelişim [t40]",
          "Bilim ve Teknoloji [t41]",
          "Millî Kültürümüz [t42]",
          "Vatandaşlık [t43]"
        ],
        "defterKey": "u5"
      }
    ],
    "matematik": [
      {
        "key": "u1",
        "title": "Doğal Sayılarla İşlemler",
        "topics": [
          "Doğal Sayılar [t1]",
          "Bölük–Basamak–Çözümleme [t2]",
          "Yuvarlama–Sıralama–Örüntüler [t3]",
          "Toplama–Çıkarma [t4]",
          "Zihinden İşlemler [t5]"
        ]
      },
      {
        "key": "u2",
        "title": "Toplama ve Çıkarma Problemleri",
        "topics": [
          "Tahmin ve Zihinden İşlem [t6]",
          "Problem Çözme [t7]"
        ]
      },
      {
        "key": "u3",
        "title": "Çarpma ve Bölme",
        "topics": [
          "Çarpma [t8]",
          "Tahmin–Zihinden Çarpma [t9]",
          "Çarpma–Bölme İlişkisi [t10]",
          "Bölme: Bölünen–Bölen–Kalan [t11]",
          "Problemler [t12]"
        ]
      },
      {
        "key": "u4",
        "title": "Kesirler ve Veri",
        "topics": [
          "Basit–Bileşik–Tam Sayılı [t13]",
          "Birim Kesir–Karşılaştırma [t14]",
          "Kesirlerle Toplama/Çıkarma [t15]",
          "Zaman Ölçme [t16]",
          "Sütun Grafiği [t17]"
        ]
      },
      {
        "key": "u5",
        "title": "Geometri ve Uzunluk",
        "topics": [
          "Üçgen–Kare–Dikdörtgen [t18]",
          "Açı–Simetri [t19]",
          "Uzunluk Ölçme [t20]"
        ]
      },
      {
        "key": "u6",
        "title": "Alan, Kütle, Sıvı Ölçme",
        "topics": [
          "Çevre Uzunluğu [t21]",
          "Alan Ölçme [t22]",
          "Kütle Birimleri [t23]",
          "Sıvı Ölçme [t24]"
        ]
      }
    ],
    "sosyal": [
      {
        "key": "u1",
        "title": "Birey ve Toplum",
        "topics": [
          "Resmî Kimlik [t1]",
          "Kronolojik Sıralama [t2]",
          "İlgi–İhtiyaç–Yetenek [t3]",
          "Farklılıklarımız [t4]"
        ]
      },
      {
        "key": "u2",
        "title": "Kültür ve Miras",
        "topics": [
          "Aile Tarihi [t5]",
          "Millî Kültür [t6]",
          "Geleneksel Oyunlar [t7]",
          "Millî Mücadele [t8]"
        ]
      },
      {
        "key": "u3",
        "title": "İnsanlar, Yerler ve Çevreler",
        "topics": [
          "Kroki [t9]",
          "Doğal–Beşerî Unsurlar [t10]",
          "Hava Olayları [t11]",
          "Coğrafi Özellikler [t12]",
          "Doğal Afetler [t13]"
        ]
      },
      {
        "key": "u4",
        "title": "Bilim, Teknoloji ve Toplum",
        "topics": [
          "Teknolojik Ürünler [t14]",
          "Mucitler [t15]",
          "Teknoloji Kullanımı [t16]"
        ]
      },
      {
        "key": "u5",
        "title": "Üretim, Dağıtım ve Tüketim",
        "topics": [
          "İstek–İhtiyaçlar [t17]",
          "Ekonomik Faaliyetler [t18]",
          "Bilinçli Tüketici [t19]"
        ]
      },
      {
        "key": "u6",
        "title": "Etkin Vatandaşlık",
        "topics": [
          "Çocuk Hakları [t20]",
          "Sorumluluklar [t21]",
          "Sosyal Kulüpler [t22]"
        ]
      },
      {
        "key": "u7",
        "title": "Küresel Bağlantılar",
        "topics": [
          "Ülkeler [t23]",
          "Komşular [t24]",
          "Türk Cumhuriyetleri [t25]",
          "Kültürel Unsurlar [t26]"
        ]
      }
    ],
    "ingilizce": [
      {
        "key": "u1",
        "title": "Classroom Rules",
        "topics": [
          "Numbers 1-50 [t1]",
          "Can I / May I? [t2]",
          "Imperatives [t3]"
        ]
      },
      {
        "key": "u2",
        "title": "Nationality",
        "topics": [
          "Countries and Nationalities [t4]",
          "Where are you from? [t5]",
          "Where is …? [t6]"
        ]
      },
      {
        "key": "u3",
        "title": "Cartoon Characters",
        "topics": [
          "Can / Can't [t7]",
          "Possessive Adjectives [t8]"
        ]
      },
      {
        "key": "u4",
        "title": "Free Time",
        "topics": [
          "Like / Dislike [t9]",
          "Do you like …? [t10]",
          "Asking for Clarification [t11]"
        ]
      },
      {
        "key": "u5",
        "title": "My Day",
        "topics": [
          "Daily Routines [t12]",
          "Time and Days [t13]"
        ]
      },
      {
        "key": "u6",
        "title": "Fun with Science",
        "topics": [
          "Vocabulary, Imperatives [t14]",
          "Prepositions, Simple Questions [t15]"
        ]
      },
      {
        "key": "u7",
        "title": "Jobs",
        "topics": [
          "Occupations [t16]",
          "Where do you work? [t17]"
        ]
      },
      {
        "key": "u8",
        "title": "My Clothes",
        "topics": [
          "Clothes, Weather, Seasons [t18]",
          "Needs and Requests [t19]"
        ]
      },
      {
        "key": "u9",
        "title": "My Friends",
        "topics": [
          "Describing People [t20]",
          "Have got / Has got [t21]"
        ]
      },
      {
        "key": "u10",
        "title": "Food and Drinks",
        "topics": [
          "Offers / Requests [t22]",
          "Foods, Feelings [t23]",
          "Are you hungry? [t24]"
        ]
      }
    ],
    "fen": [
      {
        "key": "u1",
        "title": "Yer Kabuğu ve Dünya'nın Hareketleri",
        "topics": [
          "Yer Kabuğu [t1]",
          "Dünya'nın Hareketleri [t2]"
        ]
      },
      {
        "key": "u2",
        "title": "Besinlerimiz",
        "topics": [
          "Besinler ve Özellikleri [t3]",
          "Taze ve Doğal Besinler [t4]"
        ]
      },
      {
        "key": "u3",
        "title": "Kuvvetin Etkileri",
        "topics": [
          "Kuvvetin Etkileri [t5]",
          "Mıknatısların Kuvveti [t6]"
        ]
      },
      {
        "key": "u4",
        "title": "Maddenin Özellikleri",
        "topics": [
          "Niteleyen–Ölçülebilir Özellikler [t7]",
          "Maddenin Hâlleri [t8]",
          "Isı Etkisi [t9]",
          "Saf Madde–Karışım [t10]"
        ]
      },
      {
        "key": "u5",
        "title": "Aydınlatma ve Ses Teknolojileri",
        "topics": [
          "Aydınlatma Teknolojileri [t11]",
          "Ses Teknolojileri [t12]"
        ]
      },
      {
        "key": "u6",
        "title": "İnsan ve Çevre",
        "topics": [
          "Bilinçli Tüketici [t13]"
        ]
      },
      {
        "key": "u7",
        "title": "Basit Elektrik Devreleri",
        "topics": [
          "Devre Elemanları [t14]"
        ]
      }
    ]
  },
  "5": {
    "turkce": [
      {
        "key": "u_dinleme",
        "title": "Dinleme / İzleme",
        "topics": [
          "Dinlediğini/İzlediğini Yorumlama [t1]",
          "Görselden Anlam Çıkarma [t2]",
          "Anahtar Kelimeler [t3]",
          "Hikâye Unsurları [t4]",
          "Bilgilendirici Metinlerde Önemli Bilgiler [t5]",
          "Neden-Sonuç [t6]",
          "Düşünceyi Geliştirme Yolları [t7]",
          "Söz Sanatları [t8]",
          "Çoklu Ortam Çözümleme [t9]",
          "Problem Çözme [t10]"
        ],
        "defterKey": "u1"
      },
      {
        "key": "u_okuma",
        "title": "Okuma",
        "topics": [
          "Akıcı Okuma [t11]",
          "Bilinmeyen Kelimeyi Tahmin [t12]",
          "Metnin Konusu [t13]",
          "Ana Fikir ve Ana Duygu [t14]",
          "Gerçek–Hayal [t15]",
          "Öznel–Nesnel [t16]",
          "Olayların Oluş Sırası [t17]",
          "Şiirde Biçim Özellikleri [t18]",
          "Neden–Amaç–Koşul Cümleleri [t19]",
          "Atasözü ve Deyimler [t20]"
        ],
        "defterKey": "u2"
      },
      {
        "key": "u_konusma",
        "title": "Konuşma",
        "topics": [
          "Hazırlıklı/ Hazırlıksız Konuşma [t21]",
          "Beden Dilini Kullanma [t22]",
          "Sözlü Sunum [t23]",
          "Görüş ve Eleştiri [t24]",
          "Tartışmalara Katılma [t25]",
          "Geçiş/ Bağlantı İfadeleri [t26]"
        ],
        "defterKey": "u3"
      },
      {
        "key": "u_yazma",
        "title": "Yazma",
        "topics": [
          "Yaratıcı Yazma [t27]",
          "Özetleme ve Değerlendirme [t28]",
          "Yazım Kuralları [t29]",
          "Noktalama [t30]",
          "Düşünceyi Geliştirme Yolları [t31]",
          "Geçiş ve Bağlantılar [t32]",
          "Yazılı Eleştiri [t33]"
        ],
        "defterKey": "u4"
      },
      {
        "key": "u_dilyapi",
        "title": "Dil Yapıları ve Söz Varlığı",
        "topics": [
          "İsim – Fiil Ayrımı [t34]",
          "İsimler, Zamirler, Sıfatlar [t35]",
          "Karşılaştırma/Benzetme/Özetleme [t36]",
          "Türkçeyi Doğru ve Etkili Kullanma [t37]"
        ],
        "defterKey": "u5"
      }
    ],
    "matematik": [
      {
        "key": "u1_geo_sekiller",
        "title": "Geometrik Şekiller",
        "topics": [
          "Temel Şekiller [t1]",
          "Çember [t2]",
          "Dikme/Paralel Doğrular [t3]",
          "Açılar [t4]",
          "Çokgenler ve Üçgenler [t5]"
        ],
        "defterKey": "u1"
      },
      {
        "key": "u2_sayilar1",
        "title": "Sayılar ve Nicelikler (1)",
        "topics": [
          "Büyük Doğal Sayılar [t6]",
          "Basamak Değeri/Çözümleme [t7]",
          "Dört İşlem [t8]",
          "Tahmin ve Zihinden İşlemler [t9]"
        ],
        "defterKey": "u2"
      },
      {
        "key": "u3_geo_nicelik",
        "title": "Geometrik Nicelikler",
        "topics": [
          "Çevre Uzunluğu [t10]",
          "Alan Ölçme (Birim Kare) [t11]",
          "Dikdörtgende Çevre/Alan [t12]",
          "Problemler [t13]"
        ],
        "defterKey": "u3"
      },
      {
        "key": "u4_sayilar2",
        "title": "Sayılar ve Nicelikler (2)",
        "topics": [
          "Kesirleri Sadeleştirme/Genişletme [t14]",
          "Bileşik ve Tam Sayılı Kesir [t15]",
          "Ondalık Gösterim [t16]",
          "Yüzdeler [t17]"
        ],
        "defterKey": "u4"
      },
      {
        "key": "u5_istatistik",
        "title": "İstatistiksel Araştırma Süreci",
        "topics": [
          "Veri Toplama [t18]",
          "Tablo ve Grafik [t19]",
          "Veriye Dayalı Yorumlama [t20]"
        ],
        "defterKey": "u5"
      },
      {
        "key": "u6_islemler_cebir",
        "title": "İşlemlerle Cebirsel Düşünme",
        "topics": [
          "Eşitlik ve İşlem Özellikleri [t21]",
          "Sayı Örüntüleri [t22]",
          "İşlem Önceliği [t23]",
          "Kare ve Küp [t24]"
        ],
        "defterKey": "u6"
      },
      {
        "key": "u7_olasilik",
        "title": "Veriden Olasılığa",
        "topics": [
          "Olasılık Kavramı [t25]",
          "Olayların Olma Olasılığı [t26]"
        ],
        "defterKey": "u7"
      }
    ],
    "fen": [
      {
        "key": "u1",
        "title": "Gökyüzündeki Komşularımız ve Biz",
        "topics": [
          "Güneş-Dünya-Ay [t1]",
          "Ay'ın Evreleri [t2]",
          "Hareketler ve Modeller [t3]"
        ]
      },
      {
        "key": "u2",
        "title": "Kuvveti Tanıyalım",
        "topics": [
          "Kuvvetin Büyüklüğü [t4]",
          "Dinamometre [t5]",
          "Sürtünme Kuvveti [t6]"
        ]
      },
      {
        "key": "u3",
        "title": "Canlıların Yapısına Yolculuk",
        "topics": [
          "Hücre-Doku-Organ-Sistem [t7]",
          "Bitki/Hayvan Hücreleri [t8]",
          "Destek ve Hareket [t9]"
        ]
      },
      {
        "key": "u4",
        "title": "Işığın Dünyası",
        "topics": [
          "Doğrusal Yayılma [t10]",
          "Tam Gölge [t11]",
          "Işığın Geçirilmesi [t12]"
        ]
      },
      {
        "key": "u5",
        "title": "Maddenin Doğası",
        "topics": [
          "Tanecikli Yapı [t13]",
          "Isı–Sıcaklık [t14]",
          "Isı İletimi [t15]",
          "Yalıtım [t16]"
        ]
      },
      {
        "key": "u6",
        "title": "Yaşamımızdaki Elektrik",
        "topics": [
          "Devre Elemanları [t17]",
          "Parlaklığa Etki Edenler [t18]"
        ]
      },
      {
        "key": "u7",
        "title": "Sürdürülebilir Yaşam ve Geri Dönüşüm",
        "topics": [
          "Geri Dönüşüm [t19]",
          "Kaynakların Etkili Kullanımı [t20]"
        ]
      }
    ],
    "sosyal": [
      {
        "key": "u1",
        "title": "Birlikte Yaşamak",
        "topics": [
          "Toplumsal Roller [t1]",
          "Yardımlaşma [t2]",
          "Farklılıklara Saygı [t3]"
        ]
      },
      {
        "key": "u2",
        "title": "Evimizi Dünya",
        "topics": [
          "İlin Konumu [t4]",
          "Doğal/Beşerî Çevre [t5]",
          "Afet Farkındalığı [t6]",
          "Komşu Ülkeler [t7]"
        ]
      },
      {
        "key": "u3",
        "title": "Ortak Mirasımız",
        "topics": [
          "Kültürel Miras [t8]",
          "Anadolu Uygarlıkları [t9]",
          "Mezopotamya [t10]"
        ]
      },
      {
        "key": "u4",
        "title": "Yaşayan Demokrasimiz",
        "topics": [
          "Demokrasi ve Cumhuriyet [t11]",
          "Hak ve Sorumluluklar [t12]",
          "Başvuru Kurumları [t13]"
        ]
      },
      {
        "key": "u5",
        "title": "Hayatımızdaki Ekonomi",
        "topics": [
          "Kaynakları Verimli Kullanma [t14]",
          "Bütçe Planlama [t15]",
          "Ekonomik Faaliyetler [t16]"
        ]
      },
      {
        "key": "u6",
        "title": "Teknoloji ve Sosyal Bilimler",
        "topics": [
          "Teknolojinin Etkileri [t17]",
          "Bilinçli Kullanım [t18]"
        ]
      }
    ],
    "ingilizce": [
      {
        "key": "u1",
        "title": "School Life",
        "topics": [
          "People and Places at School [t1]",
          "Classroom Rules and Instructions [t2]",
          "School Clubs and Activities [t3]"
        ]
      },
      {
        "key": "u2",
        "title": "Classroom Life",
        "topics": [
          "Classroom Language and Requests [t4]",
          "School Subjects and Timetables [t5]",
          "Time, Days and Routines at School [t6]"
        ]
      },
      {
        "key": "u3",
        "title": "Personal Life",
        "topics": [
          "Parts of the Body [t7]",
          "Clothes and Personal Style [t8]",
          "Daily Routines and Habits [t9]"
        ]
      },
      {
        "key": "u4",
        "title": "Family Life",
        "topics": [
          "Family Members and Relations [t10]",
          "Hobbies and Free Time Activities [t11]",
          "Talking about Likes and Dislikes [t12]"
        ]
      },
      {
        "key": "u5",
        "title": "Neighbourhood / City",
        "topics": [
          "Places in the City [t13]",
          "Describing My Neighbourhood [t14]",
          "Types of Houses and Rooms [t15]"
        ]
      },
      {
        "key": "u6",
        "title": "Life in the World",
        "topics": [
          "Food Types and Meals [t16]",
          "Ordering Food and Drinks [t17]",
          "Expressing Preferences about Food [t18]"
        ]
      },
      {
        "key": "u7",
        "title": "Life in Nature",
        "topics": [
          "Animals and Their Habitats [t19]",
          "Describing Animals and Abilities [t20]",
          "Protecting Nature and Animals [t21]"
        ]
      },
      {
        "key": "u8",
        "title": "Universe / Future",
        "topics": [
          "Planets and Space Words [t22]",
          "Talking about Future Plans [t23]",
          "Dream Jobs and Future Life [t24]"
        ]
      }
    ]
  },
  "6": {
    "turkce": [
      {
        "key": "u_dinleme",
        "title": "Dinleme / İzleme",
        "topics": [
          "Görsel/İşitselden Anlam [t1]",
          "Yorumlama-Özetleme [t2]",
          "Anahtar Kelimeler [t3]",
          "Hikâye Unsurları [t4]",
          "Bilgilendirici Metin Bilgileri [t5]",
          "Yüzey/Derin Anlam [t6]",
          "Söz Sanatları [t7]",
          "Düşünceyi Geliştirme [t8]",
          "Çoklu Ortam [t9]",
          "Problem Çözme [t10]"
        ],
        "defterKey": "u1"
      },
      {
        "key": "u_okuma",
        "title": "Okuma",
        "topics": [
          "Akıcı Okuma [t11]",
          "Metin Konusu/Ana Fikir/Duygu [t12]",
          "Gerçek–Hayal [t13]",
          "Öznel–Nesnel [t14]",
          "Olayların Sırası [t15]",
          "Düşünceyi Geliştirme [t16]",
          "Atasözü/Deyimler [t17]",
          "Şiir Biçimi [t18]",
          "Neden–Amaç–Koşul [t19]",
          "Okuduğunu Değerlendirme [t20]"
        ],
        "defterKey": "u2"
      },
      {
        "key": "u_konusma",
        "title": "Konuşma",
        "topics": [
          "Hazırlıklı/ Hazırlıksız [t21]",
          "Sözlü Sunum [t22]",
          "Görüş ve Eleştiri [t23]",
          "Problem Çözmeye Yönelik [t24]",
          "Beden Dili [t25]",
          "Geçiş/ Bağlantı [t26]"
        ],
        "defterKey": "u3"
      },
      {
        "key": "u_yazma",
        "title": "Yazma",
        "topics": [
          "Yaratıcı/Açıklayıcı Yazılar [t27]",
          "Yazım ve Noktalama [t28]",
          "Düşünceyi Geliştirme [t29]",
          "Geçiş ve Bağlantılar [t30]",
          "Özet/Değerlendirme/Eleştiri [t31]"
        ],
        "defterKey": "u4"
      },
      {
        "key": "u_dilyapi",
        "title": "Dil Yapıları ve Söz Varlığı",
        "topics": [
          "Kök ve Ek [t32]",
          "Ses Olayları [t33]",
          "Özne–Yüklem Uyumu [t34]",
          "Sebep/Amaç/Şart/Zıtlık/Olumsuzluk [t35]",
          "Türkçeyi Etkili Kullanma [t36]"
        ],
        "defterKey": "u5"
      }
    ],
    "matematik": [
      {
        "key": "u1_sayilar1",
        "title": "Sayılar ve Nicelikler (1)",
        "topics": [
          "Çarpan/Kat/Asal [t1]",
          "Tam Bölünebilme [t2]",
          "OKEK/OBEB [t3]"
        ],
        "defterKey": "u1"
      },
      {
        "key": "u2_sayilar2",
        "title": "Sayılar ve Nicelikler (2)",
        "topics": [
          "Ondalık–Kesir–Yüzde [t4]",
          "Kesirlerle Dört İşlem [t5]",
          "Gerçek Yaşam Problemleri [t6]",
          "Uzunluk Ölçme [t7]"
        ],
        "defterKey": "u2"
      },
      {
        "key": "u3_geo_sekiller",
        "title": "Geometrik Şekiller",
        "topics": [
          "Paralel Doğrular [t8]",
          "Açı Çeşitleri [t9]",
          "Dörtgenler [t10]",
          "Üçgen/Yamuk Açıları [t11]"
        ],
        "defterKey": "u3"
      },
      {
        "key": "u4_geo_nicelik",
        "title": "Geometrik Nicelikler",
        "topics": [
          "Uzunluk/Alan Birimleri [t12]",
          "Dikdörtgen/Paralelkenar/Üçgen Alan [t13]",
          "Çember Çevre/Alan [t14]",
          "Merkez Açı [t15]"
        ],
        "defterKey": "u4"
      },
      {
        "key": "u5_cebir_degisim",
        "title": "İşlemlerle Cebirsel Düşünme ve Değişimler",
        "topics": [
          "Cebirsel İfadeler [t16]",
          "Örüntüler [t17]",
          "Bilinmeyen İlişkileri [t18]",
          "İşlem Özellikleri [t19]"
        ],
        "defterKey": "u5"
      },
      {
        "key": "u6_istatistik",
        "title": "İstatistiksel Araştırma Süreci",
        "topics": [
          "Kategorik/Nicel Veri [t20]",
          "Tablo/Grafik [t21]",
          "Yorumlama [t22]"
        ],
        "defterKey": "u6"
      },
      {
        "key": "u7_olasilik",
        "title": "Veriden Olasılığa",
        "topics": [
          "Olasılık Kavramı [t23]",
          "0–1 Arası Yorum [t24]"
        ],
        "defterKey": "u7"
      }
    ],
    "fen": [
      {
        "key": "u1",
        "title": "Güneş Sistemi ve Tutulmalar",
        "topics": [
          "Gezegenler ve Güneş Sistemi [t1]",
          "Güneş ve Ay Tutulmaları [t2]",
          "Gök Cisimleri için Bilimsel Modelleme [t3]"
        ]
      },
      {
        "key": "u2",
        "title": "Kuvvetin Etkisinde Hareket",
        "topics": [
          "Dengelenmiş ve Dengelenmemiş Kuvvetler [t4]",
          "Hareket, Sürat ve Hız Hesaplama [t5]",
          "Kuvvet, Kütle ve Hız İlişkisi [t6]"
        ]
      },
      {
        "key": "u3",
        "title": "Canlılarda Sistemler",
        "topics": [
          "Üreme, Büyüme ve Gelişme [t7]",
          "Eşeyli ve Eşeysiz Üreme [t8]",
          "Sinir Sistemi ve Hormonlar [t9]",
          "Ergenlik Dönemi ve Değişimler [t10]"
        ]
      },
      {
        "key": "u4",
        "title": "Işığın Yansıması ve Renkler",
        "topics": [
          "Düzgün ve Dağınık Yansıma [t11]",
          "Işığın Maddeyle Etkileşimi [t12]",
          "Beyaz Işık, Renkler ve Prizma [t13]",
          "Düzlem, Tümsek ve Çukur Aynalar [t14]"
        ]
      },
      {
        "key": "u5",
        "title": "Maddenin Ayırt Edici Özellikleri",
        "topics": [
          "Erime, Donma ve Kaynama Noktası [t15]",
          "Yoğunluk ve Hal Değişimi [t16]",
          "Genleşme, Büzülme ve Günlük Hayat Örnekleri [t17]"
        ]
      },
      {
        "key": "u6",
        "title": "Elektriğin İletimi ve Direnç",
        "topics": [
          "Basit Elektrik Devreleri ve Elemanları [t18]",
          "Ampul Parlaklığına Etki Eden Faktörler [t19]",
          "Direnç, Isınma ve Enerji Tüketimi [t20]"
        ]
      },
      {
        "key": "u7",
        "title": "Sürdürülebilir Yaşam ve Etkileşim",
        "topics": [
          "Biyoçeşitlilik ve Nesli Tükenen Türler [t21]",
          "Çevre Kirliliği ve Önleme Yolları [t22]",
          "Yenilenebilir ve Yenilenemez Enerji Kaynakları [t23]",
          "Geri Dönüşüm ve Kaynakların Verimli Kullanımı [t24]"
        ]
      }
    ],
    "sosyal": [
      {
        "key": "u1",
        "title": "Birlikte Yaşamak",
        "topics": [
          "Toplumsal Roller [t1]",
          "Millî Değerler [t2]",
          "Sorunlara Çözümler [t3]"
        ]
      },
      {
        "key": "u2",
        "title": "Evimiz Dünya",
        "topics": [
          "Türkiye'nin Konumu [t4]",
          "Kıtalar/Okyanuslar [t5]",
          "Türk Dünyası [t6]"
        ]
      },
      {
        "key": "u3",
        "title": "Ortak Mirasımız",
        "topics": [
          "İlk Türk Devletleri [t7]",
          "İslam Medeniyeti [t8]",
          "Anadolu'nun Türkleşmesi [t9]"
        ]
      },
      {
        "key": "u4",
        "title": "Yaşayan Demokrasimiz",
        "topics": [
          "Yönetim Süreci [t10]",
          "Hak/Sorumluluk [t11]",
          "Dijital Vatandaşlık [t12]"
        ]
      },
      {
        "key": "u5",
        "title": "Hayatımızdaki Ekonomi",
        "topics": [
          "Kaynaklar [t13]",
          "Meslekler [t14]",
          "Yatırım/Pazarlama [t15]"
        ]
      },
      {
        "key": "u6",
        "title": "Teknoloji ve Sosyal Bilimler",
        "topics": [
          "Ulaşım/İletişim [t16]",
          "Kültürel Etkileşim [t17]",
          "Telif/Patent [t18]"
        ]
      }
    ],
    "ingilizce": [
      {
        "key": "u1",
        "title": "Life",
        "topics": [
          "Simple Present [t1]",
          "Time & Dates [t2]"
        ]
      },
      {
        "key": "u2",
        "title": "Yummy Breakfast",
        "topics": [
          "Likes/Dislikes [t3]",
          "Accept/Refuse Offers [t4]"
        ]
      },
      {
        "key": "u3",
        "title": "Downtown",
        "topics": [
          "Places in City [t5]",
          "Comparatives [t6]",
          "Present Continuous [t7]"
        ]
      },
      {
        "key": "u4",
        "title": "Weather and Emotions",
        "topics": [
          "Weather [t8]",
          "Emotions [t9]",
          "Asking About Weather [t10]"
        ]
      },
      {
        "key": "u5",
        "title": "At the Fair",
        "topics": [
          "Places/Activities [t11]",
          "Feelings [t12]",
          "Opinions [t13]"
        ]
      },
      {
        "key": "u6",
        "title": "Occupations",
        "topics": [
          "Jobs [t14]",
          "Abilities (Can't) [t15]",
          "Time & Dates [t16]"
        ]
      },
      {
        "key": "u7",
        "title": "Holidays",
        "topics": [
          "Activities [t17]",
          "Simple Past [t18]"
        ]
      },
      {
        "key": "u8",
        "title": "Book Worms",
        "topics": [
          "Prepositions [t19]",
          "Past Events [t20]"
        ]
      },
      {
        "key": "u9",
        "title": "Saving the Planet",
        "topics": [
          "Suggestions (Should) [t21]",
          "Environment [t22]"
        ]
      },
      {
        "key": "u10",
        "title": "Democracy",
        "topics": [
          "Procedures [t23]",
          "Past Events/Inquiry [t24]"
        ]
      }
    ]
  },
  "7": {
    "turkce": [
      {
        "key": "u_okuma",
        "title": "Okuma",
        "topics": [
          "Sözcük/Sözcük Gruplarının Anlamı [t1]",
          "Metin Konusu/Ana Fikir [t2]",
          "Başlık [t3]",
          "Düşünceyi Geliştirme [t4]",
          "Örtülü Anlam/Söz Sanatları [t5]",
          "Görsel Okuma [t6]",
          "Yardımcı Fikirler [t7]",
          "Hikâye Unsurları/Anlatıcı [t8]",
          "Neden–Amaç–Koşul/Karşılaştırma/Benzetme/Örneklendirme/Abartma/Duygu [t9]",
          "Öznel–Nesnel [t10]",
          "Gerçek–Kurgusal [t11]",
          "Söyleşi–Günlük–Biyografi–Otobiyografi [t12]",
          "Anlatım Biçimleri [t13]"
        ],
        "defterKey": "u1"
      },
      {
        "key": "u_yazma",
        "title": "Yazma",
        "topics": [
          "Geçiş/ Bağlantı İfadeleri [t14]",
          "Deyim/Atasözü/Özdeyiş [t15]",
          "Yabancı Sözcüklere Türkçe Karşılık [t16]",
          "Metin Bölümlerini Düzenleme [t17]"
        ],
        "defterKey": "u2"
      },
      {
        "key": "u_yazim_noktalama",
        "title": "Yazım ve Noktalama",
        "topics": [
          "Yazımı Karıştırılan Sözcükler [t18]",
          "Büyük Harf [t19]",
          "De/Ki/Mi [t20]",
          "Kısaltmalar/Sayılar [t21]",
          "Nokta/Virgül/Ünlem/Soru [t22]",
          "İki/Üç Nokta/Ayraç/Kesme/Tırnak [t23]"
        ],
        "defterKey": "u3"
      },
      {
        "key": "u_dilbilgisi",
        "title": "Dil Bilgisi",
        "topics": [
          "Fiil ve Kipler [t24]",
          "Anlam Kayması [t25]",
          "Zarflar [t26]",
          "Fiil Çatısı/Birleşik Fiiller [t27]",
          "Ek Fiil [t28]",
          "Birleşik Zamanlı Fiiller [t29]",
          "Anlatım Bozuklukları [t30]"
        ],
        "defterKey": "u4"
      }
    ],
    "matematik": [
      {
        "key": "u1_tamsayilar",
        "title": "Tam Sayılarla İşlemler",
        "topics": [
          "Tam Sayıları Tanıma [t1]",
          "Tam Sayılarla Toplama/Çıkarma/Çarpma/Bölme [t2]",
          "Tam Sayılarla İşlem Problemleri [t3]"
        ],
        "defterKey": "u1"
      },
      {
        "key": "u2_rasyonel",
        "title": "Rasyonel Sayılarla İşlemler",
        "topics": [
          "Rasyonel Sayıların Tanımı ve Ondalık Gösterim [t4]",
          "Rasyonel Sayıları Karşılaştırma ve Sıralama [t5]",
          "Rasyonel Sayılarla Dört İşlem [t6]",
          "Rasyonel Sayılarda Kuvvet (Kare/Küp) [t7]",
          "Rasyonel Sayılarla Problem Çözme [t8]"
        ],
        "defterKey": "u2"
      },
      {
        "key": "u3_esitlik_denklem",
        "title": "Eşitlik ve Denklem",
        "topics": [
          "Cebirsel İfadeler ve Terimler [t9]",
          "Örüntüler ve Cebirsel İfade İlişkisi [t10]",
          "Birinci Dereceden Denklem Kurma ve Çözme [t11]",
          "Denkleme Dayalı Problem Çözme [t12]"
        ],
        "defterKey": "u3"
      },
      {
        "key": "u4_yuzde_oran",
        "title": "Yüzdeler ve Oran-Orantı",
        "topics": [
          "Oran ve Orantı Kavramı [t13]",
          "Doğru ve Ters Orantı [t14]",
          "Yüzde Hesapları [t15]",
          "Oran-Orantı ve Yüzde Problemleri [t16]"
        ],
        "defterKey": "u4"
      },
      {
        "key": "u5_cember_daire",
        "title": "Çember ve Daire",
        "topics": [
          "Çemberde Temel Kavramlar ve Açıortay/Çokgenler [t17]",
          "Dörtgen Alanları ve Çemberle İlişkiler [t18]",
          "Çember Çevresi Hesaplama [t19]",
          "Daire Alanı Hesaplama [t20]"
        ],
        "defterKey": "u5"
      },
      {
        "key": "u6_gorunum_istatistik",
        "title": "Görünümler ve Grafikler",
        "topics": [
          "Farklı Yönlerden Cisim Görünümleri [t21]",
          "Çizgi, Sütun ve Daire Grafikleri [t22]",
          "Ortalama, Medyan ve Mod [t23]"
        ],
        "defterKey": "u6"
      }
    ],
    "fen": [
      {
        "key": "u1",
        "title": "Güneş Sistemi ve Ötesi",
        "topics": [
          "Uzay Araştırmaları [t1]",
          "Gök Cisimleri [t2]"
        ]
      },
      {
        "key": "u2",
        "title": "Hücre ve Bölünmeler",
        "topics": [
          "Hücre Yapısı [t3]",
          "Mitoz/Mayoz [t4]",
          "Hücreden Organizmaya [t5]"
        ]
      },
      {
        "key": "u3",
        "title": "Kuvvet ve Enerji",
        "topics": [
          "Kütle–Ağırlık [t6]",
          "İş/Kuvvet/Enerji [t7]",
          "Enerji Dönüşümleri [t8]"
        ]
      },
      {
        "key": "u4",
        "title": "Saf Madde ve Karışımlar",
        "topics": [
          "Tanecikli Yapı [t9]",
          "Element/Bileşik [t10]",
          "Karışımlar ve Ayrıştırma [t11]",
          "Geri Dönüşüm [t12]"
        ]
      },
      {
        "key": "u5",
        "title": "Işığın Maddeyle Etkileşimi",
        "topics": [
          "Soğurulma [t13]",
          "Renkli Görünme [t14]",
          "Aynalar/Mercekler/Kırılma [t15]"
        ]
      },
      {
        "key": "u6",
        "title": "Canlılarda Üreme/Büyüme/Gelişme",
        "topics": [
          "Bitki/Hayvanlarda Üreme [t16]",
          "İnsanda Üreme [t17]"
        ]
      },
      {
        "key": "u7",
        "title": "Elektrik Devreleri",
        "topics": [
          "Bağlanma Şekilleri [t18]",
          "Elektrik Akımı [t19]"
        ]
      }
    ],
    "sosyal": [
      {
        "key": "u1",
        "title": "Birey ve Toplum",
        "topics": [
          "İletişim/Medya [t1]",
          "Bilinçli Medya [t2]"
        ]
      },
      {
        "key": "u2",
        "title": "Kültür ve Miras",
        "topics": [
          "Osmanlı'nın Yükselişi [t3]",
          "Fetih Siyaseti [t4]",
          "Islahatlar [t5]",
          "Kültür/Sanat [t6]"
        ]
      },
      {
        "key": "u3",
        "title": "İnsanlar, Yerler ve Çevreler",
        "topics": [
          "Yerleşmeyi Etkileyenler [t7]",
          "Demografik Özellikler [t8]",
          "Göç ve Sonuçları [t9]",
          "Seyahat Özgürlüğü [t10]"
        ]
      },
      {
        "key": "u4",
        "title": "Bilim, Teknoloji ve Toplum",
        "topics": [
          "Bilginin Önemi [t11]",
          "Türk–İslam Bilginleri [t12]",
          "Avrupa'daki Gelişmeler [t13]",
          "Özgür Düşünce [t14]"
        ]
      },
      {
        "key": "u5",
        "title": "Üretim, Dağıtım ve Tüketim",
        "topics": [
          "Toprak ve Üretim [t15]",
          "Üretim Teknolojileri [t16]",
          "STK'lar [t17]",
          "Yeni Meslekler/E-Ticaret [t18]"
        ]
      },
      {
        "key": "u6",
        "title": "Etkin Vatandaşlık",
        "topics": [
          "Demokrasi [t19]",
          "Atatürk ve Demokrasi [t20]",
          "Türkiye'de Süreçler [t21]"
        ]
      },
      {
        "key": "u7",
        "title": "Küresel Bağlantılar",
        "topics": [
          "Uluslararası Kuruluşlar [t22]",
          "Küresel Ekonomi/Kültür [t23]",
          "Küresel Sorunlar [t24]"
        ]
      }
    ],
    "ingilizce": [
      {
        "key": "u1",
        "title": "Appearance & Personality",
        "topics": [
          "Adjectives [t1]",
          "Comparatives [t2]",
          "Questions [t3]",
          "Because [t4]"
        ]
      },
      {
        "key": "u2",
        "title": "Biographies",
        "topics": [
          "Simple Past [t5]",
          "Was/Were [t6]",
          "Dates [t7]"
        ]
      },
      {
        "key": "u3",
        "title": "Sports",
        "topics": [
          "Simple Present (Habits) [t8]",
          "How Often [t9]"
        ]
      },
      {
        "key": "u4",
        "title": "Wild Animals",
        "topics": [
          "Vocabulary [t10]",
          "Should/Shouldn't [t11]",
          "Past in Context [t12]"
        ]
      },
      {
        "key": "u5",
        "title": "Television",
        "topics": [
          "Program Types [t13]",
          "Preferences [t14]",
          "Opinions [t15]"
        ]
      },
      {
        "key": "u6",
        "title": "Celebrations",
        "topics": [
          "Accept/Refuse [t16]",
          "Quantifiers [t17]",
          "Sequencing [t18]"
        ]
      },
      {
        "key": "u7",
        "title": "Dreams",
        "topics": [
          "Will/Won't [t19]",
          "Predictions [t20]"
        ]
      },
      {
        "key": "u8",
        "title": "Public Buildings",
        "topics": [
          "Places [t21]",
          "Directions/Reasons [t22]"
        ]
      },
      {
        "key": "u9",
        "title": "Environment",
        "topics": [
          "Processes [t23]",
          "Obligation (must/have to) [t24]"
        ]
      },
      {
        "key": "u10",
        "title": "Planets",
        "topics": [
          "Solar System [t25]",
          "Superlatives [t26]",
          "WH-questions [t27]"
        ]
      }
    ]
  },
  "8": {
    "turkce": [
      {
        "key": "u_okuma",
        "title": "Okuma",
        "topics": [
          "Sözcük/Sözcük Gruplarının Anlamı [t1]",
          "Metin Konusu/Ana Fikir [t2]",
          "Yardımcı Fikirler [t3]",
          "Başlık [t4]",
          "Düşünceyi Geliştirme [t5]",
          "Anlatım Biçimleri [t6]",
          "Söz Sanatları [t7]",
          "Metin Soruları [t8]",
          "Hikâye Unsurları/Anlatıcı [t9]",
          "Neden–Amaç–Karşılaştırma–Benzetme–Örneklendirme–Abartma–Koşul–Duygu [t10]",
          "Öznel–Nesnel [t11]",
          "Gerçek–Kurgusal [t12]",
          "Köşe Yazısı/Makale/Deneme [t13]",
          "Roman/Destan [t14]",
          "Görsel Okuma [t15]"
        ],
        "defterKey": "u1"
      },
      {
        "key": "u_yazma",
        "title": "Yazma",
        "topics": [
          "Geçiş/ Bağlantı [t16]",
          "Deyim/Atasözü/Özdeyiş [t17]",
          "Türkçeleştirme [t18]",
          "Metin Bölümleri [t19]"
        ],
        "defterKey": "u2"
      },
      {
        "key": "u_yazim_noktalama",
        "title": "Yazım ve Noktalama",
        "topics": [
          "Yazımı Karıştırılanlar [t20]",
          "Büyük Harf [t21]",
          "De/Ki/Mi [t22]",
          "Kısaltma/Sayı/Tarih [t23]",
          "Birleşik Sözcükler [t24]",
          "Nokta/İki Nokta/Üç Nokta [t25]",
          "Virgül/Noktalı Virgül [t26]",
          "Ünlem/Soru [t27]",
          "Çizgiler/Tırnak/Kesme/Ayraç [t28]"
        ],
        "defterKey": "u3"
      },
      {
        "key": "u_dilbilgisi",
        "title": "Dil Bilgisi",
        "topics": [
          "Cümlenin Ögeleri [t29]",
          "Cümle Türleri [t30]",
          "Fiilimsiler [t31]",
          "Fiil Çatısı [t32]",
          "Anlatım Bozuklukları [t33]"
        ],
        "defterKey": "u4"
      }
    ],
    "matematik": [
      {
        "key": "u1_uslu",
        "title": "Üslü İfadeler ve Sayılar",
        "topics": [
          "Çarpanlar/Katlar [t1]",
          "EBOB/EKOK [t2]",
          "Aralarında Asal [t3]",
          "Üslü İfadeler [t4]",
          "Ondalık Çözümleme [t5]",
          "10'un Kuvvetleri/Bilimsel Gösterim [t6]"
        ],
        "defterKey": "u1"
      },
      {
        "key": "u2_karekok_veri",
        "title": "Kareköklü İfadeler / Veri",
        "topics": [
          "Tam Kare Sayılar [t7]",
          "Kareköklü İşlemler [t8]",
          "Ondalıkların Karekökü [t9]",
          "Gerçek Sayılar [t10]",
          "Veri Analizi [t11]"
        ],
        "defterKey": "u2"
      },
      {
        "key": "u3_cebir_ozdeslik",
        "title": "Cebirsel İfadeler ve Özdeşlikler",
        "topics": [
          "Olasılık [t12]",
          "Cebirsel İfadeler [t13]",
          "Çarpma/Özdeşlik [t14]",
          "Çarpanlara Ayırma [t15]"
        ],
        "defterKey": "u3"
      },
      {
        "key": "u4_denklem_esp",
        "title": "Eşitsizlikler ve Doğrusal İlişkiler",
        "topics": [
          "Birinci Dereceden Denklem [t16]",
          "Koordinat Sistemi [t17]",
          "Doğrusal Denklemler [t18]",
          "Eğim [t19]",
          "Eşitsizlikler [t20]"
        ],
        "defterKey": "u4"
      },
      {
        "key": "u5_eslik_benzerlik",
        "title": "Eşlik ve Benzerlik",
        "topics": [
          "Üçgen Yardımcı Elemanları [t21]",
          "Kenar–Açı İlişkileri [t22]",
          "Pisagor [t23]",
          "Eşlik/Benzerlik Oranı [t24]"
        ],
        "defterKey": "u5"
      },
      {
        "key": "u6_cisimler",
        "title": "Geometrik Cisimler",
        "topics": [
          "Öteleme/Yansıma [t25]",
          "Prizma/Silindir/Piramit/Koni [t26]",
          "Alan ve Hacim [t27]"
        ],
        "defterKey": "u6"
      }
    ],
    "fen": [
      {
        "key": "u1",
        "title": "Mevsimler ve İklim",
        "topics": [
          "Mevsimlerin Oluşumu [t1]",
          "Hava/İklim Olayları [t2]"
        ]
      },
      {
        "key": "u2",
        "title": "DNA ve Genetik Kod",
        "topics": [
          "DNA ve Kalıtım [t3]",
          "Mutasyon/Modifikasyon/Adaptasyon [t4]",
          "Biyoteknoloji [t5]"
        ]
      },
      {
        "key": "u3",
        "title": "Basınç",
        "topics": [
          "Katı/Sıvı/Açık Hava Basıncı [t6]"
        ]
      },
      {
        "key": "u4",
        "title": "Madde ve Endüstri",
        "topics": [
          "Periyodik Sistem [t7]",
          "Fiziksel–Kimyasal Değişim [t8]",
          "Tepkimeler [t9]",
          "Asitler/Bazlar [t10]",
          "Isı ile Etkileşim [t11]",
          "Türkiye'de Kimya Endüstrisi [t12]"
        ]
      },
      {
        "key": "u5",
        "title": "Basit Makineler",
        "topics": [
          "Makaralar/Kaldıraçlar [t13]",
          "Eğik Düzlem/Çıkrık/Dişli/Kasnak [t14]"
        ]
      },
      {
        "key": "u6",
        "title": "Enerji Dönüşümleri ve Çevre",
        "topics": [
          "Besin Zinciri/Enerji Akışı [t15]",
          "Fotosentez/Solunum [t16]",
          "Madde Döngüleri [t17]",
          "Sürdürülebilirlik [t18]"
        ]
      },
      {
        "key": "u7",
        "title": "Elektrik Yükleri ve Enerji",
        "topics": [
          "Elektriklenme/Yükler [t19]",
          "Enerji Dönüşümü [t20]"
        ]
      }
    ],
    "sosyal": [
      {
        "key": "u_itih",
        "title": "T.C. İnkılap Tarihi ve Atatürkçülük",
        "topics": [
          "Bir Kahraman Doğuyor [t1]",
          "Millî Uyanış: Bağımsızlık Yolunda [t2]",
          "Ya İstiklal Ya Ölüm! [t3]",
          "Atatürkçülük ve Çağdaşlaşma [t4]",
          "Demokratikleşme Çabaları [t5]",
          "Dış Politika (Hatay) [t6]",
          "Atatürk'ün Ölümü ve Sonrası [t7]"
        ],
        "defterKey": "u1"
      }
    ],
    "ingilizce": [
      {
        "key": "u1",
        "title": "Friendship",
        "topics": [
          "Accept/Refuse [t1]",
          "Apologizing [t2]",
          "Excuses [t3]"
        ]
      },
      {
        "key": "u2",
        "title": "Teen Life",
        "topics": [
          "Adverbs of Frequency [t4]",
          "Likes/Preferences [t5]"
        ]
      },
      {
        "key": "u3",
        "title": "In the Kitchen",
        "topics": [
          "Cooking Processes [t6]",
          "Preferences (would rather) [t7]"
        ]
      },
      {
        "key": "u4",
        "title": "On the Phone",
        "topics": [
          "Phone Talk [t8]",
          "Messages [t9]",
          "Will for Decisions [t10]"
        ]
      },
      {
        "key": "u5",
        "title": "The Internet",
        "topics": [
          "Invitations [t11]",
          "Excuses [t12]",
          "Polite Requests [t13]"
        ]
      },
      {
        "key": "u6",
        "title": "Adventures",
        "topics": [
          "Extreme Sports [t14]",
          "Comparatives & Reasons [t15]"
        ]
      },
      {
        "key": "u7",
        "title": "Tourism",
        "topics": [
          "Describing Places [t16]",
          "Simple Past [t17]",
          "Comparatives & Superlatives [t18]",
          "Present Perfect (Experiences) [t19]"
        ]
      },
      {
        "key": "u8",
        "title": "Chores",
        "topics": [
          "Responsibilities [t20]",
          "Have to/Has to [t21]",
          "Likes/Dislikes [t22]"
        ]
      },
      {
        "key": "u9",
        "title": "Science",
        "topics": [
          "Present Continuous [t23]",
          "Past for Discoveries [t24]"
        ]
      },
      {
        "key": "u10",
        "title": "Natural Forces",
        "topics": [
          "Natural Disasters [t25]",
          "Future (will) [t26]",
          "Reasons & Results [t27]"
        ]
      }
    ]
  }
};

export function uniteler(grade: number, dersKey: string): Unite[] {
  return KATALOG[grade]?.[dersKey] ?? [];
}

/** "Metnin Konusu [t1]" → { baslik: "Metnin Konusu", testKey: "t1" } */
export function konuAyristir(satir: string): { baslik: string; testKey: string } {
  const m = satir.match(/^(.*?)\s*\[(t\d+)\]\s*$/);
  if (!m) return { baslik: satir.trim(), testKey: "" };
  return { baslik: m[1].trim(), testKey: m[2] };
}
