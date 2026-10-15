import type { BasketAction } from "../../core/basket";
import type { Profile } from "../../core/profile";
import { ageGroups } from "../../data/dietaryReference";
import { portionLabels, sexLabels, stapleLabels } from "../labels";
import type { Route } from "../route";

type Choice<T extends string> = { value: T; label: string };

function choices<T extends string>(
  labels: Record<T, string>,
  order: T[],
): Choice<T>[] {
  return order.map((value) => ({ value, label: labels[value] }));
}

const stapleChoices = choices(stapleLabels, [
  "rice",
  "bread",
  "noodle",
  "none",
]);
const portionChoices = choices(portionLabels, ["small", "medium", "large"]);
const sexChoices = choices(sexLabels, ["unspecified", "female", "male"]);
const ageGroupLabels: Record<Profile["ageGroup"], string> = {
  "18-29": "18〜29 歳",
  "30-49": "30〜49 歳",
  "50-64": "50〜64 歳",
  "65-74": "65〜74 歳",
  "75+": "75 歳以上",
};

/** 選択肢を並べたボタンの組（1 つだけ選べる）。選んだものは aria-pressed で示す */
function ChoiceGroup<T extends string>({
  label,
  note,
  options,
  value,
  disabled = false,
  onChange,
}: {
  label: string;
  note?: string;
  options: Choice<T>[];
  value: T;
  disabled?: boolean;
  onChange: (value: T) => void;
}) {
  return (
    <fieldset className="choice-group" disabled={disabled}>
      <legend>{label}</legend>
      {note && <p className="balance-note">{note}</p>}
      <div className="choice-buttons">
        {options.map((option) => (
          <button
            aria-pressed={option.value === value}
            data-active={option.value === value}
            key={option.value}
            onClick={() => onChange(option.value)}
            type="button"
          >
            {option.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

/**
 * 設定（DES-UI-23、FR-STP-01, 02, 04, 05、FR-UI-09）。変えるとすぐ判定に反映され、保存される。
 * 初期値は ご飯・中盛り、未選択、30〜49 歳（TBD-15、REV-013）。
 */
export function SettingsScreen({
  profile,
  dispatch,
  navigate,
}: {
  profile: Profile;
  dispatch: (action: BasketAction) => void;
  navigate: (route: Route) => void;
}) {
  const update = (change: Partial<Profile>) =>
    dispatch({ type: "setProfile", profile: { ...profile, ...change } });

  return (
    <div className="screen-stack" aria-label="設定画面">
      <header className="screen-header">
        <div>
          <p className="food-id">設定</p>
          <h2>主食と基準値の設定</h2>
        </div>
      </header>

      <section className="section-stack" aria-label="主食">
        <ChoiceGroup
          label="主食"
          note="米・パン・麺は食材として登録せず、ここで選んだ主食を、盛りに応じた割合で食べるものとして計算します。"
          onChange={(staple) => update({ staple })}
          options={stapleChoices}
          value={profile.staple}
        />
        <ChoiceGroup
          disabled={profile.staple === "none"}
          label="盛り"
          note={
            profile.staple === "none"
              ? "主食なしのときは盛りを使いません（選んだ盛りは残ります）。"
              : "小盛り・中盛り・大盛りで、全体のエネルギーのうち主食が 3 割・4 割・5 割を占めるとして計算します。"
          }
          onChange={(portion) => update({ portion })}
          options={portionChoices}
          value={profile.portion}
        />
      </section>

      <section className="section-stack" aria-label="基準値">
        <ChoiceGroup
          label="性別"
          note="未選択のときは、男性と女性の基準値の平均で判定します。"
          onChange={(sex) => update({ sex })}
          options={sexChoices}
          value={profile.sex}
        />
        <ChoiceGroup
          label="年齢"
          onChange={(ageGroup) => update({ ageGroup })}
          options={choices(ageGroupLabels, ageGroups)}
          value={profile.ageGroup}
        />
        <p className="balance-note">
          基準値は日本人の食事摂取基準（2025年版、身体活動レベル「ふつう」）を使います。女性の鉄は月経なしの値です。
        </p>
      </section>

      <section className="section-stack" aria-label="食品データ">
        <div className="section-heading">
          <h3>食品データ</h3>
          <p>
            文部科学省「日本食品標準成分表（八訂）増補2023年」から、自炊向けの食品を選んでいます
          </p>
        </div>
        <button
          className="primary-button"
          onClick={() => navigate("foods")}
          type="button"
        >
          食品一覧を見る
        </button>
      </section>
    </div>
  );
}
