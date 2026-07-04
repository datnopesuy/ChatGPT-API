"use client";

import { EditableFilePanel } from "./editable-file-panel";

const defaultPrompt = "Cần tạo một bản PPT «Báo cáo vận hành thương mại điện tử Q2/2026» dùng cho cuộc họp quý của ban lãnh đạo công ty, tổng số trang trong khoảng 8 trang, phong cách thiên về công nghệ - doanh nghiệp. Tập trung thể hiện tăng trưởng doanh số, tăng trưởng người dùng, hiệu quả quảng cáo và thành quả sự kiện 618, trình bày qua biểu đồ đường, biểu đồ cột, biểu đồ vành khuyên và biểu đồ phễu.";

export function PptPanel() {
  return <EditableFilePanel title="Tạo PPT" kind="ppt" endpoint="/v1/ppt/generations" defaultPrompt={defaultPrompt} />;
}
