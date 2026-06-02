## نشر مجاني (مستحسن): Render + Neon + Cloudflare Pages

هذا الدليل ينشر:
- **Backend API (.NET / ABP)** على Render باستخدام Docker
- **PostgreSQL** على Neon (مجاني)
- **Angular** على Cloudflare Pages (مجاني)

> ملاحظة: SQL Server غالبًا غير متاح مجانًا؛ هذا الدليل يستخدم PostgreSQL.

---

### 1) إنشاء قاعدة بيانات Neon
1. أنشئ حساب في Neon.
2. أنشئ Project جديد (PostgreSQL).
3. انسخ **Connection string** (شكلها يكون قريبًا من):
   - `Host=...;Port=5432;Database=...;Username=...;Password=...;SSL Mode=Require;Trust Server Certificate=true`

---

### 2) نشر الـ API على Render
1. ارفع المشروع إلى GitHub.
2. في Render:
   - New → **Web Service**
   - اختر GitHub repo
   - اختر **Docker** كطريقة نشر
   - Root Directory: `aspnet-core`
3. Environment variables (Render → Environment):
   - **ASPNETCORE_ENVIRONMENT** = `Production`
   - **Database__Provider** = `PostgreSql`
   - **ConnectionStrings__Default** = (ضع connection string من Neon)
   - **App__SelfUrl** = رابط Render النهائي للـ API (بعد إنشائه)
   - **App__ClientUrl** = رابط Cloudflare Pages (بعد إنشائه)
   - **App__CorsOrigins** = رابط Cloudflare Pages (مثال: `https://your-site.pages.dev`)
   - **AuthServer__Authority** = نفس `App__SelfUrl`
   - **AuthServer__RequireHttpsMetadata** = `true`

> Render سيشغل `aspnet-core/Dockerfile` تلقائيًا.

---

### 3) تشغيل migrations (مرة واحدة)
بعد نشر الـ API وتشغيله بنجاح، يجب تشغيل `DbMigrator` على PostgreSQL لإنشاء الجداول.

أفضل طريقة:
- في جهازك محليًا:
  1. افتح `aspnet-core/src/Modiaf.Al.Arab.Hotel.DbMigrator/appsettings.json`
  2. ضع:
     - `"Database": { "Provider": "PostgreSql" }`
     - و `ConnectionStrings:Default` إلى Neon
  3. شغّل:
     - `dotnet run -c Release --project aspnet-core/src/Modiaf.Al.Arab.Hotel.DbMigrator`

---

### 4) نشر Angular على Cloudflare Pages
1. ارفع المشروع إلى GitHub (نفس repo).
2. Cloudflare Pages → Create project → اختر repo.
3. إعدادات build:
   - Framework preset: Angular
   - Build command: `npm ci && npm run build`
   - Build output directory: `angular/dist/Hotel`
4. عدّل `angular/src/environments/environment.prod.ts` ليستخدم رابط Render بدل localhost:
   - `oAuthConfig.issuer` = رابط الـ API في Render
   - `apis.default.url` = رابط الـ API في Render
   - `application.baseUrl` = رابط Cloudflare Pages

---

### 5) تحقق سريع
- افتح موقع Cloudflare Pages
- جرّب تحميل الصفحات الأساسية (dashboard / bookings / rooms)
- تأكد أن API يسمح بـ CORS من رابط Cloudflare Pages

