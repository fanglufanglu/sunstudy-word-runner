from __future__ import annotations

import csv
import json
import re
from pathlib import Path

EXTRACTED = Path("tmp/extracted_words.json")
ECDICT = Path("tmp/ecdict.csv")
OUT = Path("words.js")

MANUAL = {
    "a": "一，一个",
    "an": "一，一个",
    "according (to)": "根据，按照",
    "AI (artificial intelligence)": "人工智能",
    "be (am is are)": "是，成为",
    "ice cream": "冰淇淋",
    "kung fu": "功夫",
    "Mr": "先生",
    "Mrs": "夫人，太太",
    "Ms": "女士",
    "o'clock": "点钟",
    "per cent (AmE percent)": "百分之",
    "p.m.": "下午，午后",
    "a.m.": "上午，午前",
    "X-ray": "X 光，X 射线",
    "CPC (Communist Party of China)": "中国共产党",
    "PLA (People's Liberation Army)": "中国人民解放军",
    "PRC (People's Republic of China)": "中华人民共和国",
    "UN (United Nations)": "联合国",
    "UNESCO (United Nations Educational Scientific and Cultural Organi-zation)": "联合国教科文组织",
    "WHO (World Health Organization)": "世界卫生组织",
    "WTO (World Trade Organization)": "世界贸易组织",
}

FIX_WORD = {
    "eighbour (AmE eighbor)": "neighbour (AmE neighbor)",
}

PROPER_MEANINGS = {
    "January": "一月",
    "February": "二月",
    "March": "三月",
    "April": "四月",
    "May": "五月",
    "June": "六月",
    "July": "七月",
    "August": "八月",
    "September": "九月",
    "October": "十月",
    "November": "十一月",
    "December": "十二月",
    "Monday": "星期一",
    "Tuesday": "星期二",
    "Wednesday": "星期三",
    "Thursday": "星期四",
    "Friday": "星期五",
    "Saturday": "星期六",
    "Sunday": "星期日",
    "Africa": "非洲",
    "African": "非洲人，非洲的",
    "America": "美洲，美国",
    "American": "美国人，美国的",
    "Antarctica": "南极洲",
    "Asia": "亚洲",
    "Asian": "亚洲人，亚洲的",
    "Australia": "澳大利亚",
    "Australian": "澳大利亚人，澳大利亚的",
    "Canada": "加拿大",
    "Canadian": "加拿大人，加拿大的",
    "China": "中国",
    "Chinese": "中国人，汉语，中国的",
    "Europe": "欧洲",
    "European": "欧洲人，欧洲的",
    "France": "法国",
    "French": "法国人，法语，法国的",
    "Germany": "德国",
    "German": "德国人，德语，德国的",
    "India": "印度",
    "Indian": "印度人，印度的",
    "Japan": "日本",
    "Japanese": "日本人，日语，日本的",
    "Russia": "俄罗斯",
    "Russian": "俄罗斯人，俄语，俄罗斯的",
    "Children's Day": "儿童节",
    "Double Ninth Festival": "重阳节",
    "Dragon Boat Festival": "端午节",
    "Labour Day": "劳动节",
    "Lantern Festival": "元宵节",
    "Mid-Autumn Festival": "中秋节",
    "National Day": "国庆节",
    "New Year's Day": "元旦",
    "PLA Day": "建军节",
    "Spring Festival": "春节",
    "Teachers' Day": "教师节",
    "Tomb-sweeping Day": "清明节",
    "Women's Day": "妇女节",
    "Mount Huangshan": "黄山",
    "Mount Qomolangma": "珠穆朗玛峰",
    "Mount Taishan": "泰山",
    "The Changjiang River": "长江",
    "The Yangtze River": "长江",
    "The Great Wall": "长城",
    "The Palace Museum": "故宫博物院",
    "The Yellow River": "黄河",
    "Tian'anmen Square": "天安门广场",
    "The Silk Road": "丝绸之路",
    "Beijing opera": "京剧",
    "Beijing roast duck": "北京烤鸭",
    "hot pot": "火锅",
    "lunar calendar": "农历",
    "mooncake": "月饼",
    "paper-cut": "剪纸",
    "qipao": "旗袍",
    "Spring Festival couplets": "春联",
    "spring roll": "春卷",
    "Traditional Chinese Medicine (TCM)": "中医",
    "The Atlantic Ocean": "大西洋",
    "The Indian Ocean": "印度洋",
    "The Pacific Ocean": "太平洋",
}

CULTURE_EXTRAS = [
    "CPC (Communist Party of China)",
    "PLA (People's Liberation Army)",
    "PRC (People's Republic of China)",
    "UN (United Nations)",
    "UNESCO (United Nations Educational, Scientific and Cultural Organization)",
    "WHO (World Health Organization)",
    "WTO (World Trade Organization)",
    "Children's Day",
    "Mount Huangshan",
    "Beijing opera",
    "Double Ninth Festival",
    "Mount Qomolangma",
    "Dragon Boat Festival",
    "Mount Taishan",
    "Beijing roast duck",
    "Labour Day",
    "The Changjiang River",
    "hot pot",
    "Lantern Festival",
    "The Yangtze River",
    "lunar calendar",
    "Mid-Autumn Festival",
    "The Great Wall",
    "mooncake",
    "National Day",
    "The Palace Museum",
    "paper-cut",
    "New Year's Day",
    "The Yellow River",
    "qipao",
    "PLA Day",
    "Tian'anmen Square",
    "Spring Festival couplets",
    "Spring Festival",
    "spring roll",
    "Teachers' Day",
    "The Silk Road",
    "Tomb-sweeping Day",
    "Women's Day",
    "Traditional Chinese Medicine (TCM)",
]

