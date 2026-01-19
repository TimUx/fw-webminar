// TipTap Entry Point for bundling
import { Editor, Node } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import Color from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import { generateHTML } from '@tiptap/html';

// Export everything needed
export {
  Editor,
  Node,
  StarterKit,
  Image,
  Link,
  Table,
  TableRow,
  TableCell,
  TableHeader,
  TextAlign,
  Underline,
  Color,
  TextStyle,
  generateHTML
};
