import tempfile
import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch

from meal_manager import MealManager, NutritionInfo, OpenFoodFactsClient


class StubNutritionClient:
    def fetch_nutrition(self, food_name: str) -> NutritionInfo:
        if food_name == "banana":
            return NutritionInfo(calories=89, protein_g=1.1, fat_g=0.3, carbs_g=22.8)
        return NutritionInfo()


class MealManagerTests(unittest.TestCase):
    def test_add_meal_and_totals(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            manager = MealManager(Path(temp_dir) / "meals.json", nutrition_client=StubNutritionClient())
            manager.add_meal("breakfast", "banana", quantity=2)

            meals = manager.list_meals()
            self.assertEqual(len(meals), 1)
            self.assertEqual(meals[0].food_name, "banana")
            self.assertEqual(meals[0].nutrition.calories, 178)

            totals = manager.totals()
            self.assertEqual(totals.calories, 178)
            self.assertAlmostEqual(totals.protein_g, 2.2)
            self.assertAlmostEqual(totals.fat_g, 0.6)
            self.assertAlmostEqual(totals.carbs_g, 45.6)


class OpenFoodFactsClientTests(unittest.TestCase):
    @patch("meal_manager.urllib.request.urlopen")
    def test_fetch_nutrition_handles_missing_values(self, mock_urlopen: MagicMock) -> None:
        response = MagicMock()
        response.read.return_value = (
            b'{"products":[{"nutriments":{"energy-kcal_100g":"52","proteins_100g":null,"fat_100g":"0.2"}}]}'
        )
        mock_urlopen.return_value.__enter__.return_value = response

        client = OpenFoodFactsClient()
        nutrition = client.fetch_nutrition("apple")
        self.assertEqual(nutrition.calories, 52.0)
        self.assertEqual(nutrition.protein_g, 0.0)
        self.assertEqual(nutrition.fat_g, 0.2)
        self.assertEqual(nutrition.carbs_g, 0.0)

    @patch("meal_manager.urllib.request.urlopen")
    def test_fetch_nutrition_uses_fallback_keys(self, mock_urlopen: MagicMock) -> None:
        response = MagicMock()
        response.read.return_value = (
            b'{"products":[{"nutriments":{"energy-kcal":"100","proteins":"2","fat":"1","carbohydrates":"20"}}]}'
        )
        mock_urlopen.return_value.__enter__.return_value = response

        client = OpenFoodFactsClient()
        nutrition = client.fetch_nutrition("banana")
        self.assertEqual(nutrition.calories, 100.0)
        self.assertEqual(nutrition.protein_g, 2.0)
        self.assertEqual(nutrition.fat_g, 1.0)
        self.assertEqual(nutrition.carbs_g, 20.0)


if __name__ == "__main__":
    unittest.main()
