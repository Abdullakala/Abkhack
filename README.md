# Abkhack — AI-integrated IDE

بيئة تطوير متكاملة تعمل في المتصفح ومُدمجة بوكيل ذكاء اصطناعي (Anthropic Claude) لكتابة الكود ومراجعته وتشغيله داخل Sandbox آمن.

## البنية

| المكوّن | الوصف |
| -- | -- |
| `frontend/` | تطبيق Next.js 14 (React + TypeScript + Tailwind) يحتوي على Monaco Editor ولوحة محادثة ولوحة خرج. |
| `backend/`  | خدمة FastAPI تُدير نظام الملفات وتشغيل الكود وتتواصل مع Anthropic Claude. |
| `sandbox/`  | صورة Docker صغيرة تُشغَّل لكل تنفيذ كود (Python + Node 20) مع `--network=none` وحدود CPU/RAM. |
| `docker-compose.yml` | يربط الثلاثة معاً للتشغيل المحلي. |

## المتطلبات

- Docker + Docker Compose
- مفتاح `ANTHROPIC_API_KEY`

## التشغيل السريع

```bash
cp .env.example .env
# عدّل ANTHROPIC_API_KEY داخل .env

# ابنِ صورة الـ Sandbox مرة واحدة
docker compose --profile build-only build sandbox

# شغّل الواجهة والخادم
docker compose up --build
```

ثم افتح <http://localhost:3000>.

## أوامر مفيدة

```bash
# فحص/بناء الواجهة الأمامية محلياً
cd frontend && npm install && npm run lint && npm run typecheck && npm run build

# فحص/اختبار الخادم محلياً
cd backend && pip install -e '.[dev]' && ruff check . && pytest
```

## نقاط النهاية (API)

- `GET  /api/health`
- `GET  /api/files?path=…` — شجرة الملفات
- `GET  /api/files/read?path=…`
- `PUT  /api/files/write` `{path, content}`
- `DELETE /api/files?path=…`
- `POST /api/run` `{language, code? | path?, stdin?}`
- `POST /api/agent/chat` — SSE: `event: delta|tool_use|tool_result|done|error`

## الأمان (MVP)

- جميع المسارات محصورة داخل `workspace/`.
- تنفيذ الكود يجري داخل حاوية Docker مؤقتة بـ `--network=none`، `--read-only`، حدود ذاكرة/CPU ومهلة زمنية.
- لا تُحفظ مفاتيح API إلا في متغيرات البيئة.

## الحدود المعروفة

- لا يوجد نظام مستخدمين متعدد.
- التنفيذ محصور بـ Python و Node.js في هذا الإصدار.
- الطرفية التفاعلية ليست جزءاً من الـ MVP (مخططة).
