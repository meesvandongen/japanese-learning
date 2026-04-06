import { BlockTitle, List, ListItem } from 'konsta/react'
import type { Language } from '../types'

interface Props {
  language: Language
  onSelect: (levelId: string) => void
  onBack?: () => void
}

export function LevelSelector({ language, onSelect }: Props) {
  return (
    <>
      <BlockTitle large>Choose your starting level</BlockTitle>
      <List strong inset outline>
        {language.levels.map((level) => (
          <ListItem
            key={level.id}
            title={level.label}
            subtitle={level.description}
            after={`${level.wordCount} words`}
            link
            chevron
            onClick={() => onSelect(level.id)}
          />
        ))}
      </List>
    </>
  )
}
