# Amateur Radio Exam Question Pool Toolkit

Parse radio exam question pools of several jurisdictions and generate JSON and CSVs for Anki import.

## 1. 中国业余无线电台操作证书考试题库

根据[官方考试题库文本](http://www.crac.org.cn/userfiles/file/20211022/20211022155018_8471.zip)，产生json和csv（见`/generated`），用于导入Anki形成牌组。

原本题库永远是第一项（即「A」）正确，本工具生成CSV时会打乱题枝顺序，但JSON依照原顺序。

组好的牌组见：https://github.com/BaksiLi/RadioExamToolkit/releases .

## 2. FCC Amateur Radio Exam

Three levels are covered:
- Technical (i.e. element 2), version 2018-2022;
- General (i.e. element 3), version 2019-2013;
- Amateur Extra (i.e. element 4), version July 2020-2024.

Minor changes are made to the text to make parsing successful. Premables were removed and tildes that should follow every question are added if missing. Questions and branches are not touched, obviously. 

## 3. 臺灣業餘無線電人員資格測試

使用[108年版](https://www.ncc.gov.tw/chinese/news_detail.aspx?site_content_sn=649&sn_f=41699)。一二三等題目皆已收錄。

## Development
```bash
npm install
```

Then edit `radio.ts`.

Compile with `tsc` (not included in this package) and run with `node radio`.

## License
MIT
