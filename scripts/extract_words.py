from __future__ import annotations

import csv
import json
import re
import subprocess
from io import StringIO
from pathlib import Path

PAGES_DIR = Path("tmp/pdf_pages")
OUT = Path("tmp/extracted_words.json")

LEFT_MIN = 230
RIGHT_MIN = 880
RIGHT_MAX = 1600
HEADER_MAX_TOP = 230
PAGE_NUM_MIN_TOP = 2320

NOISE = {
    "Ht",
    "B)",
    "Maser",
    "WERE",
    "tEMK",
    "SRidil",
    "DiAA",
    "Bl",
    "MSSBert",
    "DRE",
    "IER",
    "aa",
    "Bh",
    "ial",
    "Ze",
    "Fresca",
    "MARR",
    "MABETDAAR",
    "HHNUSABA",
    "HOE",
    "StL",
    "AeA",
    "aia",
}

FIX_WORD = {
    "Al": "AI",
    "z00": "zoo",
    "XxX": "X-ray",
    "X-ray": "X-ray",
    "p.m.": "p.m.",
    "a.m.": "a.m.",
}


def run_tsv(image: Path) -> list[dict[str, str]]:
    result = subprocess.run(
        ["/opt/homebrew/bin/tesseract", str(image), "stdout", "--psm", "6", "-l", "eng", "tsv"],
        check=True,
        text=True,
        capture_output=True,
    )
    return list(csv.DictReader(StringIO(result.stdout), delimiter="\t"))


def clean_token(text: str) -> str:
    text = text.strip()
    text = text.replace("™", "*").replace("”", "*").replace("“", "*").replace('"', "*").replace("~", "*")
    text = text.replace("’", "'")
    text = text.strip(" ,;:|[]{}")
    return FIX_WORD.get(text, text)


def usable_token(row: dict[str, str], page: int) -> bool:
    text = clean_token(row.get("text", ""))
    if not text:
        return False
    left = int(row["left"])
    top = int(row["top"])
    if top < HEADER_MAX_TOP or top > PAGE_NUM_MIN_TOP:
        return False
    if page == 1 and top < 2030:
        return False
    if page == 31 and top > 820:
        return False
    if text in NOISE:
        return False
    if re.fullmatch(r"\d+", text):
        return False
    if not re.search(r"[A-Za-z*]", text):
        return False
    return LEFT_MIN <= left <= RIGHT_MAX


def normalize_entry(tokens: list[str]) -> tuple[list[str], bool]:
    text = " ".join(clean_token(t) for t in tokens if clean_token(t))
    text = re.sub(r"\s+", " ", text).strip()
    starred = "*" in text
    text = text.replace("*", "").strip()
    text = text.replace("(p/.", "(pl.").replace("p/.", "pl.")
    text = re.sub(r"\(pl\..*?\)", "", text).strip()
    text = re.sub(r"\(=.+?\)", "", text).strip()
    text = re.sub(r"\bn\.,?\s*adj\.?", "", text).strip()
    text = re.sub(r"\bn\.\s*", "", text).strip()
    text = re.sub(r"\badj\.\s*", "", text).strip()
    text = re.sub(r"\sn$", "", text).strip()
    text = text.strip(" ,;:|")
    if not text:
        return [], starred
    if text == "a/an":
        return ["a", "an"], True
    if len(text) == 1 and text.isupper() and text != "I":
        return [], starred
    if text == "actor / actress":
        return ["actor", "actress"], starred
    if text == "actor actress":
        return ["actor", "actress"], starred
    if text in {"anybody / anyone", "everybody / everyone", "somebody / someone"}:
        return [part.strip() for part in text.split("/")], starred
    if text in {"anybody anyone", "everybody everyone", "somebody someone"}:
        return text.split(), starred
    if text in {"emperor empress", "host hostess", "prince princess", "will would"}:
        return text.split(), starred
    if text.startswith("gentleman"):
        return ["gentleman"], starred
    if text.startswith("Mr "):
        return ["Mr"], starred
    if text.startswith("Mrs "):
        return ["Mrs"], starred
    if text.startswith("Ms "):
        return ["Ms"], starred
    if text.startswith("policeman / policewoman"):
        return ["policeman", "policewoman"], starred
    if text.startswith("policeman policewoman"):
        return ["policeman", "policewoman"], starred
    if text == "policemen policewomen)":
        return [], starred
    if text == "o":
        return ["o'clock"], starred
    if "/" in text and re.fullmatch(r"[A-Za-z]+ / [A-Za-z]+", text):
        return [part.strip() for part in text.split("/")], starred
    if re.fullmatch(r"[A-Za-z][A-Za-z'.-]*", text):
        return [text], starred
    # Keep official multi-word names or abbreviations from the separate lists.
    if re.search(r"[A-Za-z]", text) and not re.search(r"\d", text):
        return [text], starred
    return [], starred


def group_for(page: int, word: str) -> str:
    if page <= 31:
        first = word[0].upper() if word and word[0].isalpha() else "A-Z"
        return first
    if page == 32:
        return "数词"
    if page == 33:
        return "月份星期/地理"
    if page in {34, 35}:
        return "国家机构/节日文化"
    return "附表"


def extract_page(image: Path, page: int) -> list[tuple[str, bool]]:
    rows = [row for row in run_tsv(image) if row.get("level") == "5" and usable_token(row, page)]
    lines: dict[tuple[str, str, str], list[dict[str, str]]] = {}
    for row in rows:
        key = (row["block_num"], row["par_num"], row["line_num"])
        lines.setdefault(key, []).append(row)

    entries: list[tuple[str, bool]] = []
    for line_rows in lines.values():
        cols = {"left": [], "right": []}
        for row in sorted(line_rows, key=lambda r: int(r["left"])):
            left = int(row["left"])
            if left >= RIGHT_MIN:
                cols["right"].append(clean_token(row["text"]))
            else:
                cols["left"].append(clean_token(row["text"]))
        for col in ("left", "right"):
            words, starred = normalize_entry(cols[col])
            for word in words:
                if word not in NOISE and re.search(r"[A-Za-z]", word):
                    entries.append((word, starred))
    return entries


def main() -> None:
    items: list[dict[str, object]] = []
    seen: set[str] = set()
    for page in range(1, 36):
        image = PAGES_DIR / f"page-{page:02d}.png"
        for word, starred in extract_page(image, page):
            key = word.lower()
            if key in seen:
                continue
            seen.add(key)
            items.append(
                {
                    "word": word,
                    "meaning": "",
                    "band": "二级词汇" if starred else "三级词汇",
                    "group": group_for(page, word),
                }
            )
    OUT.write_text(json.dumps(items, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"count={len(items)}")
    print("first=", items[:24])
    print("last=", items[-24:])


if __name__ == "__main__":
    main()
