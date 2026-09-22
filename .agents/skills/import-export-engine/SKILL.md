---
name: import-export-engine
description: Kỹ năng chuyên sâu để thiết kế và hiện thực hóa bộ công cụ Nhập/Xuất dữ liệu Excel/CSV chuẩn thương mại cấp doanh nghiệp (Enterprise Master Data Import/Export Engine) cho cả Backend Java Spring Boot (Apache POI, Data Validation, In-Memory Lookup Cache, Universal Header Resolver) và Frontend Web CMS (Next.js 14).
---

# KỸ NĂNG XÂY DỰNG BỘ CÔNG CỤ IMPORT/EXPORT DỮ LIỆU CẤP DOANH NGHIỆP
# (ENTERPRISE MASTER DATA IMPORT/EXPORT ENGINE SKILL)

Tài liệu này cung cấp hướng dẫn toàn diện từ kiến trúc đến cài đặt mã nguồn cho bộ xử lý Import/Export dữ liệu hàng loạt đạt chuẩn chất lượng thương mại cấp doanh nghiệp.

---

## 1. TỔNG QUAN VÀ NGUYÊN TẮC THIẾT KẾ

Một hệ thống Import/Export dữ liệu chuẩn thương mại (tương đương SAP, Oracle ERP, Salesforce) phải đáp ứng 6 tiêu chuẩn bắt buộc:

1. **Sinh tệp mẫu động từ CSDL thực tế (Dynamic Template Generation):**
   * Tệp mẫu Excel `.xlsx` được sinh trực tiếp từ Backend theo thời gian thực.
   * Truy vấn 100% danh mục thật từ Cơ sở dữ liệu theo `tenantId` để điền vào các Sheet tham chiếu (`Reference Sheets`). **Cấm hardcode mảng dữ liệu mẫu trong mã nguồn**.
   * Cột dữ liệu trên Sheet chính được gắn Data Validation Dropdown List dẫn sang Sheet danh mục.
   * Sheet danh mục được ẩn (`HIDDEN`) để tránh người dùng làm hỏng cấu trúc.

2. **Dữ liệu mẫu đa ngôn ngữ 5 thứ tiếng (Multilingual Sample Data):**
   * Toàn bộ dữ liệu mẫu trong các dòng ví dụ (`sampleRows`) và `sampleValueI18nKey` trong `ExcelColumnSchema` được khai báo đa ngôn ngữ trên 5 thứ tiếng (Việt, Anh, Trung, Nhật, Hàn).
   * `ExcelTemplateBuilder` tự động nhận diện tiền tố `excel.sample.` và dịch động sang ngôn ngữ yêu cầu tại thời điểm tải tệp.

3. **Bộ giải mã Header vạn năng khi Import (`Universal Header Resolver`):**
   * `ExcelParserHelper.resolveHeaderIndices(headerRow, schemas)` tự động quét dòng tiêu đề thực tế và so khớp với Schema theo cả 5 ngôn ngữ, tự động chuẩn hóa chuỗi (bỏ dấu hoa thị, dấu hai chấm, khoảng trắng thừa, hoa/thường).
   * Cho phép người dùng tải tệp mẫu bằng một ngôn ngữ và nạp trên giao diện ngôn ngữ khác mà không bị lỗi lệch cột.

4. **Khử bẫy N+1 Database Query bằng In-Memory Caching:**
   * Trước khi lặp qua từng dòng của tệp nạp lên, Backend tải toàn bộ danh mục tham chiếu liên quan vào bộ nhớ trong phạm vi giao dịch (`Map<String, LookupEntity>`).
   * Mọi thao tác kiểm tra tính tồn tại và hợp lệ của khóa ngoại đều đạt độ phức tạp O(1).

5. **Xác thực 2 tầng và Triệt tiêu giá trị mặc định ảo (Zero Fake Default Values):**
   * **Tầng 1 - Cú pháp & Cấu trúc:** Kiểm tra định dạng trường, kiểu số, chuỗi, regex email, trường bắt buộc, kiểm tra trùng lặp khóa chính trong nội bộ tệp (In-file duplicate check).
   * **Tầng 2 - Toàn vẹn tham chiếu & Nghiệp vụ:** Kiểm tra khóa ngoại có tồn tại và đang hoạt động (`isActive = true`), kiểm tra trùng mã với cơ sở dữ liệu và xử lý theo cờ ghi đè `overrideExisting`.
   * **TUYỆT ĐỐI CẤM** tự ý gán giá trị mặc định khi dữ liệu nạp bị thiếu hoặc sai lệch danh mục. Bắt buộc ghi nhận lỗi vào `RowErrorDetail`.

