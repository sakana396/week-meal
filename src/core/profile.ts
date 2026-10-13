import type { AgeGroup } from "../data/dietaryReference";
import type { StapleKind } from "../data/staples";

/** 主食の盛り（FR-STP-02） */
export type Portion = "small" | "medium" | "large";

/** 利用者の設定（DES-STP-01）。性別「unspecified」は男女の平均で判定する */
export type Profile = {
  sex: "male" | "female" | "unspecified";
  ageGroup: AgeGroup;
  staple: StapleKind | "none";
  portion: Portion;
};

/** 設定の初期値（TBD-15 の仮置き） */
export const defaultProfile: Profile = {
  sex: "unspecified",
  ageGroup: "30-49",
  staple: "rice",
  portion: "medium",
};
