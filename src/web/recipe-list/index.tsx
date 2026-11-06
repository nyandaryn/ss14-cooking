import { DepartmentHeading, CatalogSelection } from '../department-heading';
import { Link } from 'react-router';
import { useUrl } from '../url';
import {
  ReactElement,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useLocation, useNavigate } from 'react-router';
import { MicrowaveRecipeType, Recipe as RecipeData } from '../../types';
import { useGameData } from '../context';
import { Dropdown, DropdownExtraItem, DropdownOption } from '../dropdown';
import { useIsFavorite } from '../favorites';
import { Messages, useT } from '../i18n';
import {
  ClearFilterIcon,
  FilterActiveIcon,
  FilterOpenIcon,
  SearchIcon,
  SortIcon,
} from '../icons';
import { InputGroup } from '../input-group';
import { Recipe, RecipeVisibilityProvider } from '../recipe';
import {
  chainCompare,
  compareByFav,
  compareByMethod,
  compareByName,
  compareDefault,
} from '../sort';
import { Tooltip } from '../tooltip';
import { DisplayMethod } from '../types';
import {
  InitialFilter,
  RecipeFilter,
  SearchParamName,
  applyFilter,
  isFilterActive,
  loadFilterFromUrl,
  searchByName,
} from './filter';
import { FilterEditor } from './filter-editor';
import { IngredientSuggestions } from './ingredient-filter';

export { searchByName };

type SortOrder = 'default' | 'alpha';

export const RecipeList = memo(({ section = 'cooking' }: { section?: 'cooking' | 'medicine' }): ReactElement => {
  const navigate = useNavigate();
  const url = useUrl();
  const location = useLocation();
  const t = useT();

  const sortOptions = useMemo<DropdownOption[]>(() => [
    { value: 'default', name: t.recipes.sortDefault },
    { value: 'alpha', name: t.recipes.sortAlpha },
  ], [t]);

  const {
    recipeList: allRecipes,
    searchableRecipeNames,
    entityMap,
    reagentMap,
    sortingIdRewrites,
  } = useGameData();

  const recipeList = useMemo(() => allRecipes.filter(recipe => {
    const medical = recipe.method === 'microwave' && (typeof recipe.subtype === 'string' ? recipe.subtype === 'MedicalAssembler' : recipe.subtype?.includes('MedicalAssembler'));
    return section === 'medicine' ? medical : !medical;
  }), [allRecipes, section]);

  const [search, setSearch] = useState(() =>
    new URLSearchParams(location.search).get(SearchParamName) ?? ''
  );
  const [filter, setFilter] = useState<RecipeFilter>(() =>
    location.state ??
    loadFilterFromUrl(new URLSearchParams(location.search))
  );
  const [order, setOrder] = useState<SortOrder>('default');
  const [groupByMethod, setGroupByMethod] = useState(true);
  const [favsFirst, setFavsFirst] = useState(true);

  const isFavorite = useIsFavorite();

  const filteredRecipes = useMemo(() => {
    let recipes = applyFilter(recipeList, filter, entityMap);
    if (/\S/.test(search)) {
      recipes = searchByName(recipes, searchableRecipeNames, search);
    }
    return recipes;
  }, [recipeList, search, filter, searchableRecipeNames]);

  const sortedRecipes = useMemo(() => {
    let compare: (a: RecipeData, b: RecipeData) => number;
    switch (order) {
      case 'default':
        compare = compareDefault(sortingIdRewrites);
        break;
      case 'alpha':
        compare = compareByName(entityMap, reagentMap);
        break;
    }
    if (groupByMethod) {
      compare = chainCompare(compareByMethod, compare);
    }
    if (favsFirst) {
      compare = chainCompare(compareByFav(isFavorite), compare);
    }
    return filteredRecipes.slice(0).sort(compare);
  }, [
    filteredRecipes,
    entityMap,
    reagentMap,
    sortingIdRewrites,
    order,
    groupByMethod,
    favsFirst,
    isFavorite,
  ]);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const clearSearch = useCallback(() => {
    setSearch('');
    searchInputRef.current?.focus();
  }, []);

  const [showFilter, setShowFilter] = useState(false);
  const handleToggleFilter = useCallback(() => {
    setShowFilter(f => !f);
  }, []);

  const handleResetFilter = useCallback(() => {
    setFilter(filter => ({
      ...InitialFilter,
      // Retain this setting
      ingredientMode: filter.ingredientMode,
    }));
  }, []);

  const extraSortItems = useMemo<DropdownExtraItem[]>(() => [
    {
      name: t.recipes.groupByMethod,
      checked: groupByMethod,
      activate: () => setGroupByMethod(!groupByMethod),
    },
    {
      name: t.recipes.favoritesFirst,
      checked: favsFirst,
      activate: () => setFavsFirst(!favsFirst),
    },
  ], [groupByMethod, favsFirst, t]);

  // Save the current filter in the history state so we can recover it
  // if the user navigates away. Stop filters from just getting lost.
  useEffect(() => {
    navigate(location, {
      state: filter,
      replace: true,
    });
  }, [filter]);

  const selectedId = new URLSearchParams(location.search).get('recipe');
  const selectedRecipe = recipeList.find(r => r.id === selectedId);
  const hasFilter = isFilterActive(filter);
  const Container = section === 'cooking' ? 'main' : 'section';

  return (
    <Container className={section === 'cooking' ? 'department' : undefined}>
      {section === 'cooking' && <DepartmentHeading code='01 / KITCHEN' title={['Кулинария', 'Cooking']} description={['Рецепты, ингредиенты и способы приготовления выбранной сборки.', 'Recipes, ingredients and cooking methods in the selected build.']}/>}
      {selectedId && <CatalogSelection id={selectedId}>
        <Link to={section === 'medicine' ? url.withSearchParams(url.medicine, 'view=assembler') : url.recipes}>← {t.common.tabs.allRecipes}</Link>
        {selectedRecipe ? <Recipe id={selectedRecipe.id}/> : <p>{t.recipes.resultSome(0, recipeList.length)}</p>}
      </CatalogSelection>}
      {!selectedId && <>
      <div className='recipe-search'>
        <InputGroup iconBefore={<SearchIcon/>}>
          <input
            type='search'
            aria-label={t.recipes.searchLabel}
            placeholder={t.recipes.searchPlaceholder}
            size={1}
            value={search}
            onChange={e => setSearch(e.target.value)}
            ref={searchInputRef}
          />
        </InputGroup>

        <Tooltip
          placement='below'
          text={
            hasFilter
              ? describeFilter(filter, t)
              : t.recipes.filterButtonTooltip
          }
        >
          <button
            className={
              hasFilter
                ? 'recipe-search_filter-toggle--active'
                : undefined
            }
            aria-pressed={showFilter}
            aria-expanded={showFilter}
            onClick={handleToggleFilter}
          >
            {hasFilter ? <FilterActiveIcon/> : <FilterOpenIcon/>}
            <span>{t.recipes.filterButton}</span>
          </button>
        </Tooltip>

        <Tooltip placement='below' text={t.recipes.clearFilter}>
          <button aria-label={t.recipes.clearFilter} disabled={!hasFilter} onClick={handleResetFilter}>
            <ClearFilterIcon/>
          </button>
        </Tooltip>

        <Dropdown
          icon={<SortIcon/>}
          value={order}
          options={sortOptions}
          extraItems={extraSortItems}
          onChange={v => setOrder(v as SortOrder)}
        />

        <FilterEditor
          open={showFilter}
          filter={filter}
          search={search}
          setFilter={setFilter}
        />
      </div>
      <IngredientSuggestions
        search={search}
        filter={filter}
        setFilter={setFilter}
        clearSearch={clearSearch}
      />
      <ResultCount
        search={search}
        filter={filter}
        resultCount={sortedRecipes.length}
        totalCount={recipeList.length}
      />
      <RecipeVisibilityProvider>
        <ul className='recipe-list'>
          {sortedRecipes.map(recipe =>
            <li key={recipe.id}>
              <Recipe id={recipe.id}/>
            </li>
          )}
        </ul>
      </RecipeVisibilityProvider>
      </>}
    </Container>
  );
});