6. **Đóng gói HTTP Response chuẩn RFC 5987 / RFC 6266:**
   * Sử dụng `ExcelHttpHelper.createAttachmentResponse(...)` tạo `Content-Disposition: attachment; filename*=UTF-8''...` với tên tệp dịch động theo `filenameI18nKey` và `targetLocale`.

---

## 2. HƯỚNG DẪN TRIỂN KHAI BACKEND JAVA SPRING BOOT

### 2.1. Cấu hình Schema Cột Excel (`ExcelColumnSchema`)
```java
List<ExcelColumnSchema> schemas = List.of(
    ExcelColumnSchema.builder()
        .key("code")
        .columnName("code")
        .headerI18nKey("excel.header.user.code")
        .headerTitle("Mã Nhân Viên (*)")
        .required(true)
        .sampleValue("EMP-001")
        .description("Mã định danh duy nhất của nhân viên")
        .build(),
    ExcelColumnSchema.builder()
        .key("fullName")
        .columnName("fullName")
        .headerI18nKey("excel.header.user.fullname")
        .headerTitle("Họ và Tên (*)")
        .required(true)
        .sampleValueI18nKey("excel.sample.user.name1")
        .sampleValue("Nguyễn Văn An")
        .description("Họ và tên đầy đủ")
        .build(),
    ExcelColumnSchema.builder()
        .key("position")
        .columnName("position")
        .headerI18nKey("excel.header.user.position")
        .headerTitle("Chức Vụ (*)")
        .required(true)
        .lookupSheetName("_DanhMuc_ChucVu")
        .lookupSheetI18nKey("excel.sheet.lookup_position")
        .sampleValueI18nKey("excel.sample.user.pos1")
        .sampleValue("Kỹ sư lắp ráp")
        .description("Chức vụ đảm nhiệm")
        .build()
);
```

### 2.2. Xây dựng Builder Sinh Tệp Mẫu Động Đa Ngôn Ngữ (`ExcelTemplateBuilder`)
```java
@Override
public byte[] generateUserImportTemplate(String tenantId) {
    Locale targetLocale = LocaleContextHolder.getLocale();
    if (targetLocale == null) {
        targetLocale = I18nConfig.LOCALE_VI;
    }

    // 1. Lấy danh mục thực tế từ Database
    List<PositionEntity> positions = positionRepository.findByTenantIdAndActiveTrue(tenantId);
    List<ExcelTemplateBuilder.LookupEntry> posEntries = positions.stream()
            .map(p -> new ExcelTemplateBuilder.LookupEntry(p.getCode(), p.getName()))
            .toList();

    return ExcelTemplateBuilder.create("NhanVien", "excel.sheet.user_import")
            .locale(targetLocale)
            .columns(getUserImportSchemas())
            .addLookupSheet("_DanhMuc_ChucVu", "excel.sheet.lookup_position", posEntries)
            .sampleRows(List.of(
                    List.of("EMP-001", "excel.sample.user.name1", "excel.sample.user.pos1", "SX-01", "Kỹ thuật", "an.nv@company.com", "0901234567"),
                    List.of("EMP-002", "excel.sample.user.name2", "excel.sample.user.pos2", "QC-01", "Quản lý chất lượng", "hoa.lt@company.com", "0912345678")
            ))
            .buildToByteArray();
}
```

### 2.3. Quy Chuẩn Đóng Gói Controller Xuất Tệp (`ExcelHttpHelper`)
```java
@GetMapping("/import/template")
public ResponseEntity<byte[]> downloadImportTemplate() {
    String tenantId = SecurityUtils.getCurrentTenantId();
    byte[] excelBytes = userManagementService.generateUserImportTemplate(tenantId);
    return ExcelHttpHelper.createAttachmentResponse(
            excelBytes,
            "excel.filename.user_template",
            "Mau_Nhap_Nhan_Vien.xlsx"
    );
}
```

