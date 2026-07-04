"use client";

import { useEffect, useState } from "react";
import { ChevronDown, FileArchive, FileText, KeyRound, ListChecks, type LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import webConfig from "@/constants/common-env";
import { getStoredAuthSession } from "@/store/auth";

type ParamRow = [string, string, string];

type ApiDoc = {
  title: string;
  method: string;
  path: string;
  icon: LucideIcon;
  input: ParamRow[];
  output: ParamRow[];
  example: (baseUrl: string, key: string) => string;
};

const docs: ApiDoc[] = [
  {
    title: "Danh sách model",
    method: "GET",
    path: "/v1/models",
    icon: ListChecks,
    input: [
      ["Authorization", "header", "Bearer <auth-key>。"],
    ],
    output: [
      ["data", "array", "Danh sách model, gồm id, object, created, owned_by."],
    ],
    example: (baseUrl: string, key: string) => `curl ${baseUrl}/models \\
  -H "Authorization: Bearer ${key}"`,
  },
  {
    title: "Chat completion",
    method: "POST",
    path: "/v1/chat/completions",
    icon: FileText,
    input: [
      ["model", "string", "Tên model, ví dụ gpt-5-mini, cũng dùng cho tình huống tương thích ảnh."],
      ["messages", "array", "Mảng messages tương thích OpenAI."],
      ["stream", "boolean", "Tùy chọn, có trả về dạng stream hay không."],
      ["n", "number", "Tùy chọn, tình huống tương thích ảnh sẽ hiểu là số lượng ảnh tạo."],
    ],
    output: [
      ["id", "string", "ID phản hồi."],
      ["choices", "array", "choices tương thích OpenAI."],
      ["usage", "object", "Tùy chọn, thông tin sử dụng token."],
    ],
    example: (baseUrl: string, key: string) => `curl ${baseUrl}/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${key}" \\
  -d '{"model":"gpt-5-mini","messages":[{"role":"user","content":"Xin chào"}]}'`,
  },
  {
    title: "Responses",
    method: "POST",
    path: "/v1/responses",
    icon: FileText,
    input: [
      ["model", "string", "Tên model."],
      ["input", "string | array | object", "Đầu vào của người dùng, sinh ảnh sẽ trích prompt từ đây."],
      ["tools", "array", "Tùy chọn, định nghĩa tool Responses."],
      ["stream", "boolean", "Tùy chọn, có trả về dạng stream hay không."],
    ],
    output: [
      ["id", "string", "ID phản hồi."],
      ["output", "array", "Đầu ra tương thích Responses."],
      ["status", "string", "Trạng thái phản hồi."],
    ],
    example: (baseUrl: string, key: string) => `curl ${baseUrl}/responses \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${key}" \\
  -d '{"model":"gpt-5-mini","input":"Tạo một bức ảnh thành phố tương lai"}'`,
  },
  {
    title: "Tìm kiếm",
    method: "POST",
    path: "/v1/search",
    icon: ListChecks,
    input: [
      ["prompt", "string", "Câu hỏi tìm kiếm hoặc chỉ thị truy vấn."],
    ],
    output: [
      ["answer", "string", "Nội dung trả lời sau khi tìm kiếm, các trường cụ thể theo kết quả trả về."],
      ["sources", "array", "Tùy chọn, nguồn trích dẫn tìm kiếm."],
      ["_account_email", "string", "Email tài khoản dùng cho lần này."],
    ],
    example: (baseUrl: string, key: string) => `curl ${baseUrl}/search \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${key}" \\
  -d '{"prompt":"Tìm cách dùng chatgpt2api mới nhất"}'`,
  },
  {
    title: "Sinh ảnh",
    method: "POST",
    path: "/v1/images/generations",
    icon: FileArchive,
    input: [
      ["prompt", "string", "Prompt sinh ảnh."],
      ["model", "string", "Tùy chọn, mặc định gpt-image-2."],
      ["n", "number", "Tùy chọn, số lượng tạo, hiện giới hạn 1-4."],
      ["size", "string", "Tùy chọn, kích thước ảnh."],
      ["quality", "string", "Tùy chọn, mặc định auto."],
      ["response_format", "string", "Tùy chọn, mặc định b64_json."],
    ],
    output: [
      ["data", "array", "Danh sách ảnh kết quả."],
      ["data[].b64_json", "string", "Nội dung ảnh base64."],
      ["data[].url", "string", "Một số cấu hình trả về URL ảnh."],
    ],
    example: (baseUrl: string, key: string) => `curl ${baseUrl}/images/generations \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${key}" \\
  -d '{"model":"gpt-image-2","prompt":"Một áp phích sản phẩm tối giản","n":1}'`,
  },
  {
    title: "Chỉnh sửa ảnh",
    method: "POST",
    path: "/v1/images/edits",
    icon: FileArchive,
    input: [
      ["image", "file | file[] | URL", "Ảnh tham chiếu, hỗ trợ upload multipart, cũng hỗ trợ link ảnh JSON."],
      ["prompt", "string", "Prompt chỉnh sửa."],
      ["model", "string", "Tùy chọn, mặc định gpt-image-2."],
      ["n", "number", "Tùy chọn, số lượng tạo, hiện giới hạn 1-4."],
      ["size", "string", "Tùy chọn, kích thước ảnh."],
      ["quality", "string", "Tùy chọn, mặc định auto."],
    ],
    output: [
      ["data", "array", "Danh sách ảnh kết quả sau khi chỉnh sửa."],
      ["data[].b64_json", "string", "Nội dung ảnh base64."],
      ["data[].url", "string", "Một số cấu hình trả về URL ảnh."],
    ],
    example: (baseUrl: string, key: string) => `curl ${baseUrl}/images/edits \\
  -H "Authorization: Bearer ${key}" \\
  -F "model=gpt-image-2" \\
  -F "prompt=Đổi thành cảnh đêm cyberpunk" \\
  -F "image=@./input.png"`,
  },
  {
    title: "Tạo tác vụ PPT",
    method: "POST",
    path: "/v1/ppt/generations",
    icon: FileText,
    input: [
      ["prompt", "string", "Mô tả yêu cầu PPT, có thể để trống nhưng nên điền đầy đủ chủ đề, số trang, phong cách và cấu trúc nội dung."],
      ["base64_images", "string[]", "Tùy chọn, data URL/base64 ảnh, dùng làm tư liệu tham chiếu PPT."],
      ["client_task_id", "string", "Tùy chọn, ID tác vụ idempotent phía client; gửi lại cùng ID sẽ trả về tác vụ đã có."],
    ],
    output: [
      ["id / taskId", "string", "ID tác vụ, dùng để poll trạng thái."],
      ["status", "queued | running | success | error", "Trạng thái tác vụ."],
      ["kind", "ppt", "Loại tác vụ."],
      ["created_at / updated_at", "string", "Thời gian tạo và cập nhật tác vụ."],
    ],
    example: (baseUrl: string, key: string) => `curl ${baseUrl}/ppt/generations \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${key}" \\
  -d '{"prompt":"Tạo một PPT báo cáo kinh doanh quý trong 8 trang","base64_images":[]}'`,
  },
  {
    title: "Tạo tác vụ PSD",
    method: "POST",
    path: "/v1/psd/generations",
    icon: FileArchive,
    input: [
      ["prompt", "string", "Yêu cầu tách và ghép PSD, ví dụ giữ layer, vị trí, nền và zip tư liệu."],
      ["base64_images", "string[]", "Bắt buộc, ít nhất một data URL/base64 ảnh, làm ảnh nguồn tách PSD."],
      ["client_task_id", "string", "Tùy chọn, ID tác vụ idempotent phía client."],
    ],
    output: [
      ["id / taskId", "string", "ID tác vụ, dùng để poll trạng thái."],
      ["status", "queued | running | success | error", "Trạng thái tác vụ."],
      ["kind", "psd", "Loại tác vụ."],
      ["error", "string", "Trả về thông tin lỗi khi thất bại."],
    ],
    example: (baseUrl: string, key: string) => `curl ${baseUrl}/psd/generations \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${key}" \\
  -d '{"prompt":"Tách các phần tử áp phích theo vị trí ảnh gốc và ghép thành PSD có thể chỉnh sửa","base64_images":["data:image/png;base64,..."]}'`,
  },
  {
    title: "Truy vấn trạng thái tác vụ",
    method: "GET",
    path: "/v1/editable-file-tasks?ids={taskId1,taskId2}",
    icon: ListChecks,
    input: [
      ["ids", "string", "Tùy chọn, ID tác vụ phân tách bằng dấu phẩy; nếu không truyền thì trả về mọi tác vụ tệp có thể chỉnh sửa của người dùng hiện tại."],
    ],
    output: [
      ["items", "array", "Danh sách tác vụ. result của tác vụ thành công chứa primary_url và zip_url."],
      ["missing_ids", "string[]", "Khi truy vấn ids cụ thể, trả về ID tác vụ không tìm thấy."],
      ["result.primary_url", "string", "Địa chỉ tải tệp chính."],
      ["result.zip_url", "string", "Địa chỉ tải zip tư liệu."],
    ],
    example: (baseUrl: string, key: string) => `curl "${baseUrl}/editable-file-tasks?ids=<task_id>" \\
  -H "Authorization: Bearer ${key}"`,
  },
  {
    title: "Tải tệp kết quả",
    method: "GET",
    path: "/files/{file_path}",
    icon: FileArchive,
    input: [
      ["file_path", "string", "Trả về từ result.primary_url hoặc result.zip_url của tác vụ, thường không cần ghép thủ công."],
    ],
    output: [
      ["binary", "file", "Trả về luồng tệp pptx/psd/zip."],
    ],
    example: (baseUrl: string, _key: string) => `curl ${baseUrl.replace(/\/v1$/, "")}/files/<file_path> -o result.zip`,
  },
];

const usableModels = ["gpt-image-2", "codex-gpt-image-2", "auto", "gpt-5", "gpt-5-1", "gpt-5-2", "gpt-5-3", "gpt-5-3-mini", "gpt-5-mini"];

function ParamTable({ rows }: { rows: ParamRow[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-stone-200">
      <table className="w-full text-left text-xs">
        <thead className="bg-stone-50 text-stone-500">
          <tr>
            <th className="px-3 py-2 font-medium">Tham số</th>
            <th className="px-3 py-2 font-medium">Loại</th>
            <th className="px-3 py-2 font-medium">Mô tả</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100 bg-white">
          {rows.map(([name, type, desc]) => (
            <tr key={name}>
              <td className="px-3 py-2 font-mono text-stone-800">{name}</td>
              <td className="px-3 py-2 font-mono text-stone-500">{type}</td>
              <td className="px-3 py-2 text-stone-600">{desc}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ApiDocsCard() {
  const [authKey, setAuthKey] = useState("");
  const serviceBaseUrl = webConfig.apiUrl.replace(/\/$/, "") || (typeof window !== "undefined" ? window.location.origin : "");
  const openAIBaseUrl = `${serviceBaseUrl}/v1`;
  const displayKey = authKey || "<khóa hiện tại>";

  useEffect(() => {
    let active = true;
    void getStoredAuthSession().then((session) => {
      if (active) setAuthKey(session?.key || "");
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <Card className="rounded-2xl border-white/80 bg-white/90 shadow-sm">
      <CardContent className="space-y-5 p-6">
        <div>
          <div className="flex items-center gap-2 text-base font-semibold text-stone-900">
            <KeyRound className="size-5 text-stone-500" />
            Hướng dẫn tích hợp API
          </div>
          <p className="mt-1 text-xs leading-6 text-stone-500">
            Ứng dụng bên thứ ba tích hợp theo API tương thích OpenAI; API tác vụ tệp cũng dùng chung cơ chế xác thực này.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1 rounded-xl border border-stone-200 bg-white px-3 py-2">
            <div className="text-xs text-stone-500">Địa chỉ dịch vụ</div>
            <div className="break-all font-mono text-xs text-stone-800">{serviceBaseUrl}</div>
          </div>
          <div className="space-y-1 rounded-xl border border-stone-200 bg-white px-3 py-2">
            <div className="text-xs text-stone-500">Base URL（OpenAI）</div>
            <div className="break-all font-mono text-xs text-stone-800">{openAIBaseUrl}</div>
          </div>
          <div className="space-y-1 rounded-xl border border-stone-200 bg-white px-3 py-2">
            <div className="text-xs text-stone-500">API Key</div>
            <div className="break-all font-mono text-xs text-stone-800">{displayKey}</div>
          </div>
          <div className="space-y-1 rounded-xl border border-stone-200 bg-white px-3 py-2">
            <div className="text-xs text-stone-500">Header yêu cầu</div>
            <div className="break-all font-mono text-xs text-stone-800">Authorization: Bearer {displayKey}</div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-xs font-medium text-stone-600">Model thường dùng, cũng có thể gọi /v1/models để lấy</div>
          <div className="flex flex-wrap gap-2">
            {usableModels.map((model) => (
              <span key={model} className="rounded-md border border-stone-200 bg-white px-2 py-1 font-mono text-xs text-stone-700">{model}</span>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {docs.map((item) => {
            const Icon = item.icon;
            return (
              <details key={item.path} className="group rounded-xl border border-stone-200 bg-white px-4 py-3">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-stone-600">
                      <Icon className="size-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-stone-900">{item.title}</span>
                      <span className="mt-1 block truncate font-mono text-xs text-stone-500">{item.method} {item.path}</span>
                    </span>
                  </span>
                  <ChevronDown className="size-4 shrink-0 text-stone-400 transition group-open:rotate-180" />
                </summary>

                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  <div className="space-y-2">
                    <h3 className="text-xs font-semibold text-stone-700">Tham số đầu vào</h3>
                    <ParamTable rows={item.input} />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xs font-semibold text-stone-700">Tham số đầu ra</h3>
                    <ParamTable rows={item.output} />
                  </div>
                  <div className="space-y-2 lg:col-span-2">
                    <h3 className="text-xs font-semibold text-stone-700">Ví dụ gọi</h3>
                    <pre className="overflow-auto whitespace-pre-wrap break-all rounded-xl bg-stone-950 px-3 py-3 text-xs leading-5 text-stone-100">{item.example(openAIBaseUrl, displayKey)}</pre>
                  </div>
                </div>
              </details>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
