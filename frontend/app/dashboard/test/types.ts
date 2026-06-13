export type MCQQuestion = {
  id: string
  type: 'mcq'
  source: 'vocabulary' | 'reading' | 'interview'
  prompt: string
  context?: string
  options: string[]
  correct: number
}

export type FillQuestion = {
  id: string
  type: 'fill'
  source: 'grammar'
  sentence: string
  answer: string
  hint?: string
}

export type TestQuestion = MCQQuestion | FillQuestion