### 2.4. Quy Chuẩn Xử Lý Nạp Dữ Liệu Với Universal Header Resolver (`ExcelParserHelper`)
```java
@Override
@Transactional
public ImportResultDto importUsersFromExcel(MultipartFile file, boolean overrideExisting, String tenantId, String actorId) {
    // 1. Tải trước danh mục tham chiếu vào In-Memory Lookup Cache
    Map<String, PositionEntity> posMap = positionRepository.findByTenantIdAndActiveTrue(tenantId)
            .stream().collect(Collectors.toMap(p -> p.getCode().toUpperCase(), p -> p));

    List<RowErrorDetail> errors = new ArrayList<>();
    Set<String> seenCodes = new HashSet<>();
    int insertedCount = 0;
    int overrideCount = 0;

    try (Workbook workbook = WorkbookFactory.create(file.getInputStream())) {
        Sheet sheet = workbook.getSheetAt(0);
        int lastRowNum = sheet.getLastRowNum();

        // 2. Nhận diện cột theo 5 thứ tiếng
        Row headerRow = sheet.getRow(0);
        Map<String, Integer> headerMap = ExcelParserHelper.resolveHeaderIndices(headerRow, getUserImportSchemas());

        for (int rIdx = 1; rIdx <= lastRowNum; rIdx++) {
            Row row = sheet.getRow(rIdx);
            if (ExcelParserHelper.isRowEmpty(row, 7)) continue;
            int rowNumber = rIdx + 1;

            String code = ExcelParserHelper.getCellValueByColumnKey(row, headerMap, "code").trim();
            String fullName = ExcelParserHelper.getCellValueByColumnKey(row, headerMap, "fullName").trim();
            String posCode = ExcelParserHelper.getCellValueByColumnKey(row, headerMap, "position").trim();

            // Tầng 1: Validate cú pháp
            if (code.isBlank()) {
                errors.add(new RowErrorDetail(rowNumber, "code", "", MessageUtils.getMessage("import.error.required_field", "code")));
                continue;
            }
            if (!seenCodes.add(code.toUpperCase())) {
                errors.add(new RowErrorDetail(rowNumber, "code", code, MessageUtils.getMessage("import.error.duplicate_key_in_file", code)));
                continue;
            }

            // Tầng 2: Validate khóa ngoại từ Cache
            if (!posCode.isBlank() && !posMap.containsKey(posCode.toUpperCase())) {
                errors.add(new RowErrorDetail(rowNumber, "position", posCode, MessageUtils.getMessage("import.error.reference_not_found", "position", posCode)));
                continue;
            }

            // Thực thi ghi dữ liệu theo cờ ghi đè
            // ...
        }
    } catch (Exception e) {
        log.error("Failed to parse Excel import workbook for tenant: {}", tenantId, e);
        throw new BusinessException(ErrorCode.VALIDATION_ERROR, MessageUtils.getMessage("import.error.parse_failed"));
    }

    return ImportResultDto.builder()
            .totalRows(seenCodes.size() + errors.size())
            .successCount(insertedCount + overrideCount)
            .errorCount(errors.size())
            .insertedCount(insertedCount)
            .overrideCount(overrideCount)
            .errors(errors)
            .build();
}
```

---

## 3. HƯỚNG DẪN TÍCH HỢP FRONTEND WEB CMS (NEXT.JS 14)

### 3.1. Hộp Thoại Nạp Dữ Liệu Chuẩn Hóa (`DataImportModal.tsx`)
```tsx
<DataImportModal
  isOpen={isImportModalOpen}
  onClose={() => setIsImportModalOpen(false)}
  title={t("hr.user_import_title")}
  templateDownloadUrl="/api/v1/management/users/import/template"
  templateFallbackFilename="Mau_Nhap_Nhan_Vien.xlsx"
  importUploadUrl="/api/v1/management/users/import"
  onSuccess={() => {
    fetchUsers();
    toast.success(t("common.import_success"));
  }}
/>
```

### 3.2. Giải Mã Tên Tệp RFC 5987 Trong Tầng Service (`apiClient.ts`)
```typescript
async downloadBlob(url: string, fallbackFilename: string): Promise<void> {
  const res = await this.client.get(url, { responseType: 'blob' });
  const disposition = res.headers['content-disposition'];
  let filename = fallbackFilename;

  if (disposition) {
    const filenameStarMatch = disposition.match(/filename\*=UTF-8''([^;]+)/i);
    if (filenameStarMatch && filenameStarMatch[1]) {
      filename = decodeURIComponent(filenameStarMatch[1]);
    } else {
      const filenameMatch = disposition.match(/filename="?([^";]+)"?/i);
      if (filenameMatch && filenameMatch[1]) {
        filename = filenameMatch[1];
      }
    }
  }

  const blobUrl = window.URL.createObjectURL(new Blob([res.data]));
  const link = document.createElement('a');
  link.href = blobUrl;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(blobUrl);
}
```
