# Tài liệu tích hợp API Chat (ChatGPT2API)

Tài liệu này hướng dẫn tích hợp khả năng **chat văn bản** của ChatGPT2API vào một
project khác — điển hình là dịch vụ hỏi đáp TOEIC gửi câu hỏi lên và nhận lại lời
giải từ ChatGPT/GPT Plus.

ChatGPT2API cung cấp API **tương thích OpenAI**, nên hầu hết SDK/HTTP client hiện
có đều dùng được mà gần như không phải sửa gì — chỉ cần đổi `base_url` và `api_key`.

---

## 1. Thông tin kết nối

| Mục | Giá trị |
|:----|:--------|
| Base URL | `http://<host>:<port>` (mặc định Docker: `http://localhost:3000`, dev: `http://localhost:8000`) |
| Endpoint chat | `POST /v1/chat/completions` |
| Endpoint models | `GET /v1/models` |
| Xác thực | Header `Authorization: Bearer <auth-key>` |

`<auth-key>` là giá trị `auth-key` trong `config.json`, hoặc biến môi trường
`CHATGPT2API_AUTH_KEY` (biến môi trường được ưu tiên). Mặc định trong repo là
`chatgpt2api` — **phải đổi trước khi chạy thật**.

> Mọi request tới các endpoint AI đều bắt buộc có header `Authorization`. Không có
> endpoint nào chạy mà không cần xác thực.

---

## 2. Model dùng cho chat văn bản

`GET /v1/models` trả về cả model ảnh (động, theo số tài khoản đang có) và các model
văn bản cố định dưới đây:

| Model | Ghi chú |
|:------|:--------|
| `auto` | Để upstream tự chọn model phù hợp. **Khuyến nghị dùng cho TOEIC** vì ổn định nhất. |
| `gpt-5` | |
| `gpt-5-1` | |
| `gpt-5-2` | |
| `gpt-5-3` | |
| `gpt-5-3-mini` | Nhẹ, nhanh |
| `gpt-5-mini` | Nhẹ, nhanh |

Nếu không chắc chọn gì, dùng `auto`.

Backend tự động **ưu tiên tài khoản gói cao** (Pro > Enterprise > Team > Plus > …)
cho các request chat văn bản, nên lời giải TOEIC sẽ dùng tài khoản chất lượng cao
nhất còn khả dụng, chỉ tụt xuống gói thấp hơn khi các gói cao bị giới hạn.

---

## 3. Gọi cơ bản (non-stream)

### cURL

```bash
curl http://localhost:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <auth-key>" \
  -d '{
    "model": "auto",
    "messages": [
      {"role": "user", "content": "TOEIC question: The report ____ by the manager yesterday. (A) was reviewed (B) reviewed (C) reviewing (D) review. Chọn đáp án đúng và giải thích ngắn gọn."}
    ]
  }'
```

### Phản hồi (rút gọn)

```json
{
  "id": "chatcmpl-xxxx",
  "object": "chat.completion",
  "created": 1720000000,
  "model": "auto",
  "choices": [
    {
      "index": 0,
      "message": { "role": "assistant", "content": "Đáp án đúng là (A) was reviewed. ..." },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 42,
    "completion_tokens": 88,
    "total_tokens": 130
  }
}
```

Lấy câu trả lời tại `choices[0].message.content`.

---

## 4. Tích hợp bằng Python (khuyến nghị cho project TOEIC)

### 4.1 Dùng SDK `openai` (đơn giản nhất)

```python
from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:8000/v1",  # chú ý phần /v1
    api_key="<auth-key>",
)

def giai_cau_hoi_toeic(cau_hoi: str) -> str:
    resp = client.chat.completions.create(
        model="auto",
        messages=[
            {"role": "user", "content": cau_hoi},
        ],
    )
    return resp.choices[0].message.content
```

### 4.2 Dùng `requests` thuần (không cần SDK)

