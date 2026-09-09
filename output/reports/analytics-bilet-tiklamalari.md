# Bilet tıklamalarını Analytics’te izleme

9 Eylül 2026 tarihinde siteye ürün bazında tıklama takibi eklendi. Mevcut Google Analytics mülkü kullanılıyor.

[Analytics’i aç](https://analytics.google.com/analytics/web/#/a324714068p542211490/reports/intelligenthome) → **Raporlar → Etkileşim → Etkinlikler**. Menü düzenine göre önce “Yaşam döngüsü” koleksiyonunu açman gerekebilir.

- **Kaç kişi tıkladı?** İlgili olay satırındaki **Toplam kullanıcı sayısı** sütununa bak. Bu, Analytics’in ayırt edebildiği kullanıcı sayısıdır; aynı kişinin farklı cihazları ayrı görünebilir.
- **Kaç kez tıklandı?** **Etkinlik sayısı** sütununa bak. Bir kişi üç kez tıklarsa üç tıklama oluşur.
- Tarih aralığını **9 Eylül 2026 ve sonrası** seç. Önceki tıklamalar yeni ürün olaylarına geriye dönük ayrıştırılmaz.

| Analytics’te arayacağın olay | Ölçtüğü bağlantı |
| --- | --- |
| `affiliate_click` | Sitedeki tüm takip edilen bilet bağlantılarının toplamı; kalan tekil GetYourGuide biletleri de dahil |
| `ticket_click_hagia_qr` | Ayasofya: e-postayla QR giriş bileti |
| `ticket_click_old_city_combo` | Ayasofya + Yerebatan + Topkapı |
| `ticket_click_saver_combo` | Üç yapı + Boğaz turu + eSIM |
| `ticket_click_dolmabahce_combo` | Dolmabahçe + Boğaz turu |
| `ticket_click_bus_boat_combo` | İki günlük otobüs + tekne paketi |
| `ticket_click_basilica_qr` | Planlayıcıdaki ayrı Yerebatan QR bileti |

**Sayıları toplarken:** Bir IWC tıklaması hem `affiliate_click` toplamına hem ilgili ürün satırına girer. Bu iki satırı toplama. Birden fazla ürüne tıklayan kullanıcı, birden fazla ürün satırında yer alabilir; ürünlerin kullanıcı sayılarını toplamak benzersiz toplam kullanıcı sayısını vermez.

Yeni olaylar ilk uygun tıklamadan sonra görünür. Gerçek zamanlı rapor son 30 dakikayı gösterir; standart raporların güncellenmesi 24 saate kadar sürebilir. Kaynak: [Google Analytics Etkinlikler raporu](https://support.google.com/analytics/answer/12926615?hl=tr).

Ölçüm, sitede isteğe bağlı Analytics’e izin veren ve ölçümü engellemeyen ziyaretçileri kapsar. İzin vermeyen ziyaretçiler, reklam engelleyiciler ve bağlantı sorunları nedeniyle tıklamalar eksik ölçülebilir.

Bu olaylar **satış, ödeme veya komisyon değildir**. Gerçek rezervasyon ve komisyonu İstanbul Welcome Card ortaklık raporundan kontrol etmelisin. Tıklamalara satın alma değeri atanmıyor.

## Butonun hangi bölümde olduğunu inceleme

Her olaya `button_position`, `offer_id`, `product`, `provider`, `language` ve `page` bilgileri eklenir. Örneğin `homepage_ticket_card`, `combo_card` ve `visit-planner`. Ürün bazındaki yukarıdaki satırlar standart Etkinlikler raporunda çalışır; ilave boyut oluşturman gerekmez.

Bölümleri ayrı bir keşif raporunda görmek istersen Analytics Yönetici → Veri görüntüleme → Özel tanımlar altında **etkinlik kapsamlı** bir özel boyut oluştur: ad “Buton konumu”, etkinlik parametresi `button_position`. Bu oturumda Analytics yönetici ekranına erişim olmadığı için özel boyut veya özel rapor oluşturulmadı. Kod bu bilgiyi gönderecek şekilde hazır. Özel boyutlar önceki verileri geriye dönük doldurmaz; yeni tanımın raporlara yansıması 24–48 saat sürebilir. Kaynak: [Google: etkinlik kapsamlı özel boyutlar](https://support.google.com/analytics/answer/14240153?hl=en).

## Doğrulama

Yerel tarayıcı kontrolünde gerçek Google etiketi `G-2YB8YFXEVD` mülküne yönelik ürün ve toplam olaylarını doğru parametrelerle hazırladı. Deneme verilerinin gerçek rapora karışmaması için gönderim istekleri yerelde durduruldu; Analytics arayüzünde veri alındığı teyit edilmiş değildir. İzin reddi, klavyeyle tıklama ve planlayıcıda sonradan oluşturulan butonlar ayrıca kontrol edildi.