interface ResultCountProps {
  search: string;
  filter: RecipeFilter;
  resultCount: number;
  totalCount: number;
}

const ResultCount = ({
  search,
  filter,
  resultCount,
  totalCount,
}: ResultCountProps): ReactElement => {
  const { microwaveRecipeTypes, specialTraits } = useGameData();
  const t = useT();

  const isFiltered = isFilterActive(filter) || resultCount !== totalCount;

  if (!isFiltered) {
    return (
      <p className='recipe-count'>
        {t.recipes.resultAll(totalCount)}
      </p>
    );
  }

  if (resultCount > 0) {
    return (
      <p className='recipe-count'>
        {t.recipes.resultSome(resultCount, totalCount)}
      </p>
    );
  }

  const selectedTraits = specialTraits.filter(
    trait => (trait.mask & filter.specials) !== 0
  );
  const hasIngredients = filter.ingredients.size > 0 || filter.reagents.size > 0;

  const message = t.recipes.noResults({
    specialSummaries: selectedTraits.map(trait => trait.filterSummary),
    specialNames: selectedTraits.map(trait => trait.filterName),
    methods: filter.methods.map(m =>
      describeMethod(m, filter.subtypes, microwaveRecipeTypes, t)
    ),
    search: /\S/.test(search) ? search.trim() : null,
    mode: hasIngredients ? filter.ingredientMode : null,
  });

  return <p className='recipe-count'>{message}</p>;
};

const describeMethod = (
  method: DisplayMethod,
  subtypes: readonly string[],
  microwaveSubtypes: Readonly<Record<string, MicrowaveRecipeType>> | null,
  t: Messages
): string => {
  if (method === 'microwave' && microwaveSubtypes && subtypes.length > 0) {
    return t.recipes.microwaveSubtypes(
      subtypes.map(s => microwaveSubtypes[s].filterSummary)
    );
  }
  return t.recipes.methodSummaries[method];
};

const describeFilter = (filter: RecipeFilter, t: Messages): string =>
  t.recipes.filterDescription({
    methods: filter.methods.length,
    ingredients: filter.ingredients.size + filter.reagents.size,
    mode: filter.ingredientMode,
    specials: countOnes(filter.specials),
  });

const countOnes = (value: number): number => {
  // https://graphics.stanford.edu/%7Eseander/bithacks.html#CountBitsSetParallel
  value = value - ((value >>> 1) & 0x55555555);
  value = (value & 0x33333333) + ((value >>> 2) & 0x33333333);
  return ((value + (value >>> 4) & 0xF0F0F0F) * 0x1010101) >> 24;
};
