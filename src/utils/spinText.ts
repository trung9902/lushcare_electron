/**
 * LushCare Electron - Nested Spin Text Engine
 * Hỗ trợ bóc tách cú pháp Spin Text lồng nhau đa tầng: {A|{B|C}}
 * Ví dụ: "{Xin chào|Chào {anh|chị}}! Chúc {ngày mới|buổi sáng} {an lành|vui vẻ}."
 */

/**
 * Phân tích và sinh ngẫu nhiên một biến thể văn bản từ chuỗi mẫu Spin Text.
 * Thuật toán bóc tách từ tầng trong cùng (innermost) ra ngoài bằng regex lặp.
 * 
 * @param template Chuỗi chứa cú pháp spin text {A|B|C}
 * @returns Chuỗi văn bản sau khi đã giải mã spin text
 */
export function spinText(template: string | null | undefined): string {
  if (!template) {
    return '';
  }

  // Regex tìm các khối spin trong cùng (không chứa ký tự { hoặc } bên trong)
  const innerSpinRegex = /\{([^{}]+)\}/;
  let result = template;
  let iterations = 0;
  const maxIterations = 100; // Bảo vệ chống vòng lặp vô tận khi cú pháp lỗi

  while (innerSpinRegex.test(result) && iterations < maxIterations) {
    result = result.replace(innerSpinRegex, (_match, choicesStr: string) => {
      // Tách các lựa chọn bởi dấu '|'
      const choices = choicesStr.split('|');
      if (choices.length === 0) {
        return '';
      }
      const randomIndex = Math.floor(Math.random() * choices.length);
      return choices[randomIndex];
    });
    iterations++;
  }

  return result;
}

/**
 * Sinh danh sách N biến thể ngẫu nhiên từ mẫu Spin Text để người dùng xem trước.
 * 
 * @param template Chuỗi mẫu Spin Text
 * @param count Số lượng biến thể cần sinh (mặc định: 5)
 * @returns Mảng các biến thể duy nhất (hoặc tối đa theo count)
 */
export function generateSpinVariations(template: string, count: number = 5): string[] {
  if (!template) {
    return [];
  }

  const variations = new Set<string>();
  const maxAttempts = count * 10;
  let attempts = 0;

  while (variations.size < count && attempts < maxAttempts) {
    const text = spinText(template);
    variations.add(text);
    attempts++;
  }

  // Nếu không đủ biến thể do mẫu ít lựa chọn, trả về những biến thể đã tạo
  return Array.from(variations);
}

/**
 * Kiểm tra xem chuỗi có chứa cú pháp spin text hay không.
 */
export function hasSpinSyntax(text: string): boolean {
  return /\{[^{}]+\}/.test(text);
}

export default spinText;
