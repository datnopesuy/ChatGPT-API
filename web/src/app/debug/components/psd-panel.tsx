"use client";

import { EditableFilePanel } from "./editable-file-panel";

const defaultPrompt = "Tách các phần tử của poster theo vị trí gốc và ghép thành file PSD có thể chỉnh sửa, giữ nguyên nền và vị trí lớp của từng phần tử, đồng thời xuất file zip chứa tài nguyên của từng lớp.";

export function PsdPanel() {
  return <EditableFilePanel title="Tạo PSD" kind="psd" endpoint="/v1/psd/generations" defaultPrompt={defaultPrompt} imageRequired />;
}
