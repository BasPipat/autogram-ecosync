# PROGRESS.md - SOCZ

## ขั้นตอนการพัฒนา (Development Steps)
- **Step 1: Asset-Light Operating Model**
  - ออกแบบระบบขนส่งแบบ Asset-Light โดยใช้รถร่วม 100%
  - กำหนดโครงสร้างข้อมูลคู่สัญญา/รถร่วมให้รองรับการขยาย fleet แบบไม่ถือครองทรัพย์สิน
- **Step 2: Access Control & Permission Matrix**
  - ออกแบบและติดตั้งระบบสิทธิ์ 5 ระดับ: `Owner`, `Admin`, `Operator`, `Corp Admin`, `Coordinator`
  - กำหนดขอบเขตการมองเห็นข้อมูลและสิทธิ์อนุมัติตามบทบาท
- **Step 3: Carbon Ledger Long-Term Storage**
  - พัฒนาระบบ Carbon Ledger สำหรับบันทึกย้อนหลังได้ 10 ปี
  - กำหนดนโยบาย retention, indexing และ retrieval ให้ค้นย้อนหลังได้เร็ว
- **Step 4: GPS Workflow via Line OA**
  - พัฒนาระบบรับพิกัด GPS ผ่าน Line OA เฉพาะช่วงรับงาน (job-active window)
  - ปิดการติดตามนอกช่วงงานเพื่อลดต้นทุนและคุ้มครองความเป็นส่วนตัว
- **Step 5: Premium UI System**
  - ปรับดีไซน์ระบบเป็นโทนพรีเมียม `Deep Navy Blue` + `Eco Green`
  - สร้างมาตรฐาน UI tokens (สีหลัก, สีรอง, contrast) ให้ใช้สม่ำเสมอทั้งระบบ

## กฎเหล็กเพื่อความประหยัด (Cost-Saving Iron Rules)
1. **Batching:** รวมงานย่อยให้เป็น 1 คำสั่งใหญ่เพื่อลดรอบสั่งงาน
2. **Audit before Apply:** ส่งโค้ดผ่าน `bridge-send.ps1` ให้ Auditor ตรวจ Logic ก่อน Apply
3. **Log-Centric:** ใช้ `PROGRESS.md` เป็นจุดอ้างอิงหลัก ลดการสแกนไฟล์ที่ไม่จำเป็น

## บันทึกประวัติการทำงาน (Project Log)
- **[Completed]:** ติดตั้งระบบ **Agent Bridge** (PowerShell Scripts) และตั้งค่า Terminal แยกส่วน
- **[Current Status]:** พร้อมเริ่ม Step 1 (Database Modeling)

## วิธีใช้งานที่ประหยัดเงินที่สุด
เมื่อจะเริ่มงานต่อ ให้พิมพ์ใน Cursor Chat:
`@PROGRESS.md ทำต่อใน Step [เลขขั้นตอน] โดยให้รวบรวมงาน [บอกรายละเอียดงานย่อย] เข้าด้วยกันในครั้งเดียว`
