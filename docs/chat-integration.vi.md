# API Chat Integration Contract

Tai lieu nay cung cap thong tin toi thieu de mot backend khac, vi du Spring Boot,
tich hop API chat va API tao anh cua ChatGPT-API theo format rieng cua project do.

Khong su dung API sua anh, Responses API hay cac endpoint khac neu khong co nhu cau rieng.

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

Image generation endpoint:

```http
POST /images/generations
```

Full URL vi du:

```text
http://localhost:3000/v1/chat/completions
```

Full URL tao anh vi du:

```text
http://localhost:3000/v1/images/generations
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
  "model": "gpt-5.6-sol",
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
| `model` | string | Co | Khuyen nghi dung `gpt-5.6-sol`; `auto` hien duoc map ve `gpt-5.6-sol` |
| `messages` | array | Co | Danh sach tin nhan theo thu tu hoi thoai |
| `messages[].role` | string | Co | `system`, `user`, hoac `assistant` |
| `messages[].content` | string | Co | Noi dung tin nhan dang text |

## 4. Response Body

```json
{
  "id": "chatcmpl-xxxx",
  "object": "chat.completion",
  "created": 1720000000,
  "model": "gpt-5.6-sol",
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
    "model": "gpt-5.6-sol",
    "messages": [
      {
        "role": "user",
        "content": "Hay giai thich cau dieu kien loai 2."
      }
    ]
  }'
```

## 6. API Tao Anh

Endpoint:

```http
POST /images/generations
```

Full URL local:

```text
http://localhost:3000/v1/images/generations
```

Request body:

```json
{
  "model": "gpt-image-2",
  "prompt": "Mot thanh pho tuong lai ve dem, anh cinematic, chi tiet cao",
  "n": 1,
  "size": "1024x1024",
  "quality": "auto",
  "response_format": "b64_json"
}
```

Field can dung:

| Field | Type | Bat buoc | Ghi chu |
| --- | --- | --- | --- |
| `model` | string | Co | Khuyen nghi dung `gpt-image-2`; co the dung `codex-gpt-image-2` neu tai khoan ho tro |
| `prompt` | string | Co | Mo ta anh can tao |
| `n` | number | Khong | So anh can tao, backend gioi han `1-4`, mac dinh `1` |
| `size` | string/null | Khong | Vi du `1024x1024`; co the bo trong de backend/upstream tu chon |
| `quality` | string | Khong | Mac dinh `auto` |
| `response_format` | string | Khong | Mac dinh `b64_json`; response van co them `url` local neu tao anh thanh cong |

Curl test:

```bash
curl http://localhost:3000/v1/images/generations \
  -H "Authorization: Bearer <auth-key>" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-image-2",
    "prompt": "Mot thanh pho tuong lai ve dem, anh cinematic, chi tiet cao",
    "n": 1,
    "response_format": "b64_json"
  }'
```

Response thanh cong thuong co dang:

```json
{
  "created": 1720000000,
  "data": [
    {
      "b64_json": "<base64-image>",
      "url": "http://localhost:3000/generated/xxxx.png",
      "revised_prompt": "Mot thanh pho tuong lai ve dem..."
    }
  ],
  "usage": {
    "input_tokens": 20,
    "output_tokens": 4160,
    "total_tokens": 4180
  }
}
```

Backend tich hop co the lay anh theo thu tu:

```text
data[0].url -> data[0].b64_json
```

Neu dung `b64_json`, can decode base64 thanh file PNG/JPEG o backend hoac frontend cua ban.

## 7. Error Format

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

## 8. HTTP Status Can Xu Ly

| HTTP | Y nghia | Cach xu ly goi y |
| --- | --- | --- |
| `400` | Request sai hoac bi upstream tu choi | Kiem tra payload |
| `401` | Sai hoac thieu `auth-key` | Kiem tra header Authorization |
| `429` | Het quota hoac bi rate limit | Retry sau vai giay |
| `502` | Loi upstream ChatGPT web | Retry co backoff |
| `503/504` | Tam thoi khong kha dung/timeout | Retry co backoff |

## 9. Timeout Va Retry

Khuyen nghi:

```text
connect timeout: 10s
read/request timeout: 120s - 300s
retry: 2 - 3 lan cho 429, 502, 503, 504
```

## 10. Ghi Chu Cho AI Tich Hop Ben Spring Boot

- Neu chi dung chat, implement HTTP client goi `POST /v1/chat/completions`.
- Neu can tao anh, implement them HTTP client goi `POST /v1/images/generations`.
- Khong can implement API sua anh, upload file, streaming, Responses API neu project khong dung cac chuc nang do.
- Mapping request/response hay class DTO tuy theo format co san cua project Spring Boot.
- Neu project da co wrapper HTTP/client service rieng, hay dung wrapper do.
- Khong hard-code `<auth-key>` trong source; nen doc tu config/env/secret.
- Server ChatGPT-API phai co it nhat mot account/token hop le trong account pool.
