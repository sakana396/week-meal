from __future__ import annotations

import argparse
import json
import urllib.parse
import urllib.request
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any
from urllib.error import URLError


@dataclass
class NutritionInfo:
    calories: float = 0.0
    protein_g: float = 0.0
    fat_g: float = 0.0
    carbs_g: float = 0.0
    source: str = "OpenFoodFacts"


@dataclass
class MealEntry:
    meal_type: str
    food_name: str
    quantity: float
    nutrition: NutritionInfo


class OpenFoodFactsClient:
    BASE_URL = "https://world.openfoodfacts.org/cgi/search.pl"

    def fetch_nutrition(self, food_name: str) -> NutritionInfo:
        query = urllib.parse.urlencode(
            {
                "search_terms": food_name,
                "search_simple": "1",
                "action": "process",
                "json": "1",
                "page_size": "1",
            }
        )
        url = f"{self.BASE_URL}?{query}"
        request = urllib.request.Request(
            url,
            headers={
                "User-Agent": "week-meal/1.0"
            },
        )
        try:
            with urllib.request.urlopen(request, timeout=10) as response:
                payload = json.loads(response.read().decode("utf-8"))
        except (URLError, TimeoutError, json.JSONDecodeError):
            return NutritionInfo(source="OpenFoodFacts(unavailable)")

        products = payload.get("products") or []
        if not products:
            return NutritionInfo(source="OpenFoodFacts(no-result)")
        return self._extract_nutrition(products[0])

    def _extract_nutrition(self, product: dict[str, Any]) -> NutritionInfo:
        nutriments = product.get("nutriments") or {}
        return NutritionInfo(
            calories=self._pick_float(nutriments, "energy-kcal_100g", "energy-kcal"),
            protein_g=self._pick_float(nutriments, "proteins_100g", "proteins"),
            fat_g=self._pick_float(nutriments, "fat_100g", "fat"),
            carbs_g=self._pick_float(nutriments, "carbohydrates_100g", "carbohydrates"),
            source="OpenFoodFacts",
        )

    @staticmethod
    def _pick_float(data: dict[str, Any], *keys: str) -> float:
        for key in keys:
            value = data.get(key)
            if value is None:
                continue
            try:
                return float(value)
            except (TypeError, ValueError):
                continue
        return 0.0


class MealManager:
    def __init__(self, storage_path: Path, nutrition_client: OpenFoodFactsClient | None = None):
        self.storage_path = storage_path
        self.nutrition_client = nutrition_client or OpenFoodFactsClient()

    def add_meal(self, meal_type: str, food_name: str, quantity: float = 1.0) -> MealEntry:
        nutrition = self.nutrition_client.fetch_nutrition(food_name)
        scaled = NutritionInfo(
            calories=nutrition.calories * quantity,
            protein_g=nutrition.protein_g * quantity,
            fat_g=nutrition.fat_g * quantity,
            carbs_g=nutrition.carbs_g * quantity,
            source=nutrition.source,
        )
        meal = MealEntry(meal_type=meal_type, food_name=food_name, quantity=quantity, nutrition=scaled)
        meals = self._load_meals()
        meals.append(meal)
        self._save_meals(meals)
        return meal

    def list_meals(self) -> list[MealEntry]:
        return self._load_meals()

    def totals(self) -> NutritionInfo:
        summary = NutritionInfo(source="total")
        for meal in self._load_meals():
            summary.calories += meal.nutrition.calories
            summary.protein_g += meal.nutrition.protein_g
            summary.fat_g += meal.nutrition.fat_g
            summary.carbs_g += meal.nutrition.carbs_g
        return summary

    def _load_meals(self) -> list[MealEntry]:
        if not self.storage_path.exists():
            return []
        try:
            raw = json.loads(self.storage_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            return []
        meals: list[MealEntry] = []
        for item in raw:
            meals.append(
                MealEntry(
                    meal_type=item["meal_type"],
                    food_name=item["food_name"],
                    quantity=float(item["quantity"]),
                    nutrition=NutritionInfo(**item["nutrition"]),
                )
            )
        return meals

    def _save_meals(self, meals: list[MealEntry]) -> None:
        serializable = [
            {
                "meal_type": meal.meal_type,
                "food_name": meal.food_name,
                "quantity": meal.quantity,
                "nutrition": asdict(meal.nutrition),
            }
            for meal in meals
        ]
        self.storage_path.write_text(
            json.dumps(serializable, ensure_ascii=False, indent=2), encoding="utf-8"
        )


def _positive_float(raw_value: str) -> float:
    value = float(raw_value)
    if value <= 0:
        raise argparse.ArgumentTypeError("quantity must be positive")
    return value


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="食事管理システム")
    parser.add_argument("--storage", default="meals.json", help="保存先JSONファイル")
    sub = parser.add_subparsers(dest="command", required=True)

    add = sub.add_parser("add", help="食事を追加する")
    add.add_argument("meal_type", help="breakfast/lunch/dinner/snack など")
    add.add_argument("food_name", help="食品名")
    add.add_argument("--quantity", type=_positive_float, default=1.0, help="数量(倍率)")

    sub.add_parser("list", help="食事一覧を表示")
    sub.add_parser("summary", help="栄養サマリを表示")
    return parser


def main() -> None:
    args = _build_parser().parse_args()
    manager = MealManager(storage_path=Path(args.storage))

    if args.command == "add":
        meal = manager.add_meal(args.meal_type, args.food_name, args.quantity)
        print(
            f"追加: {meal.meal_type} {meal.food_name} x{meal.quantity} "
            f"(kcal={meal.nutrition.calories:.1f}, P={meal.nutrition.protein_g:.1f}, "
            f"F={meal.nutrition.fat_g:.1f}, C={meal.nutrition.carbs_g:.1f}, src={meal.nutrition.source})"
        )
    elif args.command == "list":
        meals = manager.list_meals()
        if not meals:
            print("食事データがありません")
            return
        for meal in meals:
            print(
                f"{meal.meal_type}: {meal.food_name} x{meal.quantity} "
                f"(kcal={meal.nutrition.calories:.1f}, P={meal.nutrition.protein_g:.1f}, "
                f"F={meal.nutrition.fat_g:.1f}, C={meal.nutrition.carbs_g:.1f})"
            )
    elif args.command == "summary":
        total = manager.totals()
        print(
            f"合計栄養: kcal={total.calories:.1f}, P={total.protein_g:.1f}, "
            f"F={total.fat_g:.1f}, C={total.carbs_g:.1f}"
        )


if __name__ == "__main__":
    main()
