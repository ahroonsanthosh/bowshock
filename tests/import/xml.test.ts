import { describe, expect, it } from 'vitest';
import { parseXml, XmlError } from '../../src/import/xml';

describe('XML reader', () => {
  it('reads elements, attributes and text in order', () => {
    const root = parseXml(
      "<?xml version='1.0' encoding='utf-8'?>\n<!-- a comment -->\n" +
        '<a x="1" y=\'two\'><b>text</b><c/><b>more</b></a>\n<!-- after -->\n',
    );
    expect(root.name).toBe('a');
    expect([...root.attributes]).toEqual([
      ['x', '1'],
      ['y', 'two'],
    ]);
    expect(root.children.map((c) => c.name)).toEqual(['b', 'c', 'b']);
    expect(root.children[0]!.text).toBe('text');
    expect(root.children[1]!.children).toEqual([]);
  });

  it('decodes the predefined entities and character references, in text and attributes', () => {
    const root = parseXml('<a t="&lt;&amp;&#65;&#x42;">&quot;&apos;&gt; &#x1F680; &#10;</a>');
    expect(root.attributes.get('t')).toBe('<&AB');
    expect(root.text).toBe('"\'> \u{1F680} \n');
  });

  it('keeps CDATA as it is, and normalises line ends and attribute white space', () => {
    const root = parseXml('<a v="1\t2\n3">x\r\ny<![CDATA[<&>]]></a>');
    expect(root.text).toBe('x\ny<&>');
    expect(root.attributes.get('v')).toBe('1 2 3');
  });

  it('accepts a byte-order mark and processing instructions', () => {
    expect(parseXml('﻿<?xml version="1.0"?><?pi data?><a><?inner?></a>').name).toBe('a');
  });

  it('checks the content of skipped elements but does not keep it', () => {
    const root = parseXml('<a><s><t>1</t>text</s><u/></a>', { skip: new Set(['s']) });
    expect(root.children.map((c) => c.name)).toEqual(['s', 'u']);
    expect(root.children[0]!.children).toEqual([]);
    expect(root.children[0]!.text).toBe('');
    expect(() => parseXml('<a><s><t></s></a>', { skip: new Set(['s']) })).toThrow(XmlError);
  });

  const refused: readonly (readonly [string, string, RegExp])[] = [
    ['empty', '', /no root element/],
    ['text only', 'hello', /does not start with an element/],
    ['mismatched tags', '<a><b></a></b>', /<\/a> closes <b>/],
    ['unclosed', '<a><b></b>', /<a> is never closed/],
    ['two roots', '<a/><b/>', /content after the root/],
    ['unknown entity', '<a>&nbsp;</a>', /unknown entity/],
    ['bare ampersand', '<a>1 & 2</a>', /does not start a reference/],
    ['invalid character reference', '<a>&#0;</a>', /not a character XML allows/],
    ['repeated attribute', '<a x="1" x="2"/>', /repeated/],
    ['unquoted attribute', '<a x=1/>', /not quoted/],
    ['< in an attribute', '<a x="<"/>', /contains "<"/],
    ['attributes run together', '<a x="1"y="2"/>', /space was expected/],
    ['unclosed comment', '<a><!-- </a>', /comment that is never closed/],
    ['unclosed CDATA', '<a><![CDATA[ </a>', /CDATA section that is never closed/],
    [
      'a document type declaration (entity expansion)',
      '<!DOCTYPE a [<!ENTITY x "xx">]><a>&x;</a>',
      /document type declaration/,
    ],
  ];
  for (const [what, source, message] of refused) {
    it(`refuses ${what} with a clear message`, () => {
      let error: unknown;
      try {
        parseXml(source);
      } catch (e) {
        error = e;
      }
      expect(error).toBeInstanceOf(XmlError);
      expect((error as XmlError).message).toMatch(message);
      expect((error as XmlError).message).toMatch(/\(at character \d+\)$/);
    });
  }

  it('limits the nesting depth', () => {
    const deep = '<a>'.repeat(300) + '</a>'.repeat(300);
    expect(() => parseXml(deep)).toThrow(/nested deeper than 256/);
    expect(parseXml(deep, { maxDepth: 400 }).name).toBe('a');
  });
});
