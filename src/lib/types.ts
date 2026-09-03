// Mirror of HomeKitchenBE/shared/src/types.ts — shapes only. The API is the source of truth.
export type WeightUnit = 'oz' | 'lb';
export type VolumeUnit = 'tsp' | 'tbsp' | 'floz' | 'cup' | 'pint' | 'quart' | 'gallon';
export type CountUnit = 'each' | 'bunch';
export type Unit = WeightUnit | VolumeUnit | CountUnit;
export type IngredientKind = 'fresh' | 'weekly' | 'pantry';
export const FORMS = ['Produce', 'Dairy', 'Bakery', 'Frozen', 'Dry Goods', 'Spices', 'Liquid'] as const;
export type Form = (typeof FORMS)[number];

export interface Store { id: string; name: string; sortOrder: number; color: string; }
export interface Settings { people: number; weekStartsOn: number; }
export interface Ingredient {
  id: string; name: string; kind: IngredientKind; storeId: string; form: Form;
  weeklyQty?: number; isLow?: boolean; buyUnit?: Unit; stockUnit?: Unit; countUnit?: CountUnit; ozPerCup?: number; ozPerCount?: number;
  expiresOn?: string;
}
export interface RecipeLine { ingredientId: string; qty?: number; unit?: Unit; note?: string; }
export interface Recipe { id: string; title: string; ingredients: RecipeLine[]; steps: string[]; tags: string[]; }

export interface Ref { id: string; title: string | null; }
export interface WeekDay { date: string; breakfast: Ref[]; lunch: Ref[]; dinner: Ref[]; }
export interface Week { startDate: string; endDate: string; days: WeekDay[]; }

export interface NeededRow { ingredient: Ingredient; stock: { qty: number; unit: Unit } | null; needQty: number | null; needUnit: Unit | null; problem: string | null; }
export interface Needed { startDate: string; endDate: string; people: number; items: NeededRow[]; pantry: Array<{ ingredient: Ingredient; isLow: boolean }>; }

export type ItemSource = 'auto' | 'weekly' | 'low' | 'manual';
export interface ShoppingItem {
  ingredientId: string; name: string; storeId: string; group: string; source: ItemSource; checked: boolean;
  needQty?: number; needUnit?: Unit; haveQty?: number; haveUnit?: Unit; buyQty?: number; buyUnit?: Unit; altQty?: number; altUnit?: Unit;
}
export interface Problem { ingredientId: string; name: string; reason: string; }
export interface PantryCheckItem { ingredientId: string; name: string; storeId: string; isLow: boolean; }
export interface ShoppingList { id: string; startDate: string; endDate: string; generatedAt: string; status: string; people: number; items: ShoppingItem[]; problems: Problem[]; pantryCheck: PantryCheckItem[]; }

export interface ScaledLine { ingredientId: string; name: string; qty?: number; unit?: Unit; note?: string; }
export interface ScaledRecipe { recipeId: string; title: string; factor: number; lines: ScaledLine[]; steps: string[]; }
export interface Today { date: string; people: number; breakfast: ScaledRecipe[]; lunch: string[]; dinner: ScaledRecipe[]; }

export interface NeedsBridge { ingredient: Ingredient; needs: Array<'ozPerCup' | 'ozPerCount'>; units: Unit[]; }
export interface BridgeEstimate { id: string; name?: string; ozPerCup?: number; ozPerCount?: number; rationale: string; }

export interface DraftLine { name: string; qty?: number; unit?: Unit; rawUnit?: string; note?: string; kind?: IngredientKind; form?: Form; match: { ingredientId: string; name: string; kind: IngredientKind; confidence: 'exact' | 'partial' } | null; }
export interface RecipeDraft { title: string; servings: number; lines: DraftLine[]; steps: string[]; model: string; }
