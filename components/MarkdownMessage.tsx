'use client';

import React from 'react';

/**
 * Renderer Markdown gọn nhẹ cho tin nhắn note/task, không cần thư viện ngoài.
 * - Tin nhắn thường (không có cú pháp md) hiển thị y như trước (giữ nguyên xuống dòng).
 * - Hỗ trợ: **đậm**, *nghiêng*, ~~gạch~~, `code`, ```code block```, # heading,
 *   - danh sách, 1. danh sách số, > trích dẫn, --- kẻ ngang, [link](url), URL trần.
 * - Checkbox: dòng bắt đầu bằng `[]`, `[ ]`, `[x]` (có thể kèm `- `) → tick để toggle,
 *   nội dung mới được trả về qua onToggleTask để lưu lại.
 */

const TASK_RX  = /^(\s*)(?:[-*+]\s+)?\[([ xX]?)\]\s?(.*)$/;
const HR_RX    = /^\s*([-*_])\s*(?:\1\s*){2,}$/;
const H_RX     = /^(#{1,6})\s+(.*)$/;
const QUOTE_RX = /^\s*>\s?(.*)$/;
const UL_RX    = /^\s*[-*+]\s+(.*)$/;
const OL_RX    = /^\s*(\d+)[.)]\s+(.*)$/;
const FENCE_RX = /^\s*```/;

/** Toggle checkbox tại dòng lineIdx: `[ ]`/`[]` ↔ `[x]`. Trả về nguyên văn mới. */
export function toggleTaskLine(text: string, lineIdx: number): string {
  const lines = text.split('\n');
  const line = lines[lineIdx] ?? '';
  if (!TASK_RX.test(line)) return text;
  lines[lineIdx] = line.replace(/\[([ xX]?)\]/, (_m, c: string) => (c.trim() ? '[ ]' : '[x]'));
  return lines.join('\n');
}

/* ---------- Inline: code, đậm, nghiêng, gạch ngang, link, URL trần ---------- */

const INLINE_RX =
  /(`([^`]+)`)|(\*\*([^*]+?)\*\*)|(\*([^*\s][^*]*?)\*)|(~~([^~]+?)~~)|(\[([^\]]+)\]\((https?:\/\/[^)\s]+)\))|(https?:\/\/[^\s<>()]+[^\s<>().,;:!?'"])/;

function renderInline(text: string, keyPrefix: string): React.ReactNode {
  if (!text) return text;
  const nodes: React.ReactNode[] = [];
  let rest = text;
  let n = 0;
  while (rest) {
    const m = rest.match(INLINE_RX);
    if (!m || m.index === undefined) { nodes.push(rest); break; }
    if (m.index > 0) nodes.push(rest.slice(0, m.index));
    const key = `${keyPrefix}.${n++}`;
    if (m[1]) {
      nodes.push(
        <code key={key} className="bg-gray-100 dark:bg-[#3c3c3c] rounded px-1 text-[0.9em] font-mono">
          {m[2]}
        </code>
      );
    } else if (m[3]) {
      nodes.push(<strong key={key}>{renderInline(m[4], key)}</strong>);
    } else if (m[5]) {
      nodes.push(<em key={key}>{renderInline(m[6], key)}</em>);
    } else if (m[7]) {
      nodes.push(<del key={key}>{renderInline(m[8], key)}</del>);
    } else if (m[9]) {
      nodes.push(
        <a key={key} href={m[11]} target="_blank" rel="noopener noreferrer"
           onClick={e => e.stopPropagation()}
           className="text-blue-600 dark:text-blue-400 underline hover:opacity-80">
          {m[10]}
        </a>
      );
    } else {
      nodes.push(
        <a key={key} href={m[12]} target="_blank" rel="noopener noreferrer"
           onClick={e => e.stopPropagation()}
           className="text-blue-600 dark:text-blue-400 underline hover:opacity-80 break-all">
          {m[12]}
        </a>
      );
    }
    rest = rest.slice(m.index + m[0].length);
  }
  return nodes;
}

/* ---------- Blocks ---------- */

const H_CLS = [
  'text-lg font-bold',
  'text-base font-bold',
  'font-bold',
  'font-semibold',
  'font-semibold',
  'font-semibold',
];

interface MarkdownMessageProps {
  text: string;
  /** Được gọi với nguyên văn mới khi tick/untick một checkbox. Không truyền → checkbox chỉ đọc. */
  onToggleTask?: (newText: string) => void;
}

export default function MarkdownMessage({ text, onToggleTask }: MarkdownMessageProps) {
  const lines = text.split('\n');
  const out: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // ``` code block ```
    if (FENCE_RX.test(line)) {
      const start = i;
      i++;
      const code: string[] = [];
      while (i < lines.length && !FENCE_RX.test(lines[i])) { code.push(lines[i]); i++; }
      if (i < lines.length) i++; // bỏ dòng ``` đóng
      out.push(
        <pre key={`f${start}`}
             className="bg-gray-100 dark:bg-[#2d2d30] border border-gray-200 dark:border-[#3c3c3c] rounded p-2 my-1 overflow-x-auto whitespace-pre">
          <code className="text-[0.9em] font-mono">{code.join('\n')}</code>
        </pre>
      );
      continue;
    }

    // Checkbox: `[] việc`, `[ ] việc`, `[x] việc`, `- [ ] việc`
    const task = line.match(TASK_RX);
    if (task) {
      const lineIdx = i;
      const checked = task[2].trim().toLowerCase() === 'x';
      const indent = task[1].replace(/\t/g, '  ').length;
      out.push(
        <div key={`t${lineIdx}`} className="flex items-start gap-1.5"
             style={indent ? { marginLeft: `${Math.min(indent, 8) * 0.5}em` } : undefined}>
          <input
            type="checkbox"
            checked={checked}
            onChange={() => onToggleTask?.(toggleTaskLine(text, lineIdx))}
            onClick={e => e.stopPropagation()}
            title={checked ? 'Bỏ đánh dấu đã làm' : 'Đánh dấu đã làm'}
            className={`mt-[0.25em] w-[1em] h-[1em] shrink-0 accent-blue-600 dark:accent-blue-500 ${
              onToggleTask ? 'cursor-pointer' : 'pointer-events-none'
            }`}
          />
          <span className={`min-w-0 ${checked ? 'line-through text-gray-400 dark:text-[#6b6b6b]' : ''}`}>
            {renderInline(task[3], `t${lineIdx}`)}
          </span>
        </div>
      );
      i++;
      continue;
    }

    // --- kẻ ngang
    if (HR_RX.test(line)) {
      out.push(<hr key={`hr${i}`} className="my-1.5 border-gray-300 dark:border-[#3c3c3c]" />);
      i++;
      continue;
    }

    // # Heading
    const h = line.match(H_RX);
    if (h) {
      out.push(
        <div key={`h${i}`} className={H_CLS[h[1].length - 1]}>
          {renderInline(h[2], `h${i}`)}
        </div>
      );
      i++;
      continue;
    }

    // > trích dẫn (gộp các dòng liên tiếp)
    if (QUOTE_RX.test(line)) {
      const start = i;
      const quoted: string[] = [];
      while (i < lines.length && QUOTE_RX.test(lines[i])) {
        quoted.push(lines[i].match(QUOTE_RX)![1]);
        i++;
      }
      out.push(
        <blockquote key={`q${start}`}
                    className="border-l-2 border-gray-300 dark:border-[#5a5a5a] pl-2 my-0.5 text-gray-500 dark:text-[#9d9d9d]">
          {quoted.map((q, j) => <div key={j}>{renderInline(q, `q${start}.${j}`)}</div>)}
        </blockquote>
      );
      continue;
    }

    // - danh sách (gộp các dòng liên tiếp; dòng checkbox không rơi vào đây vì đã xử lý trước)
    if (UL_RX.test(line)) {
      const start = i;
      const items: string[] = [];
      while (i < lines.length && UL_RX.test(lines[i]) && !TASK_RX.test(lines[i]) && !HR_RX.test(lines[i])) {
        items.push(lines[i].match(UL_RX)![1]);
        i++;
      }
      out.push(
        <ul key={`ul${start}`} className="list-disc ml-4 sm:ml-5">
          {items.map((it, j) => <li key={j}>{renderInline(it, `ul${start}.${j}`)}</li>)}
        </ul>
      );
      continue;
    }

    // 1. danh sách số
    const ol = line.match(OL_RX);
    if (ol) {
      const start = i;
      const items: string[] = [];
      while (i < lines.length && OL_RX.test(lines[i])) {
        items.push(lines[i].match(OL_RX)![2]);
        i++;
      }
      out.push(
        <ol key={`ol${start}`} start={Number(ol[1]) || 1} className="list-decimal ml-4 sm:ml-5">
          {items.map((it, j) => <li key={j}>{renderInline(it, `ol${start}.${j}`)}</li>)}
        </ol>
      );
      continue;
    }

    // Dòng thường / dòng trống (giữ chiều cao như xuống dòng thường)
    out.push(
      line.trim()
        ? <div key={`p${i}`}>{renderInline(line, `p${i}`)}</div>
        : <div key={`p${i}`} className="h-[1.25em]" aria-hidden />
    );
    i++;
  }

  return <>{out}</>;
}
