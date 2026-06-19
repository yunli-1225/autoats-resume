export function cleanLLMResponse(rawText: string): string {
  if (typeof rawText !== "string") {
    throw new Error("AI返回格式异常：非文本内容");
  }
  let text = (typeof rawText === 'string' ? rawText : '').trim();
  text = text.replace(/```json|```/g, '');
  const startIdx = text.indexOf('{');
  const endIdx = text.lastIndexOf('}');
  if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) {
    throw new Error('未识别到有效JSON结构');
  }
  return text.slice(startIdx, endIdx + 1);
}
