import { Text, styled } from 'tamagui'

const LABELS: Record<'due' | 'new' | 'extra', string> = {
  due: 'Review',
  new: 'New',
  extra: 'Extra practice',
}

const BadgeText = styled(Text, {
  paddingHorizontal: '$2',
  paddingVertical: '$1',
  borderRadius: '$2',
  fontSize: 11,
  fontWeight: '700',
  textTransform: 'uppercase',
  letterSpacing: 0.5,
  variants: {
    type: {
      due: { backgroundColor: '#ffe0b2', color: '#b45309' },
      new: { backgroundColor: '#bbdefb', color: '#0d47a1' },
      extra: { backgroundColor: '#e1bee7', color: '#6a1b9a' },
    },
  } as const,
})

interface Props {
  type: 'due' | 'new' | 'extra' | undefined
}

export function CardTypeBadge({ type }: Props) {
  if (!type) return null
  return <BadgeText type={type}>{LABELS[type]}</BadgeText>
}
