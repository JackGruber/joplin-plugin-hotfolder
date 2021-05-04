import { filePattern } from "../src/filePattern";

describe("Match files", function () {
  const filter = "test.txt, test.md, test test.md, te\\*st.md";

  it(`should not match: .DS_Store`, async () => {
    expect(await filePattern.match(`.DS_Store`, filter)).toBe(0);
  });

  it(`should not match: atest.md`, async () => {
    expect(await filePattern.match(`atest.md`, filter)).toBe(0);
  });

  it(`should not match: no test.md`, async () => {
    expect(await filePattern.match(`no test.md`, filter)).toBe(0);
  });

  it(`should match: test test.md`, async () => {
    expect(await filePattern.match(`test test.md`, filter)).toBe(2);
  });

  it(`should match: test.md`, async () => {
    expect(await filePattern.match(`test.md`, filter)).toBe(2);
  });

  it(`should match: te*st.md`, async () => {
    expect(await filePattern.match(`te*st.md`, filter)).toBe(2);
  });

  it(`should not match: teAst.md`, async () => {
    expect(await filePattern.match(`teAst.md`, filter)).toBe(0);
  });
});

describe("Match Wildcard filter", function () {
  const filter = "*.lock, test*, my*file.log";

  it(`should match: dada.lock`, async () => {
    expect(await filePattern.match(`dada.lock`, filter)).toBe(3);
  });

  it(`should match: test.txt`, async () => {
    expect(await filePattern.match(`test.txt`, filter)).toBe(3);
  });

  it(`should match: myerrorfile.log`, async () => {
    expect(await filePattern.match(`myerrorfile.log`, filter)).toBe(3);
  });

  it(`should match: atest.log`, async () => {
    expect(await filePattern.match(`atest.log`, filter)).toBe(0);
  });

  it(`should match: _my_file.txt`, async () => {
    expect(await filePattern.match(`_my_file.txt`, filter)).toBe(0);
  });
});

describe("Match dot file filter", function () {
  const filter = ".*";

  it(`should match: .DS_Store`, async () => {
    expect(await filePattern.match(`.DS_Store`, filter)).toBe(1);
  });

  it(`should not match: a.txt`, async () => {
    expect(await filePattern.match(`a.txt`, filter)).toBe(0);
  });

  it(`should not match: test`, async () => {
    expect(await filePattern.match(`test`, filter)).toBe(0);
  });
});

describe("Match filter with RegExp patterns to escape", function () {
  const filter = "test (1).log";

  it(`should match: test (1).log`, async () => {
    expect(await filePattern.match(`test (1).log`, filter)).toBe(2);
  });

  it(`should not match: test.log`, async () => {
    expect(await filePattern.match(`test.log`, filter)).toBe(0);
  });
});

describe("Match with RegExp patterns in name and wildcards", function () {
  const filter = "test (*).log";

  it(`should match: test (1).log`, async () => {
    expect(await filePattern.match(`test (1).log`, filter)).toBe(3);
  });

  it(`should not match: test.log`, async () => {
    expect(await filePattern.match(`test.log`, filter)).toBe(0);
  });
});

describe("Empty filter", function () {
  const filter = "";

  it(`should not match: test.log`, async () => {
    expect(await filePattern.match(`test.log`, filter)).toBe(0);
  });
});

describe("Match RegEx", function () {
  const filter = "(.*\\.log|^\\..*$)";

  it(`should match: test (1).log`, async () => {
    expect(await filePattern.match(`test (1).log`, filter)).toBe(4);
  });

  it(`should not match: test.txt`, async () => {
    expect(await filePattern.match(`test.txt`, filter)).toBe(0);
  });

  it(`should match: .DS_Store`, async () => {
    expect(await filePattern.match(`.DS_Store`, filter)).toBe(4);
  });
});



describe("Escape RegExp pattern", function () {
  it(`Escape: ( ) [ ] / { }`, async () => {
    expect(await filePattern.escapeRegExp(`( ) [ ] / { }`)).toBe(
      `\\( \\) \\[ \\] \\/ \\{ \\}`
    );
  });

  it(`Escape: *`, async () => {
    let filter = `test*test`;
    expect(await filePattern.escapeRegExp(filter)).toBe(`test\\*test`);
  });

  it(`No escape: *`, async () => {
    let filter = `test\\*test`;
    expect(await filePattern.escapeRegExp(filter)).toBe(`test\\*test`);
  });
});
