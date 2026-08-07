# Yıldırım Law & Consultancy — Yayın Paketi v1.0

## Yüklenecek dosyalar
Bu klasördeki dosyaları adlarını değiştirmeden GitHub deposunun kök dizinine yükleyin. Özellikle `admin.html`, `admin.js`, `cms-public.js`, `supabase-client.js` ve `supabase-config.js` aynı klasörde bulunmalıdır.

## Mevcut Supabase projesi için tek işlem
Supabase > SQL Editor bölümünde `supabase-security-update.sql` dosyasını **bir kez** çalıştırın. Bu işlem yayın tarihini veritabanı tarafında korur ve görsel dosyalarını admin kullanıcının kendi klasörüyle sınırlar.

## Authentication kontrolü
Supabase Authentication ayarlarında yeni kullanıcı kaydı kapalı tutulmalıdır. Admin hesabı dışında kullanıcı eklemeyin.

## Makale sistemi
Demo makale yoktur. Admin panelinden yayınlanan gerçek makaleler Makaleler sayfasında listelenir; en yeni üç yayın ana sayfaya otomatik yansır. Taslaklar ziyaretçiye gösterilmez.

## Favicon / FSEK
Favicon, sitenin koyu mor kurumsal rengi kullanılarak bu paket için sıfırdan oluşturulmuş tipografik bir “Y” tasarımıdır. Hazır ikon, üçüncü kişi logosu veya ikon kütüphanesi kullanılmamıştır.

## Reklam yasağı
Metinlerde karşılaştırmalı üstünlük, başarı/sonuç garantisi, “en iyi/uzman/lider” gibi ifadeler ve müvekkil referansları kullanılmamıştır. Arama motoru reklamı veya faaliyet alanlarını reklam anahtar kelimesi olarak kullanma ayrıca değerlendirilmelidir.

## Domain kesinleşince
`canonical`, Open Graph URL ve `sitemap.xml` için gerçek domain eklenmelidir. Domain bilinmediğinden pakete varsayımsal adres yazılmamıştır.

## Dosya adları
Finder’ın eklediği `(1)` veya `(2)` uzantılı adları kullanmayın. Bu paketteki normalleştirilmiş adları aynen yükleyin.


## Code Review v1.1
- Admin paneline mevcut veritabanı alanlarıyla uyumlu İngilizce başlık, özet ve makale içeriği alanları eklendi.
- CMS makale kartları dil değişiminde yeniden oluşturulur; İngilizce alanlar varsa kullanılır, yoksa Türkçe içerik gösterilir.
- Standart hukuk alanları için İngilizce kategori karşılıkları eklendi.
- Makale detaylarında tarayıcı ileri/geri ve doğrudan `#article-slug` bağlantısı desteği güçlendirildi.
- Mobil menü erişilebilirlik etiketi TR/EN dil sistemine bağlandı.
