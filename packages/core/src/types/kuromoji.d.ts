export interface KuromojiToken {
  surface_form: string
  reading?: string
  pos: string
  pos_detail_1: string
  pos_detail_2: string
  pos_detail_3: string
  conjugated_type: string
  conjugated_form: string
  basic_form: string
  pronunciation?: string
}

export interface KuromojiTokenizer {
  tokenize: (text: string) => KuromojiToken[]
}

declare global {
  interface Window {
    webkitSpeechRecognition: typeof SpeechRecognition
  }
}
