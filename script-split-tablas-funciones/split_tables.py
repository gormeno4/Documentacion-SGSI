#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script para dividir tablas consolidadas de PostgreSQL (tabla_corvus.sql)
en archivos individuales .sql por cada tabla con toda su informacion
(definicion de tabla, indices, constraints, comentarios y foreign keys).

Ruta de destino por defecto: api-sgsi/sql/sgsi/database/corvus/tables/
"""

import sys
import re
import argparse
from collections import defaultdict
from pathlib import Path

# Configurar salida para soportar utf-8 en Windows
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass


def extract_table_blocks(sql_content: str):
    """
    Divide el contenido SQL en bloques individuales de tablas.
    Detecta cabeceras de tipo:
      -- corvus.tabla definition
      -- corvus."tabla" definition
      -- corvus.tabla foreign keys
    Y extrae todo el bloque correspondiente (CREATE TABLE, índices, ALTER TABLE, etc.).
    """
    # Patrón para identificar el inicio de cada sección
    section_pattern = re.compile(
        r'--\s+([a-zA-Z0-9_]+)\.(?:\"?([a-zA-Z0-9_]+)\"?)\s+(definition|foreign keys)',
        re.IGNORECASE
    )

    matches = list(section_pattern.finditer(sql_content))
    if not matches:
        # Fallback: buscar CREATE TABLE directamente si no hay cabeceras estándar
        create_pattern = re.compile(
            r'(?:CREATE\s+TABLE\s+(?:([a-zA-Z0-9_]+)\.)?(?:\"?([a-zA-Z0-9_]+)\"?))',
            re.IGNORECASE
        )
        matches_create = list(create_pattern.finditer(sql_content))
        sections = []
        for i, m in enumerate(matches_create):
            start = m.start()
            end = matches_create[i + 1].start() if i + 1 < len(matches_create) else len(sql_content)
            schema = m.group(1) or 'corvus'
            tbl = m.group(2)
            chunk = sql_content[start:end].strip()
            sections.append({
                'schema': schema,
                'name': tbl,
                'type': 'definition',
                'content': chunk + '\n'
            })
        return sections

    sections = []
    for i, match in enumerate(matches):
        start = match.start()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(sql_content)
        schema = match.group(1)
        tbl = match.group(2)
        sec_type = match.group(3).lower()
        chunk = sql_content[start:end].strip()
        sections.append({
            'schema': schema,
            'name': tbl,
            'type': sec_type,
            'content': chunk + '\n'
        })

    return sections


def split_tables(input_file: Path, output_dir: Path):
    """
    Lee input_file y genera un archivo .sql por cada tabla en output_dir.
    Si una tabla tiene sección de definición y luego de foreign keys, las unifica en el mismo archivo.
    """
    if not input_file.exists():
        raise FileNotFoundError(f"No se encontro el archivo origen: {input_file}")

    print(f"[*] Leyendo archivo origen: {input_file}")
    with open(input_file, 'r', encoding='utf-8') as f:
        content = f.read()

    sections = extract_table_blocks(content)
    print(f"[*] Total de secciones detectadas: {len(sections)}")

    # Asegurar que el directorio destino existe
    output_dir.mkdir(parents=True, exist_ok=True)

    # Agrupar secciones por nombre de tabla
    grouped = defaultdict(list)
    for s in sections:
        grouped[s['name']].append(s)

    files_written = 0
    tables_with_fk = 0

    for tbl_name, sec_list in grouped.items():
        # Limpiar nombre para el archivo
        clean_name = tbl_name.replace('"', '').strip()
        file_name = f"{clean_name}.sql"
        file_path = output_dir / file_name

        has_fk = any(s['type'] == 'foreign keys' for s in sec_list)
        if has_fk:
            tables_with_fk += 1
            print(f"  [+] Seccion de foreign keys adjuntada para '{clean_name}'")

        # Unificar bloques (definición + índices + foreign keys si hubiera)
        combined_content = "\n\n".join(s['content'].strip() for s in sec_list) + "\n"
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(combined_content)
        files_written += 1

    print("\n" + "=" * 60)
    print("PROCESO COMPLETADO EXITOSAMENTE:")
    print(f" - Secciones procesadas: {len(sections)}")
    print(f" - Tablas unicas: {len(grouped)}")
    print(f" - Tablas con foreign keys unificadas: {tables_with_fk}")
    print(f" - Archivos .sql generados: {files_written}")
    print(f" - Carpeta destino: {output_dir.resolve()}")
    print("=" * 60)


def main():
    repo_root = Path(__file__).resolve().parent

    parser = argparse.ArgumentParser(
        description="Divide archivo consolidado tabla_corvus.sql en archivos individuales por tabla."
    )
    parser.add_argument(
        "-t", "--target",
        choices=["corvus", "sgsi"],
        default="corvus",
        help="Esquema/modulo objetivo: 'corvus' o 'sgsi' (por defecto: corvus)."
    )
    parser.add_argument(
        "-i", "--input",
        type=Path,
        default=None,
        help="Ruta al archivo SQL consolidado (por defecto: tabla_<target>.sql)."
    )
    parser.add_argument(
        "-o", "--output",
        type=Path,
        default=None,
        help="Ruta al directorio de salida (por defecto: api-sgsi/sql/sgsi/database/<target>/tables)."
    )

    args = parser.parse_args()

    if args.input is None:
        args.input = repo_root / f"tabla_{args.target}.sql"

    if args.output is None:
        args.output = repo_root / "api-sgsi" / "sql" / "sgsi" / "database" / args.target / "tables"

    split_tables(args.input, args.output)


if __name__ == "__main__":
    main()
