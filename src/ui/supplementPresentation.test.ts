import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { SuggestionButton } from "./components/SupplementSuggestions";

it("TC-FR-BAL-06-06 概算候補の1単位と改善する不足を表示する", () => {
  const html = renderToStaticMarkup(
    createElement(SuggestionButton, {
      suggestion: {
        foodId: "test",
        displayName: "検査食品",
        improvedKeys: ["vitaminCMg"],
        improvement: 1,
        newHighKeys: [],
        newLowKeys: [],
        worsenedHighKeys: [],
        approximate: true,
      },
      disabled: false,
      onRegister: () => {},
    }),
  );
  expect(html).toContain("検査食品");
  expect(html).toContain("1 つ");
  expect(html).toContain("100g の概算");
  expect(html).toContain("ビタミンC");
});

it("TC-FR-BAL-07-02 候補の注意を栄養素名とともに表示し待機中は無効にする", () => {
  const html = renderToStaticMarkup(
    createElement(SuggestionButton, {
      suggestion: {
        foodId: "test",
        displayName: "検査食品",
        improvedKeys: ["vitaminCMg"],
        improvement: 1,
        newHighKeys: ["saltEquivalentG"],
        newLowKeys: ["carbohydrateG"],
        worsenedHighKeys: ["fatG"],
        approximate: false,
      },
      disabled: true,
      onRegister: () => {},
    }),
  );
  expect(html).toContain('disabled=""');
  expect(html).toContain("新しい過剰：食塩相当量");
  expect(html).toContain("新しい不足：炭水化物");
  expect(html).toContain("過剰がさらに増える：脂質");
});
