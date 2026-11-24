import { Fragment, ReactNode } from 'react';

type Tag = 'strong' | 'em' | 'p' | 'br';
type Token =
  | { type: 'text'; value: string }
  | { type: 'open'; tag: Tag }
  | { type: 'close'; tag: Tag };

function decodeText(value: string): string {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}

function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  const pattern = /<(\/?)(strong|em|p|br)\s*\/?>|([^<]+)/gi;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(source))) {
    if (match[3]) {
      tokens.push({ type: 'text', value: decodeText(match[3]) });
      continue;
    }

    const tag = match[2].toLowerCase() as Tag;
    if (tag === 'br') {
      tokens.push({ type: 'open', tag: 'br' });
      continue;
    }

    tokens.push({ type: match[1] ? 'close' : 'open', tag });
  }

  return tokens;
}

function parseTokens(tokens: Token[], index: { i: number; key: number }, stop?: Tag): ReactNode[] {
  const nodes: ReactNode[] = [];

  while (index.i < tokens.length) {
    const token = tokens[index.i];

    if (token.type === 'close') {
      index.i += 1;
      if (token.tag === stop) return nodes;
      continue;
    }

    if (token.type === 'text') {
      nodes.push(token.value);
      index.i += 1;
      continue;
    }

    if (token.tag === 'br') {
      const key = index.key;
      index.key += 1;
      index.i += 1;
      nodes.push(<br key={key} />);
      continue;
    }

    const tag = token.tag;
    index.i += 1;
    const children = parseTokens(tokens, index, tag);
    const key = index.key;
    index.key += 1;

    if (tag === 'strong') nodes.push(<strong key={key}>{children}</strong>);
    else if (tag === 'em') nodes.push(<em key={key}>{children}</em>);
    else nodes.push(<p key={key}>{children}</p>);
  }

  return nodes;
}

export interface RichNoteProps {
  value?: string;
  className?: string;
}

function RichNote({ value, className }: RichNoteProps) {
  if (!value?.trim()) return null;

  if (!/<\/?(strong|em|p|br)\b/i.test(value)) {
    const lines = value.split('\n');
    return (
      <div className={className}>
        {lines.map((line, index) => (
          <Fragment key={index}>
            {index > 0 ? <br /> : null}
            {line}
          </Fragment>
        ))}
      </div>
    );
  }

  return <div className={className}>{parseTokens(tokenize(value), { i: 0, key: 0 })}</div>;
}

export default RichNote;
