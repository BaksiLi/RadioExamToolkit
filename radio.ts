import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { decode } from "iconv-lite";
import { SourceFileInfo, sourceFileInfoList } from "./data/meta";

const sourceRoot = `data`;
const generatedFileSubpath = `generated`;

const SEED_DELTA = 0;

const CSV_DELIMITER = '|';
const CSV_NEWLINE = '\n';


interface Item {
    serial: string,
    question: string,
    branches: string[],
    correctBranchIndex: number,
    reference: string,
    picture?: string,
}

interface Suite {
    level: string,
    version: string,
    randomSeed: number,
    items: Item[],
}

interface RandomGenerator {
    seed: number,
    get(): number,
}

function getPrng(seed = 0): RandomGenerator {
    return {
        seed,
        get() {
            const m = Math.pow(2, 31);
            const a = 1103515245;
            const c = 12345
            const lastSeed = this.seed;
            const nextSeed = (a * this.seed + c) % m;
            this.seed = nextSeed;
            const denominator = Math.max(nextSeed, lastSeed);
            const nominator = Math.min(nextSeed, lastSeed);
            return nominator / denominator
        }
    }
}

function loadSource(sourceInfo: SourceFileInfo): string {
    const {regionRoot, filename, encoding} = sourceInfo;
    const fullPath = join(sourceRoot, regionRoot, filename)
    const content = readFileSync(fullPath);
    const text = decode(content, encoding);
    const unifiedText = text.replace(/\r\n/g, "\n").replace(/\u001e/g, "-");
    return unifiedText;
}

function getDefaultItem(): Item {
    return {
        serial: '',
        question: '',
        branches: [],
        correctBranchIndex: 0,
        picture: undefined,
        reference: '',
    }
}

function parse(content: string, region: SourceFileInfo['regionRoot']): Item[] {
    if (region === "cn") {
        return parseCn(content);
    }
    else {
        return parseUs(content);
    }
}

function parseUs(content: string): Item[] {
    const lines = content.split("\n").map(s => s.trim());
    const items: Item[] = [];
    let item = getDefaultItem();
    let parseMode = false;
    for (const line of lines) {
        if (line.startsWith('~')) {
            parseMode = false;
            items.push(item);
            item = getDefaultItem();
        }
        else {
            const titleRegex = /^(\w+)\s\((\w)\)(\s\[(.+)\])?/;
            const match = titleRegex.exec(line);
            if (match) {
                if (parseMode) {
                    console.warn("Unexpected new title while parsing of an existing is ongoing. Missing tilde?");
                    console.warn("Current item:\n", JSON.stringify(item, null, 4));
                }
                parseMode = true;
                item.serial = match[1];
                item.correctBranchIndex = match[2].charCodeAt(0) - "A".charCodeAt(0);
                item.reference = match[4];
            }
            else if (parseMode) {
                const branchRegex = /^([ABCD]\.)\s(.*)/;
                const match = branchRegex.exec(line);
                if (match) {
                    item.branches.push(match[2]);
                }
                else {
                    item.question = line;
                    const figureRegex = /[Ii]n [Ff]igure\s([A-Z0-9-]*)\s?/g
                    const match = figureRegex.exec(line);
                    if (match) {
                        item.picture = match[1]
                    }
                }
            }
        }
    }
    return items;
}

function parseCn(content: string): Item[] {
    const lines = content.split("\n");

    const items: Item[] = [];

    let item = getDefaultItem();

    for (const line of lines) {
        const regex = /\[(\w)](.*)/;
        const match = regex.exec(line);
        if (!match) {
            continue
        }
        const marker = match[1];
        const body = match[2];
        if (marker === 'I') {
            item = getDefaultItem();
        }

        switch (marker) {
            case 'I': {
                item.serial = body;
                break;
            }
            case 'Q': {
                item.question = body;
                break;
            }
            case 'P': {
                item.picture = body;
                items.push(item);
                break;
            }
            default: {
                item.branches.push(body);
            }
        }

    }

    return items
}

