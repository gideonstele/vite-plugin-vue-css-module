import { describe, expect, test } from 'vitest'

describe('cls字符串，class字符串', () => {
  test('单个', async () => {
    await expect(`class="wrap" cls="wrap"`).toBeCssModule(`class="wrap" :class="[$style['wrap']]"`)
  })
  test('多个', async () => {
    await expect(`class="red yellow" cls="green red"`).toBeCssModule(
      `class="red yellow":class="[$style['green'], $style['red']]"`
    )
  })
})