SKIP_WORDS = {
    "BRAANMARAS",
    "UNESCO (United Nations Educational",
    "Scientific and Cultural Organi-",
    "zation)",
    "Children's Day Mount Huangshan",
    "Beijing opera (Peking",
    "Double Ninth Festival Mount Qomolangma",
    "opera)",
    "Dragon Boat Festival Mount Taishan",
    "Labour Day The Changjiang",
    "River hot pot",
    "Lantern Festival (The Yangtze",
    "River) lunar calendar",
    "Mid-Autumn Festival The Great",
    "Wall mooncake",
    "National Day The Palace",
    "Museum paper-cut",
    "New Year's Day The Yellow",
    "River qipao",
    "PLA Day Tian'anmen",
    "Square Spring Festival couplets",
    "Traditional Chinese",
    "Medicine (TCM)",
    "(UK)",
    "The United States of",
    "Att Smile",
    "ADT HE ARRAKES",
}


def load_dict() -> dict[str, str]:
    lookup: dict[str, str] = {}
    with ECDICT.open("r", encoding="utf-8", newline="") as fh:
        reader = csv.DictReader(fh)
        for row in reader:
            word = (row.get("word") or "").strip().lower()
            trans = (row.get("translation") or "").strip()
            if word and trans and word not in lookup:
                lookup[word] = compact_translation(trans)
    return lookup


def compact_translation(text: str) -> str:
    text = text.replace("\\n", "\n")
    lines = [re.sub(r"^[a-z]+\.\s*", "", line.strip()) for line in text.splitlines()]
    lines = [
        re.sub(
            r"^(?:a|adj|ad|adv|n|v|vi|vt|prep|pron|conj|num|int|interj)\.?\s*",
            "",
            line,
            flags=re.I,
        )
        for line in lines
    ]
    lines = [re.sub(r"\[[^\]]+\]", "", line).strip() for line in lines]
    lines = [line for line in lines if line and not re.search(r"[A-Za-z]{3,}", line)]
    if not lines:
        lines = [text.splitlines()[0].strip()]
    merged = "；".join(lines[:3])
    merged = re.sub(r"\s+", "", merged)
    merged = merged.replace("，, ", "，")
    return merged[:42]


def lookup_key(word: str) -> str:
    key = word
    key = re.sub(r"\(AmE.*?\)", "", key)
    key = re.sub(r"\(.+?\)", "", key)
    key = key.replace("’", "'").strip()
    return key.lower()


def group_label(word: str, group: str) -> str:
    if group in {"数词", "月份星期/地理", "国家机构/节日文化"}:
        return group
    return f"{group} 字母岛"


def meaning_for(word: str, dictionary: dict[str, str]) -> str:
    if word in MANUAL:
        return MANUAL[word]
    if word in PROPER_MEANINGS:
        return PROPER_MEANINGS[word]
    key = lookup_key(word)
    if key in dictionary:
        return dictionary[key]
    stripped = re.sub(r"[^A-Za-z'-]", "", key).lower()
    if stripped in dictionary:
        return dictionary[stripped]
    return PROPER_MEANINGS.get(word, "释义待校对")


def main() -> None:
    dictionary = load_dict()
    raw = json.loads(EXTRACTED.read_text(encoding="utf-8"))
    items = []
    seen = set()
    for item in raw:
        word = FIX_WORD.get(item["word"], item["word"]).replace("’", "'")
        if word in SKIP_WORDS:
            continue
        if word == "UNESCO (United Nations Educational Scientific and Cultural Organi-zation)":
            word = "UNESCO (United Nations Educational, Scientific and Cultural Organization)"
        if word == "eighbour (AmE eighbor)":
            word = "neighbour (AmE neighbor)"
        key = word.lower()
        if key in seen:
            continue
        seen.add(key)
        items.append(
            {
                "word": word,
                "meaning": meaning_for(word, dictionary),
                "band": item["band"],
                "group": group_label(word, item["group"]),
            }
        )

    for word in CULTURE_EXTRAS:
        key = word.lower()
        if key in seen:
            continue
        seen.add(key)
        items.append(
            {
                "word": word,
                "meaning": meaning_for(word, dictionary),
                "band": "三级词汇",
                "group": "国家机构/节日文化",
            }
        )

    OUT.write_text(
        "window.WORDS = " + json.dumps(items, ensure_ascii=False, indent=2) + ";\n",
        encoding="utf-8",
    )
    missing = [item["word"] for item in items if item["meaning"] == "释义待校对"]
    print(f"wrote={len(items)} missing={len(missing)}")
    print(missing[:120])


if __name__ == "__main__":
    main()
