export interface Word {
  kana: string
  japanese: string
  english: string[]
}

export interface Level {
  id: string
  label: string
  description: string
  wordCount: number
  file: string
}

export interface Language {
  id: string
  name: string
  levels: Level[]
}

export interface Manifest {
  version: number
  languages: Language[]
}
