#!/usr/bin/env python3
"""
PaddleOCR service for D212TaxHelper v3.0.0

Uses PaddleOCR 3.x (PaddlePaddle 3.0) for text extraction from PDFs and images.
Called as a subprocess from Node.js server.js.

Usage:
    python ocr_service.py <input_file> [--mode text|auto] [--lang en|ro]

Output: JSON to stdout with extracted text.
"""

import sys
import json
import os
import argparse
import traceback


# Suppress noisy PaddlePaddle logs
os.environ.setdefault('PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK', 'True')
os.environ.setdefault('GLOG_minloglevel', '2')


def init_paddleocr(lang='en'):
    """Initialize PaddleOCR 3.x engine."""
    from paddleocr import PaddleOCR
    return PaddleOCR(lang=lang)


def extract_text(engine, file_path):
    """Extract text from a PDF or image using PaddleOCR 3.x predict API."""
    all_pages = []

    for page_idx, page in enumerate(engine.predict(file_path)):
        res = page.json.get('res', page.json)
        rec_texts = res.get('rec_texts', [])
        all_pages.append({
            'page': page_idx + 1,
            'lines': rec_texts,
            'text': '\n'.join(rec_texts),
        })

    combined = '\n\n'.join(p['text'] for p in all_pages if p['text'])
    return combined, all_pages


def main():
    parser = argparse.ArgumentParser(description='PaddleOCR service for D212TaxHelper')
    parser.add_argument('input_file', help='Path to PDF or image file')
    parser.add_argument('--mode', choices=['text', 'auto', 'table'], default='auto',
                        help='Extraction mode (all modes use PaddleOCR text extraction)')
    parser.add_argument('--lang', choices=['en', 'ro'], default='en',
                        help='Language hint (en or ro)')
    args = parser.parse_args()

    if not os.path.isfile(args.input_file):
        print(json.dumps({'error': f'File not found: {args.input_file}'}))
        sys.exit(1)

    # Force UTF-8 output on Windows
    if sys.platform == 'win32':
        sys.stdout.reconfigure(encoding='utf-8')

    try:
        engine = init_paddleocr(args.lang)
        combined_text, pages = extract_text(engine, args.input_file)

        result = {
            'success': True,
            'engine': 'paddleocr',
            'file': os.path.basename(args.input_file),
            'mode': args.mode,
            'text': combined_text,
            'combinedText': combined_text,
            'pages': len(pages),
            'totalLines': sum(len(p['lines']) for p in pages),
        }

        print(json.dumps(result, ensure_ascii=False))

    except Exception as e:
        print(json.dumps({
            'error': str(e),
            'traceback': traceback.format_exc(),
            'success': False,
            'engine': 'paddleocr',
        }))
        sys.exit(1)


if __name__ == '__main__':
    main()