function shuffle<T>(array: T[], rng: () => number): void {
    let i = array.length;
  
    while (i !== 0) {
        const randomIndex = Math.floor(rng() * i);
        i -= 1;
    
        const temporaryValue = array[i];
        array[i] = array[randomIndex];
        array[randomIndex] = temporaryValue;
    }
}

function last<T>(array: T[]): T | undefined {
    return array[array.length - 1];
}

function shouldRemainInPlace(branch?: string): boolean {
    return !!branch && branch.startsWith(`All`)
}

function shuffleBranches(suite: Suite, rng: () => number): void {
    for (const item of suite.items) {
        const correctBranchBody = item.branches[item.correctBranchIndex];
        const lastBranch = last(item.branches);
        if (!lastBranch) {
            throw new Error(`suite ${suite.level} has an empty question ${item.serial}.`)
        }
        const shouldLastBranchRemainInPlace = shouldRemainInPlace(lastBranch);
        shuffle(item.branches, rng);
        if (shouldLastBranchRemainInPlace) {
            item.branches = item.branches.filter(branch => branch !== lastBranch);
            item.branches.push(lastBranch);
        }
        item.correctBranchIndex = item.branches.indexOf(correctBranchBody)
    }
}

function toCsv(suite: Suite, pictureExt: string | null): string {

    function optionIndexLetter(index: number): string {
        return String.fromCharCode('A'.charCodeAt(0) + index)
    }

    function getPictureField(picturePath?: string, ext: string | null = null): string {
        if (!picturePath) {
            return "";
        }
        if (ext) {
            picturePath = picturePath + "." + ext;
        }
        return `<img src='${picturePath}'/>`
    }

    const lines = [];
    for (const item of suite.items) {
        const segments = [
            item.serial,
            item.question,
            optionIndexLetter(item.correctBranchIndex),
            getPictureField(item.picture, pictureExt),
            item.reference,
            ...item.branches,
        ]
        lines.push(
            segments.join(CSV_DELIMITER)
        )
    }
    return lines.join(CSV_NEWLINE);

}

// For example, as of Feb 2020, LK0938 has an image but the `[P]` field is empty
function fixMissingPictureLabels(suite: Suite): void {
    for (const item of suite.items) {
        if (!item.picture) {
            const possiblePath = `${sourceRoot}/cn/images/${item.serial}.jpg`
            if (existsSync(possiblePath)) {
                item.picture = `${item.serial}.jpg`
                console.warn(`Fixing item ${item.serial} missing link to picture`)
            }
        }
    }
}

function transform(sourceInfo: SourceFileInfo): void {
    const { level, regionRoot, version } = sourceInfo;
    console.info(`\nTransforming for level ${level} of ${regionRoot}`)
    const fileContent = loadSource(sourceInfo);
    const seed = level.charCodeAt(0) + SEED_DELTA;
    const suite: Suite = {
        level,
        version: sourceInfo.version,
        randomSeed: seed,
        items: parse(fileContent, regionRoot),
    };
    fixMissingPictureLabels(suite);

    const outputBasename = `${regionRoot.toUpperCase()}-${level}-${version}`

    const jsonPath = join(sourceRoot, regionRoot, generatedFileSubpath, outputBasename + '.json');
    console.info(`Exporting JSON to ${jsonPath}`)
    writeFileSync(jsonPath, JSON.stringify(suite, null, 4));

    const csvPath = join(sourceRoot, regionRoot, generatedFileSubpath, outputBasename + '.csv');
    const prng = getPrng(suite.randomSeed);
    shuffleBranches(suite, () => prng.get());
    const csvContent = toCsv(suite, sourceInfo.pictureExt);
    console.info(`Exporting CSV to ${csvPath}`)
    writeFileSync(csvPath, csvContent);

    console.info(`Done.`)
}

function main() {
    for (const info of sourceFileInfoList) {
        transform(info);
    }
}

main()