```python
import requests

BASE_URL = "http://localhost:8000"
AUTH_KEY = "<auth-key>"

def giai_cau_hoi_toeic(cau_hoi: str) -> str:
    resp = requests.post(
        f"{BASE_URL}/v1/chat/completions",
        headers={
            "Authorization": f"Bearer {AUTH_KEY}",
            "Content-Type": "application/json",
        },
        json={
            "model": "auto",
            "messages": [{"role": "user", "content": cau_hoi}],
        },
        timeout=300,  # ChatGPT web đôi khi trả lời chậm, để timeout rộng
    )
    resp.raise_for_status()
    data = resp.json()
    return data["choices"][0]["message"]["content"]
```

---

## 5. Streaming (SSE)

Đặt `"stream": true` để nhận từng phần câu trả lời. Response là `text/event-stream`,
mỗi sự kiện một dòng `data: {...}`, kết thúc bằng `data: [DONE]`.

```python
import json
import requests

def giai_cau_hoi_toeic_stream(cau_hoi: str):
    with requests.post(
        f"{BASE_URL}/v1/chat/completions",
        headers={"Authorization": f"Bearer {AUTH_KEY}"},
        json={
            "model": "auto",
            "stream": True,
            "messages": [{"role": "user", "content": cau_hoi}],
        },
        stream=True,
        timeout=300,
    ) as resp:
        resp.raise_for_status()
        for raw in resp.iter_lines():
            if not raw:
                continue
            line = raw.decode("utf-8", "ignore")
            if not line.startswith("data:"):
                continue
            payload = line[5:].strip()
            if payload == "[DONE]":
                break
            chunk = json.loads(payload)
            delta = chunk["choices"][0]["delta"].get("content") or ""
            if delta:
                yield delta
```

Định dạng mỗi chunk khớp OpenAI: `choices[0].delta.content`.

---

## 6. System prompt cho TOEIC

Có hai cách đặt "vai trò/hướng dẫn cố định" cho model:

### 6.1 Gửi message `system` trong từng request (linh hoạt nhất)

```python
messages = [
    {"role": "system", "content": "Bạn là giáo viên luyện thi TOEIC. Với mỗi câu hỏi, hãy trả về đáp án đúng (A/B/C/D) kèm giải thích ngắn gọn bằng tiếng Việt."},
    {"role": "user", "content": cau_hoi},
]
```

### 6.2 Cấu hình `chat_system_prompt` phía server (áp dụng cho mọi request text)

Trong `config.json`:

```json
{
  "chat_system_prompt": "Bạn là trợ lý luyện thi TOEIC. Luôn trả lời ngắn gọn, chính xác, và giải thích lý do chọn đáp án."
}
```

- `chat_system_prompt` **chỉ áp dụng cho luồng văn bản** (`/v1/chat/completions`,
  `/v1/responses`, `/v1/messages`), **không** ảnh hưởng tới sinh ảnh.
- Nó được chèn vào **đầu** danh sách messages, cộng thêm (không thay thế)
  `global_system_prompt` nếu có.
- Phù hợp khi project TOEIC không muốn tự gắn system prompt trong từng request.

---

## 7. Hội thoại nhiều lượt (multi-turn)

Gửi lại toàn bộ lịch sử trong mảng `messages`; backend không lưu trạng thái giữa các
request (stateless), nên phía client phải tự giữ lịch sử.

```python
messages = [
    {"role": "user", "content": "Câu 1: ..."},
    {"role": "assistant", "content": "Đáp án (A) vì ..."},
    {"role": "user", "content": "Vậy câu 2 thì sao: ..."},
]
```

---

## 8. Điều chỉnh mức suy luận (tùy chọn)

Có thể yêu cầu model "suy nghĩ" kỹ hơn bằng một trong các field sau (backend nhận cả ba):

```json
{ "model": "auto", "reasoning_effort": "high", "messages": [ ... ] }
```

