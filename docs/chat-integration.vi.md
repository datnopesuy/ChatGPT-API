# API Chat Integration Contract

Tai lieu nay cung cap thong tin toi thieu de mot backend khac, vi du Spring Boot,
tich hop API chat cua ChatGPT-API theo format rieng cua project do.

Khong su dung API tao anh, sua anh, Responses API hay cac endpoint khac.

## 1. Endpoint

Base URL:

```text
http://<host>:<port>/v1
```

Vi du local:

```text
http://localhost:3000/v1
```

Chat endpoint:

```http
POST /chat/completions
```

Full URL vi du:

```text
http://localhost:3000/v1/chat/completions
```

## 2. Authentication

Moi request can co header:

```http
Authorization: Bearer <auth-key>
Content-Type: application/json
```

`<auth-key>` la gia tri `auth-key` trong `config.json`, hoac bien moi truong
`CHATGPT2API_AUTH_KEY`.

## 3. Request Body

```json
{
  "model": "gpt-5-5",
  "messages": [
    {
      "role": "system",
      "content": "Ban la tro ly AI. Tra loi ngan gon, ro rang bang tieng Viet."
    },
    {
      "role": "user",
      "content": "Hay giai thich cau dieu kien loai 2."
    }
  ]
}
```

Field can dung:

| Field | Type | Bat buoc | Ghi chu |
| --- | --- | --- | --- |
| `model` | string | Co | Khuyen nghi dung `gpt-5-5`; `auto` hien duoc map ve `gpt-5-5` |
| `messages` | array | Co | Danh sach tin nhan theo thu tu hoi thoai |
| `messages[].role` | string | Co | `system`, `user`, hoac `assistant` |
| `messages[].content` | string | Co | Noi dung tin nhan dang text |

## 4. Response Body

```json
{
  "id": "chatcmpl-xxxx",
  "object": "chat.completion",
  "created": 1720000000,
  "model": "gpt-5-5",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Cau dieu kien loai 2 dung de noi ve tinh huong khong co that o hien tai..."
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 20,
    "completion_tokens": 50,
    "total_tokens": 70
  }
}
```

Noi dung cau tra loi nam tai:

```text
choices[0].message.content
```

## 5. Curl Test

```bash
curl http://localhost:3000/v1/chat/completions \
  -H "Authorization: Bearer <auth-key>" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-5-5",
    "messages": [
      {
        "role": "user",
        "content": "Hay giai thich cau dieu kien loai 2."
      }
    ]
  }'
```

## 6. Error Format

Khi loi, response thuong co dang:

```json
{
  "error": {
    "message": "Mo ta loi",
    "type": "server_error",
    "param": null,
    "code": "bad_request"
  }
}
```

Hoac FastAPI detail:

```json
{
  "detail": {
    "error": "Mo ta loi"
  }
}
```

Backend tich hop nen doc loi theo thu tu:

```text
error.message -> detail.error -> detail -> message
```

## 7. HTTP Status Can Xu Ly

| HTTP | Y nghia | Cach xu ly goi y |
| --- | --- | --- |
| `400` | Request sai hoac bi upstream tu choi | Kiem tra payload |
| `401` | Sai hoac thieu `auth-key` | Kiem tra header Authorization |
| `429` | Het quota hoac bi rate limit | Retry sau vai giay |
| `502` | Loi upstream ChatGPT web | Retry co backoff |
| `503/504` | Tam thoi khong kha dung/timeout | Retry co backoff |

## 8. Timeout Va Retry

Khuyen nghi:

```text
connect timeout: 10s
read/request timeout: 120s - 300s
retry: 2 - 3 lan cho 429, 502, 503, 504
```

## 9. Ghi Chu Cho AI Tich Hop Ben Spring Boot

- Chi can implement HTTP client goi `POST /v1/chat/completions`.
- Khong can implement API tao anh, sua anh, upload file, streaming, Responses API.
- Mapping request/response hay class DTO tuy theo format co san cua project Spring Boot.
- Neu project da co wrapper HTTP/client service rieng, hay dung wrapper do.
- Khong hard-code `<auth-key>` trong source; nen doc tu config/env/secret.
- Server ChatGPT-API phai co it nhat mot account/token hop le trong account pool.
