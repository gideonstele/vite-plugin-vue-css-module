import { describe, expect, test } from 'vitest'

describe('特殊情况', () => {
  test('空', async () => {
    await expect(`cls=""`).toBeCssModule(``)
    await expect(`cls="  "`).toBeCssModule(``)
    await expect(`cls`).toBeCssModule(``)
    await expect(`:cls=""`).toBeCssModule(``)
    await expect(`:cls="[]"`).toBeCssModule(``)
    await expect(`:cls="{}"`).toBeCssModule(``)
  })
  test('单引号', async () => {
    await expect(`cls='red yellow green'`).toBeCssModule(
      `:class='[$style["red"], $style["yellow"], $style["green"]]'`
    )
  })
  test('混合引号', async () => {
    await expect(`class="white" cls='red yellow green'`).toBeCssModule(
      `class="white" :class='[$style["red"],$style["yellow"],$style["green"]]'`
    )
    await expect(`:class='["red"]' cls="red yellow green"`).toBeCssModule(
      `:class='["red", $style["red"], $style["yellow"], $style["green"]]'`
    )
  })
  test('非格式化', async () => {
    await expect(`cls=" red  yellow   green     "`).toBeCssModule(
      `:class="[$style['red'], $style['yellow'], $style['green']]"`
    )
  })
  test('v-bind', async () => {
    await expect(`:class="[type]" :cls="[type]"`).toBeCssModule(`:class="[type, $style[type]]"`)
    await expect(`:class="[type]" v-bind:cls="[type]"`).toBeCssModule(`:class="[type, $style[type]]"`)
    await expect(`v-bind:class="[type]" :cls="[type]"`).toBeCssModule(`:class="[type, $style[type]]"`)
    await expect(`v-bind:class="[type]" v-bind:cls="[type]"`).toBeCssModule(
      `:class="[type, $style[type]]"`
    )
  })
  test('简写对象{item}', async () => {
    await expect(`:class="[type]" :cls="{item}"`).toBeCssModule(
      `:class="{[type]: type, [$style['item']]: item}"`
    )
    await expect(`:class="[type]" :cls="{item, type: true}"`).toBeCssModule(
      `:class="{[type]:type, [$style['item']]: item, [$style['type']]: true}"`
    )
  })
  test('字符串中含,{}[]这类字符', async () => {
    await expect(`:cls="type === ',[],{}'"`).toBeCssModule(`:class="[$style[type === ',[],{}']]"`)
    await expect(`:cls="{active: type === ',[],}{,}{', red: true}"`).toBeCssModule(
      `:class="{ [$style['active']]: type === ',[],}{,}{', [$style['red']]: true}"`
    )
    await expect(`:cls="[ type === ',][],}{,}{' && 'green', 'red']"`).toBeCssModule(
      `:class="[ $style[type === ',][],}{,}{' && 'green' ], $style['red']]"`
    )
  })
})
