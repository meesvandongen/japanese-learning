import { BlockTitle, List, ListItem } from 'konsta/react'
import type { Manifest } from '../types'

interface Props {
  manifest: Manifest
  onSelect: (languageId: string) => void
  onBack?: () => void
}

export function LanguageSelector({ manifest, onSelect }: Props) {
  return (
    <>
      <BlockTitle large>Choose a language to learn</BlockTitle>
      <List strong inset outline>
        {manifest.languages.map((lang) => (
          <ListItem
            key={lang.id}
            title={lang.name}
            after={`${lang.levels.length} level${lang.levels.length !== 1 ? 's' : ''}`}
            link
            chevron
            onClick={() => onSelect(lang.id)}
          />
        ))}
      </List>
    </>
  )
}
