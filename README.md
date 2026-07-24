# Yıldırım Law & Consultancy – Supabase Makale Yönetimi

## Dosyalar
- `index.html`: Ziyaretçi sitesi ve dinamik makaleler
- `admin.html`: Yönetici girişi ve makale yönetimi
- `supabase-config.js`: Proje URL ve publishable key
- `supabase-setup.sql`: Tablo, RLS ve Storage kurulum komutları

## Kurulum
1. Supabase üzerinde yeni proje oluşturun.
2. SQL Editor bölümünde `supabase-setup.sql` içeriğini çalıştırın.
3. Authentication > Users bölümünden kendi e-posta adresinizle bir kullanıcı oluşturun.
4. Kullanıcının UUID değerini kopyalayın ve SQL dosyasının sonundaki `insert into public.admin_users...` komutunu gerçek UUID ile ayrıca çalıştırın.
5. Authentication ayarlarında **Allow new users to sign up** seçeneğini kapatın.
6. Project Settings > API bölümünden Project URL ve **publishable key** değerlerini alın; `supabase-config.js` içine yazın. `service_role` anahtarını hiçbir dosyaya koymayın.
7. Klasörü Netlify, Cloudflare Pages, GitHub Pages veya kendi hostinginize yükleyin. `file://` ile açmak yerine bir web sunucusunda çalıştırın. Yerel test için klasörde `python3 -m http.server 8080` çalıştırıp `http://localhost:8080` adresini açabilirsiniz.
8. `admin.html` sayfasından giriş yaparak makale ekleyin.

## Güvenlik
- Yazma, düzenleme ve silme yetkisi RLS ile yalnızca `admin_users` tablosunda bulunan hesaba verilir.
- Ziyaretçiler yalnızca `published` durumundaki makaleleri okuyabilir.
- Görseller 5 MB ile ve JPEG/PNG/WebP türleriyle sınırlandırılmıştır.
- Admin kayıt sayfası yoktur; Supabase üzerinde yeni kullanıcı kaydı kapatılmalıdır.
- Makale içerik alanı HTML kabul eder. Admin hesabını yalnızca siz kullanın ve dışarıdan alınan HTML'i kontrol etmeden yapıştırmayın.
