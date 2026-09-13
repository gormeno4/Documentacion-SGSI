#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script para dividir funciones consolidadas de PostgreSQL (funciones_sgsi.sql / funciones_corvus.sql)
en archivos individuales .sql por cada funcion con toda su informacion
(comentarios, DROP FUNCTION si aplica, definicion completa y terminador).
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


def extract_function_blocks(sql_content: str):
    """
    Divide el contenido SQL en bloques individuales de funciones.
    Preserva exactamente cada bloque completo incluyendo comentarios y '-- DROP FUNCTION'.
    """
    pattern = re.compile(
        r'(?:(?:--\s*DROP\s+FUNCTION[^\n]*\n+)?CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+(?:([a-zA-Z0-9_]+)\.)?([a-zA-Z0-9_]+)\s*\((.*?)\).*?)'
        r'(?=(?:--\s*DROP\s+FUNCTION|CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION|\Z))',
        re.DOTALL | re.IGNORECASE
    )

    blocks = []
    for match in pattern.finditer(sql_content):
        schema = match.group(1) or 'public'
        func_name = match.group(2)
        args = ' '.join(match.group(3).split())
        full_text = match.group(0).strip()
        
        # Asegurar terminador de salto de linea limpio
        if not full_text.endswith('\n'):
            full_text += '\n'
            
        blocks.append({
            'schema': schema,
            'name': func_name,
            'args': args,
            'content': full_text
        })
        
    return blocks


def split_functions(input_file: Path, output_dir: Path, separate_overloads: bool = False):
    """
    Lee input_file y escribe cada funcion en output_dir.
    Si separate_overloads es False, combina las sobrecargas en un mismo archivo <nombre>.sql.
    Si separate_overloads es True, nombra como <nombre>.sql, <nombre>_2.sql, etc.
    """
    if not input_file.exists():
        raise FileNotFoundError(f"No se encontro el archivo origen: {input_file}")

    print(f"[*] Leyendo archivo origen: {input_file}")
    with open(input_file, 'r', encoding='utf-8') as f:
        content = f.read()

    blocks = extract_function_blocks(content)
    total_found = len(blocks)
    print(f"[*] Total de funciones detectadas: {total_found}")

    # Asegurar que el directorio destino existe
    output_dir.mkdir(parents=True, exist_ok=True)

    # Agrupar por nombre de funcion
    grouped = defaultdict(list)
    for b in blocks:
        grouped[b['name']].append(b)

    files_written = 0
    overloaded_count = 0

    for func_name, func_list in grouped.items():
        if len(func_list) > 1:
            overloaded_count += 1
            print(f"  [!] Sobrecarga en '{func_name}' ({len(func_list)} firmas)")

        if separate_overloads:
            for idx, item in enumerate(func_list):
                file_name = f"{func_name}.sql" if idx == 0 else f"{func_name}_{idx + 1}.sql"
                file_path = output_dir / file_name
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(item['content'])
                files_written += 1
        else:
            # Unir todas las definiciones del mismo nombre en un unico archivo
            file_name = f"{func_name}.sql"
            file_path = output_dir / file_name
            combined_content = "\n\n".join(item['content'].strip() for item in func_list) + "\n"
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(combined_content)
            files_written += 1

    print("\n" + "=" * 60)
    print("PROCESO COMPLETADO EXITOSAMENTE:")
    print(f" - Funciones procesadas: {total_found}")
    print(f" - Nombres unicos: {len(grouped)}")
    print(f" - Funciones con sobrecargas: {overloaded_count}")
    print(f" - Archivos .sql generados: {files_written}")
    print(f" - Carpeta destino: {output_dir.resolve()}")
    print("=" * 60)


def main():
    repo_root = Path(__file__).resolve().parent

    parser = argparse.ArgumentParser(
        description="Divide archivos consolidados de funciones PostgreSQL en archivos individuales por funcion."
    )
    parser.add_argument(
        "-t", "--target",
        choices=["sgsi", "corvus"],
        default="corvus",
        help="Esquema/modulo objetivo: 'sgsi' o 'corvus' (por defecto: corvus)."
    )
    parser.add_argument(
        "-i", "--input",
        type=Path,
        default=None,
        help="Ruta al archivo SQL consolidado (por defecto segun --target)."
    )
    parser.add_argument(
        "-o", "--output",
        type=Path,
        default=None,
        help="Ruta al directorio de salida (por defecto segun --target)."
    )
    parser.add_argument(
        "--separate-overloads",
        action="store_true",
        help="Si se activa, guarda cada sobrecarga en archivos separados (<nombre>_2.sql) en vez de agruparlas."
    )

    args = parser.parse_args()

    # Determinar rutas por defecto segun el target si no se especificaron
    if args.input is None:
        args.input = repo_root / f"funciones_{args.target}.sql"

    if args.output is None:
        args.output = repo_root / "api-sgsi" / "sql" / "sgsi" / "database" / args.target / "functions"

    split_functions(args.input, args.output, args.separate_overloads)


if __name__ == "__main__":
    main()
