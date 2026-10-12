// data 폴더 파일 이름표. Node API를 쓰지 않아 어디서나 import할 수 있다.
/** data 폴더 파일 이름 → Data 속성 이름 */
export const DATA_FILES = {
  taxonomy: 'taxonomy.json',
  scoring: 'scoring.json',
  questions: 'questions.json',
  rules: 'rules.json',
  products: 'products.json',
  concepts: 'concepts.json',
  researchCards: 'research-cards.json',
  templates: 'templates.json',
  recipes: 'recipes.json',
  errors: 'errors.json',
} as const;