Giá trị hợp lệ: `low`, `medium`, `high`, `xhigh` (ánh xạ nội bộ sang `extended`).
Bỏ trống để dùng mặc định. Với TOEIC, `medium`/`high` cho lời giải kỹ hơn nhưng chậm hơn.

---

## 9. Nhập ảnh (đề TOEIC dạng ảnh)

Nếu câu hỏi ở dạng ảnh (ảnh chụp đề), gửi kèm trong `content` theo chuẩn OpenAI vision:

```python
messages = [
    {
        "role": "user",
        "content": [
            {"type": "text", "text": "Đọc đề trong ảnh và chọn đáp án đúng."},
            {"type": "image_url", "image_url": {"url": "data:image/png;base64,<BASE64>"}},
        ],
    }
]
```

- Hỗ trợ `data:image/...;base64,...` hoặc URL ảnh công khai (`http(s)://...`).
- Giới hạn mỗi ảnh 10MB.
- Nhập ảnh cần tài khoản upstream đã đăng nhập (mọi tài khoản trong hồ tài khoản đều đạt).

---

## 10. Xử lý lỗi

Lỗi trả về theo cấu trúc OpenAI:

```json
{
  "error": {
    "message": "mô tả lỗi",
    "type": "invalid_request_error",
    "param": null,
    "code": "bad_request"
  }
}
```

| HTTP | type | Ý nghĩa & cách xử lý |
|:-----|:-----|:---------------------|
| 400 | `invalid_request_error` | Thiếu `messages`/`prompt`, hoặc dính bộ lọc nội dung. Kiểm tra payload. |
| 401 | `authentication_error` | Sai/thiếu `auth-key`. Kiểm tra header `Authorization`. |
| 403 | `permission_error` | Không đủ quyền (thao tác cần admin). |
| 429 | `rate_limit_error` | Tài khoản trong hồ tài khoản đều bị giới hạn. Thử lại sau, hoặc thêm tài khoản. |
| 502 | `server_error` | Lỗi upstream (ChatGPT web). Nên retry với backoff. |

Gợi ý cho project TOEIC: retry 502/429 theo hàm mũ (ví dụ 2s, 5s, 10s), tối đa 3 lần;
timeout client nên đặt ≥ 120s vì ChatGPT web có thể trả lời chậm.

Ví dụ retry:

```python
import time

def goi_co_retry(cau_hoi: str, so_lan=3) -> str:
    for lan in range(1, so_lan + 1):
        try:
            return giai_cau_hoi_toeic(cau_hoi)
        except requests.HTTPError as exc:
            status = exc.response.status_code if exc.response else 0
            if status in (429, 502, 503, 504) and lan < so_lan:
                time.sleep(2 ** lan)  # 2s, 4s, ...
                continue
            raise
    raise RuntimeError("không lấy được kết quả sau khi retry")
```

---

## 11. Các endpoint tương thích khác

Ngoài `/v1/chat/completions`, backend còn hỗ trợ (cùng khả năng text):

- `POST /v1/responses` — chuẩn OpenAI Responses API (dùng `input` thay cho `messages`).
- `POST /v1/messages` — chuẩn Anthropic Messages (dùng header `x-api-key` hoặc `Authorization`).

Với TOEIC, `/v1/chat/completions` là lựa chọn đơn giản và phổ biến nhất.

---

## 12. Checklist tích hợp nhanh

1. Đặt `auth-key` (hoặc `CHATGPT2API_AUTH_KEY`) cho server.
2. Nạp ít nhất một tài khoản vào hồ tài khoản (ưu tiên Plus/Pro cho chất lượng TOEIC).
3. (Tùy chọn) Đặt `chat_system_prompt` trong `config.json`.
4. Từ project TOEIC, trỏ `base_url` → `http://<host>:<port>/v1`, `api_key` → `<auth-key>`.
5. Gọi `POST /v1/chat/completions` với `model: "auto"` và `messages`.
6. Thêm retry cho 429/502 và timeout ≥ 120s.
