import { expect, test, type Page } from "@playwright/test";
import { itemRow, openTab, registerFoods } from "./helpers";

/** 手入力フォームを画面上の見出しで特定する（DES-E2E-09）。 */
function manualForm(page: Page) {
  return page.locator("form").filter({
    has: page.getByRole("heading", { name: "手入力で追加", exact: true }),
  });
}

for (const mode of ["簡易", "詳細"]) {
  test(`TC-FR-ING-02-01 ${mode}で棚と検索を組み合わせ空の結果から戻せる`, async ({
    page,
  }) => {
    await page.goto("/#/register");
    await page
      .getByRole("group", { name: "入力モード選択" })
      .getByRole("button", { name: mode, exact: true })
      .click();
    const shelves = page.getByRole("group", { name: "スーパーの棚を選択" });
    await shelves.getByRole("button", { name: "卵", exact: true }).click();
    await expect(
      shelves.getByRole("button", { name: "卵", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    const list = page.getByLabel(
      mode === "簡易" ? "食材名一覧" : "文科省食品データ一覧",
      { exact: true },
    );
    if (mode === "簡易") {
      await expect(list.locator("strong")).toHaveText(["鶏卵", "うずら卵"]);
    } else {
      await expect(list.getByRole("button")).not.toHaveCount(0);
      for (const text of await list.getByRole("button").allTextContents()) {
        expect(text).toContain("卵類");
      }
    }
    const query = page.getByRole("searchbox", { name: "食材名", exact: true });
    await query.fill("キャベツ");
    await expect(list).toHaveCount(0);
    await expect(
      page.getByText("該当する食材がありません", { exact: true }),
    ).toBeVisible();
    await shelves.getByRole("button", { name: "野菜", exact: true }).click();
    await expect(list.getByRole("button")).not.toHaveCount(0);
    for (const text of await list.locator("strong").allTextContents()) {
      expect(text).toContain("キャベツ");
    }
    await query.fill("");
    await shelves.getByRole("button", { name: "すべて", exact: true }).click();
    await expect(list.getByRole("button").first()).toContainText("玉ねぎ");
  });
}

test("TC-FR-ING-04-06 未検索ではよくある食材が先でそれ以外も後半と検索に出る", async ({
  page,
}) => {
  await page.goto("/#/register");
  await page
    .getByRole("group", { name: "スーパーの棚を選択" })
    .getByRole("button", { name: "野菜", exact: true })
    .click();
  const list = page.getByLabel("食材名一覧", { exact: true });
  await expect(list.locator("strong").nth(0)).toHaveText("玉ねぎ");
  await expect(list.locator("strong").nth(1)).toHaveText("にんじん");
  await expect(list.locator("strong").nth(2)).toHaveText("じゃがいも");
  const buttons = list.getByRole("button");
  const common = await buttons.evaluateAll((elements) =>
    elements.map((element) => !!element.querySelector(".common-food-badge")),
  );
  const firstUncommon = common.indexOf(false);
  expect(firstUncommon).toBeGreaterThan(0);
  expect(common.slice(firstUncommon).every((value) => !value)).toBe(true);
  await expect(list.locator("strong").nth(firstUncommon)).toHaveText(
    "アボカド",
  );
  await expect(list.getByRole("button", { name: /^アボカド/ })).toBeVisible();
  await page
    .getByRole("searchbox", { name: "食材名", exact: true })
    .fill("アボカド");
  await expect(list.locator("strong")).toHaveText(["アボカド"]);
  await expect(list.locator(".common-food-badge")).toHaveCount(0);
});

// 代表食品は実装時に関数の出力で確認（自動テストではない）。
// まぐろ: 10252 / 缶詰10260（魚）、はくさい: 06233（野菜）/ 漬物06236（豆腐・納豆）。
// キャベツの漬物は同梱データにないため、漬物の検証にははくさいを使う。
for (const [query, entries] of [
  [
    "まぐろ",
    [
      ["まぐろ", "魚", "さく"],
      ["まぐろ（缶詰）", "魚", "缶"],
    ],
  ],
  [
    "はくさい",
    [
      ["はくさい", "野菜", "1/4株"],
      ["はくさいの漬物", "豆腐・納豆", "パック"],
    ],
  ],
] as const) {
  test(`TC-FR-ING-06-21 ${query}と加工品を別名で表示し別行で登録する`, async ({
    page,
  }) => {
    await page.goto("/#/register");
    await page
      .getByRole("searchbox", { name: "食材名", exact: true })
      .fill(query);
    const list = page.getByLabel("食材名一覧", { exact: true });
    const shelves = page.getByRole("group", { name: "スーパーの棚を選択" });
    // 検索だけでも通常名と加工品が別ボタンで表示される。
    for (const [name] of entries) {
      await expect(list.getByText(name, { exact: true })).toBeVisible();
    }
    for (const [name, shelf] of entries) {
      await shelves.getByRole("button", { name: shelf, exact: true }).click();
      await expect(
        shelves.getByRole("button", { name: shelf, exact: true }),
      ).toHaveAttribute("aria-pressed", "true");
      for (const [candidate, candidateShelf] of entries) {
        const button = list.getByRole("button").filter({
          has: page.getByText(candidate, { exact: true }),
        });
        if (candidateShelf === shelf) {
          await expect(button).toBeVisible();
        } else {
          await expect(button).toHaveCount(0);
        }
      }
      await list
        .getByRole("button")
        .filter({ has: page.getByText(name, { exact: true }) })
        .click();
      await expect(page.getByRole("status")).toContainText(
        `${name}を登録しました`,
      );
    }
    await openTab(page, "ホーム");
    for (const [name, , unit] of entries) {
      await expect(itemRow(page, name)).toHaveCount(1);
      await expect(
        itemRow(page, name).getByRole("group", { name: `${name}の個数` }),
      ).toHaveText(`−1 ${unit}＋`);
    }
  });
}

test("TC-FR-ING-08-14 成分なしの手入力は登録でき判定から除外される", async ({
  page,
}) => {
  await registerFoods(page, ["キャベツ", "にんじん"]);
  const form = manualForm(page);
  await form
    .getByRole("textbox", { name: "食材名", exact: true })
    .fill("自家製スープ");
  await form.getByLabel("棚", { exact: true }).selectOption("その他");
  await form.getByRole("button", { name: "登録する", exact: true }).click();
  await expect(page.getByRole("status")).toContainText(
    "自家製スープを登録しました",
  );
  await openTab(page, "ホーム");
  const row = itemRow(page, "自家製スープ");
  await expect(row).toHaveCount(1);
  await expect(
    row.getByRole("group", { name: "自家製スープの個数" }),
  ).toContainText("1 つ（概算）");
  const panel = page.getByRole("region", { name: "栄養バランスの判定" });
  await expect(panel).toContainText("いま 2 品目");
  await expect(panel).toContainText(
    "自家製スープ はエネルギーのデータがないので、判定に数えていません。",
  );
  await openTab(page, "登録");
  await expect(page.getByRole("region", { name: "覚えた食材" })).toContainText(
    "手入力 / その他",
  );
});

test("TC-FR-FDB-03-01 除外されたサゴでん粉を手入力で補える", async ({
  page,
}) => {
  // 除外食品 02032 は #59 の査閲資料に記載。成分値は入力せず作り出さない。
  await page.goto("/#/register");
  await page
    .getByRole("searchbox", { name: "食材名", exact: true })
    .fill("サゴでん粉");
  await expect(
    page.getByText("該当する食材がありません", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "この名前で手入力", exact: true })
    .click();
  const form = manualForm(page);
  await expect(
    form.getByRole("textbox", { name: "食材名", exact: true }),
  ).toHaveValue("サゴでん粉");
  await form.getByLabel("棚", { exact: true }).selectOption("その他");
  await form.getByRole("button", { name: "登録する", exact: true }).click();
  await openTab(page, "ホーム");
  await expect(itemRow(page, "サゴでん粉")).toHaveCount(1);
  await expect(
    itemRow(page, "サゴでん粉").getByRole("group", {
      name: "サゴでん粉の個数",
    }),
  ).toContainText("1 つ（概算）");
  await expect(
    page.getByRole("region", { name: "栄養バランスの判定" }),
  ).toContainText(
    "サゴでん粉 はエネルギーのデータがないので、判定に数えていません。",
  );
});

test("TC-FR-NUT-05-04 一部欠損と全欠損と明示のゼロをホームと詳細で区別する", async ({
  page,
}) => {
  // 集計確認用の人工試料。実在食品の成分値ではない。
  await page.goto("/#/settings");
  await page
    .getByRole("group", { name: "主食", exact: true })
    .getByRole("button", { name: "なし", exact: true })
    .click();
  await openTab(page, "登録");
  const form = manualForm(page);
  for (const [name, vitaminC] of [
    ["試料A", "30"],
    ["試料B", ""],
    ["試料C", "0"],
  ]) {
    await form.getByRole("textbox", { name: "食材名", exact: true }).fill(name);
    await form
      .getByText("成分を入力・似た食品から下書き（任意）", { exact: true })
      .click();
    await form.getByRole("spinbutton", { name: /^エネルギー（/ }).fill("100");
    await form.getByRole("spinbutton", { name: /^ビタミンC（/ }).fill(vitaminC);
    await form.getByRole("button", { name: "登録する", exact: true }).click();
  }
  await openTab(page, "ホーム");
  const panel = page.getByRole("region", { name: "栄養バランスの判定" });
  await expect(panel).toContainText(
    "一部の食材にビタミンCのデータがないため、データのある食材だけで判定しています。",
  );
  await expect(
    panel.locator("p").filter({ hasText: "はデータがなく判定できません。" }),
  ).toContainText(/ビタミンD.*はデータがなく判定できません。/);
  await expect(
    panel.getByRole("listitem").filter({ hasText: "ビタミンD" }),
  ).toHaveCount(0);
  await openTab(page, "詳細");
  const rows = page
    .getByRole("region", { name: "判定する栄養素" })
    .locator(".detail-row");
  const vitaminC = rows.filter({
    has: page.getByText("ビタミンC", { exact: true }),
  });
  // 30mg / データのある200kcal × 1000 = 150mg。
  // 初期属性の基準 100mg / 2400kcal × 1000 → 充足率360%。
  // データありは A と明示ゼロの C の計200kcal / 300kcal → 67%。
  await expect(vitaminC).toHaveAttribute("data-status", "ok");
  await expect(vitaminC.locator("small")).toHaveText(
    "充足率 360%・データのある食材はエネルギーの 67%",
  );
  const vitaminD = rows.filter({
    has: page.getByText("ビタミンD", { exact: true }),
  });
  await expect(vitaminD).toHaveAttribute("data-status", "unknown");
  await expect(vitaminD.locator("small")).toHaveText("データなし");
});

test("TC-FR-STP-01-02 性別と年齢の変更をホームの不足の増減でも確認する", async ({
  page,
}) => {
  // 固定試料: キャベツ06061を0.5玉、にんじん06212を1.5本、豚肉11115を5.5パック。
  await registerFoods(page, ["キャベツ", "にんじん", "豚肉"]);
  await openTab(page, "ホーム");
  await itemRow(page, "キャベツ")
    .getByRole("button", { name: "キャベツを 0.5 減らす" })
    .click();
  await itemRow(page, "にんじん")
    .getByRole("button", { name: "にんじんを 0.5 増やす" })
    .click();
  for (let index = 0; index < 9; index += 1) {
    await itemRow(page, "豚肉")
      .getByRole("button", { name: "豚肉を 0.5 増やす" })
      .click();
  }
  await openTab(page, "設定");
  for (const [group, value] of [
    ["主食", "パン"],
    ["盛り", "大盛り"],
  ]) {
    await page
      .getByRole("group", { name: group, exact: true })
      .getByRole("button", { name: value, exact: true })
      .click();
  }
  await openTab(page, "ホーム");
  const flags = page
    .getByRole("region", { name: "栄養バランスの判定" })
    .getByRole("listitem");
  const before = [
    "過剰たんぱく質",
    "過剰脂質",
    "不足炭水化物",
    "不足ビタミンD",
    "不足カルシウム",
  ];
  await expect(flags).toHaveText(before);
  await openTab(page, "設定");
  await page
    .getByRole("group", { name: "性別", exact: true })
    .getByRole("button", { name: "女性", exact: true })
    .click();
  await openTab(page, "ホーム");
  await expect(flags).toHaveText([
    ...before.slice(0, 3),
    "不足ビタミンA",
    ...before.slice(3),
  ]);
  await openTab(page, "設定");
  await page
    .getByRole("group", { name: "年齢", exact: true })
    .getByRole("button", { name: "65〜74 歳", exact: true })
    .click();
  await openTab(page, "ホーム");
  const after = [
    ...before.slice(0, 3),
    "不足ビタミンA",
    "不足ビタミンC",
    ...before.slice(3),
  ];
  await expect(flags).toHaveText(after);
  await page.reload();
  await expect(flags).toHaveText(after);
});

test("TC-FR-ING-08-15 空白だけの名前では手入力登録しない", async ({ page }) => {
  await page.goto("/#/register");
  const form = manualForm(page);
  await form.getByRole("textbox", { name: "食材名", exact: true }).fill("   ");
  await form.getByRole("button", { name: "登録する", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("食材名を入れてください");
  await expect(page.getByRole("region", { name: "覚えた食材" })).toHaveCount(0);
  await openTab(page, "ホーム");
  await expect(page.locator(".item-row")).toHaveCount(0);
});
