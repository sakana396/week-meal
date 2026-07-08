from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from typing import Any
from xml.etree import ElementTree as ET
from zipfile import ZipFile

XML_NS = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"

CATEGORIES = {
    "01": "穀類",
    "02": "いも及びでん粉類",
    "03": "砂糖及び甘味類",
    "04": "豆類",
    "05": "種実類",
    "06": "野菜類",
    "07": "果実類",
    "08": "きのこ類",
    "09": "藻類",
    "10": "魚介類",
    "11": "肉類",
    "12": "卵類",
    "13": "乳類",
    "14": "油脂類",
    "15": "菓子類",
    "16": "し好飲料類",
    "17": "調味料及び香辛料類",
    "18": "調理済み流通食品類",
}

NUTRIENT_IDENTIFIERS = {
    "energyKcal": "ENERC_KCAL",
    "proteinG": "PROT-",
    "fatG": "FAT-",
    "carbohydrateG": "CHOCDF-",
    "fiberG": "FIB-",
    "saltEquivalentG": "NACL_EQ",
    "sodiumMg": "NA",
    "potassiumMg": "K",
    "calciumMg": "CA",
    "magnesiumMg": "MG",
    "phosphorusMg": "P",
    "ironMg": "FE",
    "zincMg": "ZN",
    "copperMg": "CU",
    "manganeseMg": "MN",
    "iodineUg": "ID",
    "seleniumUg": "SE",
    "chromiumUg": "CR",
    "molybdenumUg": "MO",
    "retinolUg": "RETOL",
    "alphaCaroteneUg": "CARTA",
    "betaCaroteneUg": "CARTB",
    "betaCryptoxanthinUg": "CRYPXB",
    "betaCaroteneEquivalentUg": "CARTBEQ",
    "vitaminAUg": "VITA_RAE",
    "vitaminDUg": "VITD",
    "alphaTocopherolMg": "TOCPHA",
    "betaTocopherolMg": "TOCPHB",
    "gammaTocopherolMg": "TOCPHG",
    "deltaTocopherolMg": "TOCPHD",
    "vitaminKUg": "VITK",
    "vitaminB1Mg": "THIA",
    "vitaminB2Mg": "RIBF",
    "niacinMg": "NIA",
    "niacinEquivalentMg": "NE",
    "vitaminB6Mg": "VITB6A",
    "vitaminB12Ug": "VITB12",
    "folateUg": "FOL",
    "pantothenicAcidMg": "PANTAC",
    "biotinUg": "BIOT",
    "vitaminCMg": "VITC",
}


def column_index(cell_reference: str) -> int:
    match = re.match(r"([A-Z]+)", cell_reference)
    if not match:
        raise ValueError(f"Invalid cell reference: {cell_reference}")

    index = 0
    for char in match.group(1):
        index = index * 26 + ord(char) - 64
    return index - 1


def read_shared_strings(xlsx: ZipFile) -> list[str]:
    try:
        root = ET.fromstring(xlsx.read("xl/sharedStrings.xml"))
    except KeyError:
        return []

    strings: list[str] = []
    for item in root.findall(f"{XML_NS}si"):
        strings.append("".join(text.text or "" for text in item.iter(f"{XML_NS}t")))
    return strings


def cell_text(cell: ET.Element, shared_strings: list[str]) -> str:
    value = cell.find(f"{XML_NS}v")
    if value is None or value.text is None:
        inline = cell.find(f"{XML_NS}is")
        if inline is None:
            return ""
        return "".join(text.text or "" for text in inline.iter(f"{XML_NS}t"))

    text = value.text
    if cell.attrib.get("t") == "s":
        return shared_strings[int(text)]
    return text


def read_sheet_rows(xlsx: ZipFile, sheet_path: str) -> list[dict[int, str]]:
    shared_strings = read_shared_strings(xlsx)
    root = ET.fromstring(xlsx.read(sheet_path))
    rows: list[dict[int, str]] = []

    for row in root.findall(f".//{XML_NS}row"):
        values: dict[int, str] = {}
        for cell in row.findall(f"{XML_NS}c"):
            reference = cell.attrib.get("r", "")
            values[column_index(reference)] = cell_text(cell, shared_strings)
        rows.append(values)

    return rows


def parse_numeric(raw_value: str | None) -> float | None:
    if raw_value is None:
        return None

    value = raw_value.strip()
    if value in {"", "-", "*"}:
        return None
    if value == "Tr":
        return 0

    value = value.replace("(", "").replace(")", "")
    try:
        parsed = float(value)
    except ValueError:
        return None

    return round(parsed, 2)


def clean_name(name: str) -> str:
    return re.sub(r"\s+", " ", name.replace("　", " ")).strip()


def convert_foods(input_path: Path) -> list[dict[str, Any]]:
    with ZipFile(input_path) as xlsx:
        rows = read_sheet_rows(xlsx, "xl/worksheets/sheet1.xml")

    identifier_row = rows[11]
    identifier_to_column = {
        identifier.strip(): column
        for column, identifier in identifier_row.items()
        if identifier.strip()
    }
    nutrient_columns = {
        key: identifier_to_column[identifier]
        for key, identifier in NUTRIENT_IDENTIFIERS.items()
    }

    foods: list[dict[str, Any]] = []
    for row in rows[12:]:
        food_id = row.get(1, "").strip()
        name = clean_name(row.get(3, ""))
        if not food_id or not name:
            continue

        group_code = row.get(0, "").strip()
        nutrients = {
            key: parse_numeric(row.get(column))
            for key, column in nutrient_columns.items()
        }

        foods.append(
            {
                "id": food_id,
                "name": name,
                "category": CATEGORIES.get(group_code, "未分類"),
                "nutrientsPer100g": nutrients,
            }
        )

    return foods


def main() -> None:
    if len(sys.argv) != 3:
        raise SystemExit(
            "Usage: python3 scripts/convert-mext-foods.py INPUT.xlsx OUTPUT.json"
        )

    input_path = Path(sys.argv[1])
    output_path = Path(sys.argv[2])
    foods = convert_foods(input_path)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(
        json.dumps(foods, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Wrote {len(foods)} foods to {output_path}")


if __name__ == "__main__":
    main()
