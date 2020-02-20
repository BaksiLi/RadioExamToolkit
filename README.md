# Amateur Radio Exam Question Pool Toolkit (CN+US)

Parse radio exam question pools of China and the United States and generate JSON and CSVs for Anki import or other programmatic uses.

## 1. 中国业余无线电台操作证书考试题库

根据[官方考试题库文本](http://www.crac.org.cn/News/Detail?ID=1862)，产生json和csv（见`/generated`），用于导入Anki形成牌组。

原本题库永远是第一项（即「A」）正确，本工具生成CSV时会打乱题枝顺序，但JSON依照原顺序。

组好的牌组见：https://github.com/blaesus/RadioExamCNDeck/releases

## 2. FCC Amateur Radio Exam

Three levels are covered:
- Technical (i.e. element 2), version 2018-2022;
- General (i.e. element 3), version 2019-2013;
- Amateur Extra (i.e. element 4), version July 2020-2024.

Minor changes are made to the text to make parsing successful. Premables were removed and tildes that should follow every question are added if missing. Questions and branches are not touched, obviously. 

## Development
```bash
npm install
```

Then edit `radio.ts`.

Compile with `tsc` (not included in this package) and run with `node radio`.

## License
MIT


