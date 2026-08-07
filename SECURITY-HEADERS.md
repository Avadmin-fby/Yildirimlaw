# Hosting güvenlik başlıkları

`_headers` dosyası Netlify/Cloudflare Pages uyumlu örnek başlıkları içerir. GitHub Pages özel HTTP güvenlik başlıklarını doğrudan desteklemez. Cloudflare kullanılıyorsa aynı başlıklar **Rules > Transform Rules > Modify Response Header** bölümünden tanımlanabilir.

Tam bir Content-Security-Policy, mevcut tek dosyalı yapıda bulunan inline CSS/JavaScript nedeniyle bu sürümde zorunlu tutulmadı. İleride CSS ve JavaScript ayrı dosyalara taşındığında nonce/hash tabanlı CSP eklenmesi önerilir.
