"use client";

import { AlertTriangle, LoaderCircle, Plus, Play, RotateCcw, Save, Square, Trash2, UserPlus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import { useSettingsStore } from "../../settings/store";

export function RegisterCard() {
  const config = useSettingsStore((state) => state.registerConfig);
  const isLoading = useSettingsStore((state) => state.isLoadingRegister);
  const isSaving = useSettingsStore((state) => state.isSavingRegister);
  const setProxy = useSettingsStore((state) => state.setRegisterProxy);
  const setTotal = useSettingsStore((state) => state.setRegisterTotal);
  const setThreads = useSettingsStore((state) => state.setRegisterThreads);
  const setMode = useSettingsStore((state) => state.setRegisterMode);
  const setTargetQuota = useSettingsStore((state) => state.setRegisterTargetQuota);
  const setTargetAvailable = useSettingsStore((state) => state.setRegisterTargetAvailable);
  const setCheckInterval = useSettingsStore((state) => state.setRegisterCheckInterval);
  const setMailField = useSettingsStore((state) => state.setRegisterMailField);
  const setMailApiUseRegisterProxy = useSettingsStore((state) => state.setRegisterMailApiUseRegisterProxy);
  const addProvider = useSettingsStore((state) => state.addRegisterProvider);
  const updateProvider = useSettingsStore((state) => state.updateRegisterProvider);
  const deleteProvider = useSettingsStore((state) => state.deleteRegisterProvider);
  const save = useSettingsStore((state) => state.saveRegister);
  const toggle = useSettingsStore((state) => state.toggleRegister);
  const reset = useSettingsStore((state) => state.resetRegister);
  const resetOutlookPool = useSettingsStore((state) => state.resetOutlookPool);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-stone-200 bg-white/80 p-10">
        <LoaderCircle className="size-5 animate-spin text-stone-400" />
      </div>
    );
  }

  if (!config) return null;

  const stats = config.stats || { success: 0, fail: 0, done: 0, running: 0, threads: config.threads };
  const providers = config.mail.providers || [];
  const logs = config.logs || [];
  const updateProviderType = (index: number, type: string) => {
    updateProvider(index, {
      type,
      enable: true,
      ...(type === "cloudmail_gen" ? { api_base: "", admin_email: "", admin_password: "", domain: [], subdomain: [], email_prefix: "" } : {}),
      ...(type === "cloudflare_temp_email" ? { api_base: "", admin_password: "", domain: [] } : {}),
      ...(type === "tempmail_lol" ? { api_key: "", domain: [] } : {}),
      ...(type === "moemail" ? { api_base: "", api_key: "", domain: [] } : {}),
      ...(type === "inbucket" ? { api_base: "", domain: [], random_subdomain: true } : {}),
      ...(type === "duckmail" ? { api_key: "", default_domain: "duckmail.sbs" } : {}),
      ...(type === "gptmail" ? { api_key: "", default_domain: "" } : {}),
      ...(type === "yyds_mail" ? { api_base: "https://maliapi.215.im/v1", api_key: "", domain: [], subdomain: "", wildcard: false } : {}),
      ...(type === "ddg_mail" ? { ddg_token: "", cf_inbox_jwt: "", cf_domain: [], admin_password: "" } : {}),
      ...(type === "outlook_token" ? { mailboxes: "", mode: "graph", imap_host: "outlook.office365.com", message_limit: 10 } : {}),
    });
  };

  return (
    <div className="grid h-[calc(100vh-132px)] min-h-[640px] items-stretch gap-0 overflow-hidden rounded-xl border border-stone-200 bg-white/70 xl:grid-cols-2">
      <section className="space-y-4 overflow-y-auto border-b border-stone-200 p-4 xl:border-r xl:border-b-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-md bg-stone-100">
                <UserPlus className="size-5 text-stone-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold tracking-tight">Cấu hình đăng ký</h2>
              </div>
            </div>
            <Button className="h-9 rounded-xl bg-stone-950 px-4 text-white hover:bg-stone-800" onClick={() => void save()} disabled={isSaving || config.enabled}>
              {isSaving ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}
              Lưu cấu hình
            </Button>
          </div>

          <div className="flex items-start gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs leading-5 text-sky-800">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <span>Nếu nhật ký đăng ký xuất hiện chặn Cloudflare, có thể bật FlareSolverr ở trang cài đặt để vượt chặn; các container Docker liên quan cần được khởi động trước.</span>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm text-stone-700">Chế độ đăng ký</label>
              <Select value={config.mode || "total"} onValueChange={(value) => setMode(value as "total" | "quota" | "available")} disabled={config.enabled}>
                <SelectTrigger className="h-10 rounded-xl border-stone-200 bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="total">Tổng số đăng ký</SelectItem>
                  <SelectItem value="quota">Hạn mức còn lại của pool</SelectItem>
                  <SelectItem value="available">Số tài khoản khả dụng</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm text-stone-700">Tổng số đăng ký</label>
              <Input value={String(config.total)} onChange={(event) => setTotal(event.target.value)} className="h-10 rounded-xl border-stone-200 bg-white" disabled={config.enabled || config.mode !== "total"} />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-stone-700">Số luồng</label>
              <Input value={String(config.threads)} onChange={(event) => setThreads(event.target.value)} className="h-10 rounded-xl border-stone-200 bg-white" disabled={config.enabled} />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-stone-700">Proxy đăng ký</label>
              <Input value={config.proxy} onChange={(event) => setProxy(event.target.value)} placeholder="http://127.0.0.1:7890" className="h-10 rounded-xl border-stone-200 bg-white" disabled={config.enabled} />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-stone-700">Hạn mức còn lại mục tiêu</label>
              <Input value={String(config.target_quota || "")} onChange={(event) => setTargetQuota(event.target.value)} className="h-10 rounded-xl border-stone-200 bg-white" disabled={config.enabled || config.mode !== "quota"} />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-stone-700">Tài khoản khả dụng mục tiêu</label>
              <Input value={String(config.target_available || "")} onChange={(event) => setTargetAvailable(event.target.value)} className="h-10 rounded-xl border-stone-200 bg-white" disabled={config.enabled || config.mode !== "available"} />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-stone-700">Khoảng kiểm tra (giây)</label>
              <Input value={String(config.check_interval || "")} onChange={(event) => setCheckInterval(event.target.value)} className="h-10 rounded-xl border-stone-200 bg-white" disabled={config.enabled || config.mode === "total"} />
            </div>
          </div>

          <div className="space-y-3 border-t border-stone-200 pt-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-stone-800">Cấu hình email</h3>
                <p className="mt-1 text-xs text-stone-500">Có thể cấu hình nhiều provider, luân phiên theo thứ tự bật.</p>
              </div>
              <Button type="button" variant="outline" className="h-9 rounded-xl border-stone-200 bg-white px-3 text-stone-700" onClick={addProvider} disabled={config.enabled}>
                <Plus className="size-4" />
                Thêm
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <label className="text-sm text-stone-700">Timeout yêu cầu</label>
                <Input value={String(config.mail.request_timeout || "")} onChange={(event) => setMailField("request_timeout", event.target.value)} className="h-10 rounded-xl border-stone-200 bg-white" disabled={config.enabled} />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-stone-700">Timeout chờ mã xác thực</label>
                <Input value={String(config.mail.wait_timeout || "")} onChange={(event) => setMailField("wait_timeout", event.target.value)} className="h-10 rounded-xl border-stone-200 bg-white" disabled={config.enabled} />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-stone-700">Khoảng poll</label>
                <Input value={String(config.mail.wait_interval || "")} onChange={(event) => setMailField("wait_interval", event.target.value)} className="h-10 rounded-xl border-stone-200 bg-white" disabled={config.enabled} />
              </div>
            </div>

            <label className="flex items-start gap-3 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700">
              <Checkbox checked={config.mail.api_use_register_proxy !== false} onCheckedChange={(checked) => setMailApiUseRegisterProxy(Boolean(checked))} disabled={config.enabled} />
              <span className="space-y-1">
                <span className="block font-medium text-stone-800">API nền dịch vụ email dùng Proxy đăng ký</span>
                <span className="block text-xs leading-5 text-stone-500">Khi tắt, API nền tảng email kết nối trực tiếp; request đăng ký OpenAI/Auth0 vẫn dùng Proxy đăng ký。</span>
              </span>
            </label>

            <div className="space-y-3">
              {providers.map((provider, index) => {
                const type = String(provider.type || "tempmail_lol");
                const domains = Array.isArray(provider.domain) ? provider.domain.map(String).join("\n") : "";
                const subdomains = Array.isArray(provider.subdomain) ? provider.subdomain.map(String).join("\n") : "";
                return (
                  <div key={index} className="space-y-3 border-t border-stone-200 pt-3 first:border-t-0 first:pt-0">
                    <div className="flex items-center justify-between gap-3">
                      <label className="flex items-center gap-3 text-sm text-stone-700">
                        <Checkbox checked={Boolean(provider.enable)} onCheckedChange={(checked) => updateProvider(index, { enable: Boolean(checked) })} disabled={config.enabled} />
                        Bật
                      </label>
                      <button type="button" className="rounded-lg p-2 text-stone-400 transition hover:bg-rose-50 hover:text-rose-500 disabled:opacity-50" onClick={() => deleteProvider(index)} disabled={config.enabled || providers.length <= 1} title="Xóa provider">
                        <Trash2 className="size-4" />
                      </button>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-sm text-stone-700">Loại</label>
                        <Select value={type} onValueChange={(value) => updateProviderType(index, value)} disabled={config.enabled}>
                          <SelectTrigger className="h-10 rounded-xl border-stone-200 bg-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cloudmail_gen">cloudmail_gen</SelectItem>
                            <SelectItem value="cloudflare_temp_email">cloudflare_temp_email</SelectItem>
                            <SelectItem value="tempmail_lol">tempmail_lol</SelectItem>
                            <SelectItem value="moemail">moemail</SelectItem>
                            <SelectItem value="inbucket">inbucket_mail</SelectItem>
                            <SelectItem value="duckmail">duckmail</SelectItem>
                            <SelectItem value="gptmail">gptmail (chưa kiểm thử)</SelectItem>
                            <SelectItem value="yyds_mail">yyds_mail</SelectItem>
                            <SelectItem value="ddg_mail">ddg_mail (email DDG + trung chuyển CF)</SelectItem>
                            <SelectItem value="outlook_token">outlook_token (pool email Outlook/Hotmail)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {type === "cloudmail_gen" || type === "cloudflare_temp_email" || type === "moemail" || type === "inbucket" || type === "yyds_mail" || type === "ddg_mail" ? (
                        <>
                          <div className="space-y-2">
                            <label className="text-sm text-stone-700">{type === "cloudmail_gen" ? "CloudMail URL" : "API Base"}</label>
                            <Input value={String(provider.api_base || "")} onChange={(event) => updateProvider(index, { api_base: event.target.value })} className="h-10 rounded-xl border-stone-200 bg-white" disabled={config.enabled} />
                          </div>
                          {type === "cloudmail_gen" ? (
                            <>
                              <div className="space-y-2">
                                <label className="text-sm text-stone-700">Email quản trị</label>
                                <Input value={String(provider.admin_email || "")} onChange={(event) => updateProvider(index, { admin_email: event.target.value })} className="h-10 rounded-xl border-stone-200 bg-white" disabled={config.enabled} />
                              </div>
                              <div className="space-y-2">
                                <label className="text-sm text-stone-700">Mật khẩu quản trị</label>
                                <Input value={String(provider.admin_password || "")} onChange={(event) => updateProvider(index, { admin_password: event.target.value })} className="h-10 rounded-xl border-stone-200 bg-white" disabled={config.enabled} />
                              </div>
                            </>
                          ) : null}
                          {type === "cloudflare_temp_email" || type === "ddg_mail" ? (
                            <div className="space-y-2">
                              <label className="text-sm text-stone-700">Admin Password</label>
                              <Input value={String(provider.admin_password || "")} onChange={(event) => updateProvider(index, { admin_password: event.target.value })} className="h-10 rounded-xl border-stone-200 bg-white" disabled={config.enabled} />
                            </div>
                          ) : null}
                        </>
                      ) : null}
                      {type === "ddg_mail" ? (
                        <>
                        <div className="space-y-2">
                          <label className="text-sm text-stone-700">DDG Token <span className="text-red-400">*</span></label>
                          <Input value={String(provider.ddg_token || "")} onChange={(event) => updateProvider(index, { ddg_token: event.target.value })} className="h-10 rounded-xl border-stone-200 bg-white" disabled={config.enabled} placeholder="Bearer Token của DuckDuckGo Email Protection" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm text-stone-700">CF Inbox JWT <span className="text-red-400">*</span></label>
                          <Input value={String(provider.cf_inbox_jwt || "")} onChange={(event) => updateProvider(index, { cf_inbox_jwt: event.target.value })} className="h-10 rounded-xl border-stone-200 bg-white" disabled={config.enabled} placeholder="JWT hộp thư cố định của backend email tạm CF (đích chuyển tiếp DDG)" />
                        </div>
                        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                          <p className="font-medium mb-1">Hướng dẫn sử dụng</p>
                          <ol className="list-decimal list-inside space-y-0.5">
                            <li>Trước tiên đăng nhập <a href="https://duckduckgo.com/email/" target="_blank" className="underline">DuckDuckGo Email Protection</a> và đặt đích chuyển tiếp là địa chỉ hộp thư CF</li>
                            <li>Lấy DDG Token từ trình duyệt DevTools → Network → request quack.duckduckgo.com <code className="bg-amber-100 px-1 rounded">Authorization: Bearer</code></li>
                            <li>Lấy CF Inbox JWT sau khi tạo hộp thư cố định ở backend email tạm CF</li>
                            <li>Mọi email nhận qua alias @duck.com sẽ chuyển tiếp về cùng một hộp thư CF, hệ thống tự khớp theo header To:</li>
                          </ol>
                        </div>
                        </>
                      ) : null}
                      {type === "inbucket" ? (
                        <label className="flex items-center gap-3 pt-8 text-sm text-stone-700">
                          <Checkbox checked={Boolean(provider.random_subdomain ?? true)} onCheckedChange={(checked) => updateProvider(index, { random_subdomain: Boolean(checked) })} disabled={config.enabled} />
                          Bật tên miền phụ ngẫu nhiên
                        </label>
                      ) : null}
                      {type === "tempmail_lol" || type === "moemail" || type === "duckmail" || type === "gptmail" || type === "yyds_mail" ? (
                        <div className="space-y-2">
                          <label className="text-sm text-stone-700">API Key</label>
                          <Input value={String(provider.api_key || "")} onChange={(event) => updateProvider(index, { api_key: event.target.value })} className="h-10 rounded-xl border-stone-200 bg-white" disabled={config.enabled} />
                        </div>
                      ) : null}
                      {type === "duckmail" || type === "gptmail" ? (
                        <div className="space-y-2">
                          <label className="text-sm text-stone-700">Default Domain</label>
                          <Input value={String(provider.default_domain || "")} onChange={(event) => updateProvider(index, { default_domain: event.target.value })} placeholder={type === "duckmail" ? "duckmail.sbs" : ""} className="h-10 rounded-xl border-stone-200 bg-white" disabled={config.enabled} />
                        </div>
                      ) : null}
                      {type === "yyds_mail" ? (
                        <>
                          <div className="space-y-2">
                            <label className="text-sm text-stone-700">Subdomain</label>
                            <Input value={String(provider.subdomain || "")} onChange={(event) => updateProvider(index, { subdomain: event.target.value })} className="h-10 rounded-xl border-stone-200 bg-white" disabled={config.enabled} />
                          </div>
                          <label className="flex items-center gap-3 pt-8 text-sm text-stone-700">
                            <Checkbox checked={Boolean(provider.wildcard)} onCheckedChange={(checked) => updateProvider(index, { wildcard: Boolean(checked) })} disabled={config.enabled} />
                            Wildcard
                          </label>
                        </>
                      ) : null}
                      {type === "outlook_token" ? (
                        <>
                          <div className="space-y-2">
                            <label className="text-sm text-stone-700">Cách đọc</label>
                            <Select value={String(provider.mode || "graph")} onValueChange={(value) => updateProvider(index, { mode: value })} disabled={config.enabled}>
                              <SelectTrigger className="h-10 rounded-xl border-stone-200 bg-white">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="graph">Graph API</SelectItem>
                                <SelectItem value="imap">IMAP (XOAUTH2)</SelectItem>
                                <SelectItem value="auto">Tự động (Graph→IMAP)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          {String(provider.mode || "graph") !== "graph" ? (
                            <div className="space-y-2">
                              <label className="text-sm text-stone-700">IMAP Host</label>
                              <Input value={String(provider.imap_host || "outlook.office365.com")} onChange={(event) => updateProvider(index, { imap_host: event.target.value })} className="h-10 rounded-xl border-stone-200 bg-white" disabled={config.enabled} />
                            </div>
                          ) : null}
                        </>
                      ) : null}
                    </div>

                    {type === "outlook_token" ? (() => {
                      const stats = (provider.mailboxes_stats || {}) as Record<string, number>;
                      const savedCount = Number(provider.mailboxes_count || 0);
                      const preview = Array.isArray(provider.mailboxes_preview) ? (provider.mailboxes_preview as string[]) : [];
                      const pendingCount = String(provider.mailboxes || "").split(/\r?\n/).filter((line) => line.includes("----") && line.split("----").length >= 4).length;
                      return (
                        <div className="space-y-2">
                          <label className="flex items-center justify-between text-sm text-stone-700">
                            <span>Nhập kho email <span className="text-red-400">*</span></span>
                            <span className="text-xs text-stone-400">Đã lưu {savedCount}{pendingCount ? ` · chờ nhập ${pendingCount}` : ""}</span>
                          </label>
                          <Textarea value={String(provider.mailboxes || "")} onChange={(event) => updateProvider(index, { mailboxes: event.target.value })} placeholder={"Mỗi dòng một email, định dạng:\nemail----mật khẩu----client_id----refresh_token\n(vì lý do bảo mật, mật khẩu/refresh_token đã lưu sẽ không hiển thị lại; ô này chỉ dùng để thêm mới hoặc ghi đè)"} className="min-h-32 rounded-xl border-stone-200 bg-white font-mono text-xs" disabled={config.enabled} />
                          <div className="flex flex-wrap items-center gap-1.5 text-xs">
                            <span className="rounded-md bg-stone-100 px-2 py-1 text-stone-600">Chưa dùng {stats.unused ?? 0}</span>
                            <span className="rounded-md bg-blue-50 px-2 py-1 text-blue-600">Đang dùng {stats.in_use ?? 0}</span>
                            <span className="rounded-md bg-emerald-50 px-2 py-1 text-emerald-700">Đã dùng {stats.used ?? 0}</span>
                            <span className="rounded-md bg-amber-50 px-2 py-1 text-amber-700">token hết hạn {stats.token_invalid ?? 0}</span>
                            <span className="rounded-md bg-rose-50 px-2 py-1 text-rose-600">Thất bại {stats.failed ?? 0}</span>
                          </div>
                          {preview.length ? (
                            <p className="text-xs text-stone-400">Email đã lưu (ẩn danh): {preview.slice(0, 8).join(", ")}{preview.length > 8 ? ` và ${preview.length} email` : ""}</p>
                          ) : null}
                          <div className="flex flex-wrap items-center gap-2">
                            <Button type="button" variant="outline" className="h-8 rounded-lg border-stone-200 bg-white px-3 text-xs text-stone-700" onClick={() => void resetOutlookPool("failed")} disabled={config.enabled}>
                              Xóa trạng thái thất bại/đang dùng
                            </Button>
                            <Button type="button" variant="outline" className="h-8 rounded-lg border-amber-200 bg-white px-3 text-xs text-amber-700 hover:bg-amber-50" onClick={() => { if (window.confirm("Bạn có chắc muốn xóa tất cả email chưa dùng khỏi kho email Outlook? Thao tác này sẽ gỡ các thông tin đăng nhập đã lưu.")) void resetOutlookPool("unused"); }} disabled={config.enabled}>
                              Xóa mục chưa dùng
                            </Button>
                            <Button type="button" variant="outline" className="h-8 rounded-lg border-rose-200 bg-white px-3 text-xs text-rose-600 hover:bg-rose-50" onClick={() => { if (window.confirm("Bạn có chắc muốn đặt lại toàn bộ trạng thái kho email Outlook? Tất cả email sẽ được đánh dấu là dùng lại được.")) void resetOutlookPool("all"); }} disabled={config.enabled}>
                              Đặt lại toàn bộ trạng thái
                            </Button>
                          </div>
                          <p className="text-xs text-stone-500">Mỗi email chỉ đăng ký thành công một lần (trạng thái lưu ở data/outlook_token_used.json). Email thất bại sẽ được ghi lý do, có thể dùng nút phía trên để giải phóng rồi thử lại.</p>
                        </div>
                      );
                    })() : null}

                    {type === "cloudmail_gen" || type === "tempmail_lol" || type === "cloudflare_temp_email" || type === "moemail" || type === "inbucket" || type === "yyds_mail" || type === "ddg_mail" ? (
                      <div className="space-y-2">
                        <label className="text-sm text-stone-700">{type === "cloudmail_gen" ? "Tên miền email" : type === "inbucket" ? "Danh sách tên miền cơ sở" : "Domain"}</label>
                        <Textarea value={domains} onChange={(event) => updateProvider(index, { domain: event.target.value.split(/[\n,]/).map((item) => item.trim()) })} placeholder={type === "cloudmail_gen" ? "Mỗi dòng một tên miền, để trống thì dùng tên miền mặc định của dịch vụ" : type === "inbucket" ? "Mỗi dòng một tên miền cơ sở, hệ thống sẽ tự tạo subdomain ngẫu nhiên" : type === "moemail" ? "Mỗi dòng một tên miền" : "Mỗi dòng một tên miền, để trống thì dùng tên miền mặc định của dịch vụ"} className="min-h-20 rounded-xl border-stone-200 bg-white font-mono text-xs" disabled={config.enabled} />
                      </div>
                    ) : null}
                    {type === "cloudmail_gen" ? (
                      <div className="space-y-2">
                        <label className="text-sm text-stone-700">Tên miền phụ (hỗ trợ nhiều)</label>
                        <Textarea value={subdomains} onChange={(event) => updateProvider(index, { subdomain: event.target.value.split(/[\n,]/).map((item) => item.trim()) })} placeholder="Mỗi dòng một tiền tố subdomain, để trống thì dùng thẳng domain chính" className="min-h-20 rounded-xl border-stone-200 bg-white font-mono text-xs" disabled={config.enabled} />
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>

      </section>

      <section className="flex min-h-0 flex-col p-4">
        <div className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold tracking-tight">Kết quả chạy</h2>
                <p className="mt-1 text-sm text-stone-500">SSE đẩy trạng thái hiện tại theo thời gian thực.</p>
              </div>
              <Badge variant={config.enabled ? "success" : "secondary"} className="rounded-md">
                {config.enabled ? "Đang chạy" : "Đã dừng"}
              </Badge>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[
                ["Thành công / Tỷ lệ", `${stats.success} / ${stats.success_rate || 0}%`],
                ["Thất bại", stats.fail],
                ["Hoàn tất", stats.done],
                ["Chạy / Luồng", `${stats.running} / ${stats.threads}`],
                ["Thời gian chạy", `${stats.elapsed_seconds || 0}s`],
                ["TB mỗi lần đăng ký", `${stats.avg_seconds || 0}s`],
                ["Hạn mức hiện tại", stats.current_quota || 0],
                ["Tài khoản bình thường", stats.current_available || 0],
              ].map(([label, value]) => (
                <div key={label} className="border border-stone-200 bg-white/70 px-3 py-2">
                  <div className="text-xs text-stone-400">{label}</div>
                  <div className="mt-1 text-base font-semibold text-stone-800">{value}</div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Button className="h-10 rounded-xl bg-stone-950 px-3 text-white hover:bg-stone-800" onClick={() => void toggle()} disabled={isSaving}>
                {isSaving ? <LoaderCircle className="size-4 animate-spin" /> : config.enabled ? <Square className="size-4" /> : <Play className="size-4" />}
                {config.enabled ? "Dừng" : "Khởi động"}
              </Button>
              <Button variant="outline" className="h-10 rounded-xl border-stone-200 bg-white px-3 text-stone-700" onClick={() => void reset()} disabled={isSaving || config.enabled}>
                <RotateCcw className="size-4" />
                Đặt lại
              </Button>
              <Button variant="outline" className="h-10 rounded-xl border-stone-200 bg-white px-3 text-stone-700" onClick={() => void save()} disabled={isSaving || config.enabled}>
                <Save className="size-4" />
                Lưu
              </Button>
            </div>
            <div className="flex items-center gap-2 border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <AlertTriangle className="size-4 shrink-0" />
              Lưu ý lưu cấu hình trước khi khởi động.
            </div>
        </div>

        <div className="mt-4 flex min-h-0 flex-1 flex-col space-y-3 overflow-hidden border-t border-stone-200 pt-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-stone-900">Nhật ký thời gian thực</h3>
                <p className="mt-1 text-xs text-amber-700">Gặp lỗi HTTP 400 v.v. thường là email bị lạm dụng và bị khóa, cần đổi email tên miền mới.</p>
              </div>
              <Badge variant="secondary" className="rounded-md">
                {logs.length}
              </Badge>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto border border-stone-200 bg-white/70 p-3 font-mono text-xs leading-6">
              {logs.length === 0 ? (
                <div className="text-stone-500">Chưa có nhật ký</div>
              ) : (
                logs.slice().reverse().map((item, index) => (
                  <div key={`${item.time}-${index}`} className={item.level === "red" ? "text-rose-600" : item.level === "green" ? "text-emerald-700" : item.level === "yellow" ? "text-amber-700" : "text-stone-700"}>
                    <span className="text-stone-400">{new Date(item.time).toLocaleTimeString()}</span>
                    <span className="pl-2">{item.text}</span>
                  </div>
                ))
              )}
            </div>
        </div>
      </section>
    </div>
  );
}
