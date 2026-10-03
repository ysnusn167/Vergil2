# cf-vpn-installer

نصب‌کننده‌ی خودکار پنل VLESS روی اکانت کلادفلر کاربر.

## دیپلوی
    npm i -g wrangler
    wrangler login
    wrangler deploy

بعد از دیپلوی، آدرس workers.dev رو باز کن و اطلاعات اکانت کلادفلر رو وارد کن.

## ساختار
- src/index.js: بک‌اند نصب‌کننده (API کلادفلر)
- src/index.html: صفحه‌ی نصب
- src/vpn-worker.txt: کد Worker ای که روی اکانت کاربر نصب میشه
- src/panel.html: پنل مدیریت داخل اون Worker
