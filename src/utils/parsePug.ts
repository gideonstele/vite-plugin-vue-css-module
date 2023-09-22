import {
  getObjectOrArrayExpressionContent,
  getPugVal,
  isArrayExp,
  isObjectExp,
  transform2SingleQuotes,
  transformExp,
  transformString2Array,
  transformString2ObjectString
} from './tool'

// 属性节点
interface Attr {
  name: string
  val: string
  line: number
  column: number
  mustEscape: boolean
}

// 标签节点
interface Node {
  attrs: undefined | Array<Attr>
}

// pug包，用于动态导入，避免不是用pug模板的项目报错
let pugPackage: {
  parse: any
  lexer: any
  walk: any
  wrap: any
  generate: any
}

const setPugPackage = () => {
  pugPackage = {
    parse: require('pug-parser'),
    lexer: require('pug-lexer'),
    walk: require('pug-walk'),
    wrap: require('pug-runtime/wrap'),
    generate: require('pug-code-gen')
  }
}

export function parsePug(source: string, attrName: string, cssModuleName: string) {
  /** fix: 非使用pug模板的项目报缺少pug的相关依赖 */
  if (!pugPackage) setPugPackage()
  const { parse, lexer, walk, wrap, generate } = pugPackage
  const ast = parse(lexer(source))
  walk(ast, (node: Node) => {
    if (node.attrs?.length) {
      let bindClassNode: Attr | undefined,
        attrNameNode: Attr | undefined,
        bindAttrNameNode: Attr | undefined
      node.attrs.forEach((attr) => {
        switch (attr.name) {
          case ':class':
          case 'v-bind:class':
            bindClassNode = attr
            break
          case `:${attrName}`:
          case `v-bind:${attrName}`:
            bindAttrNameNode = attr
            break
          case attrName:
            attrNameNode = attr
            break
        }
      })
      // 如果 attrName = cls, 且 :cls="" 存在
      if (bindAttrNameNode) {
        const bindAttrNameContent = transform2SingleQuotes(getPugVal(bindAttrNameNode.val))
        const bindAttrNameContent2CssModuleNameStr = transformExp(
          bindAttrNameContent,
          cssModuleName,
          "'"
        )
        // :cls的值为空、空数组、空对象，删除该属性
        if (!bindAttrNameContent2CssModuleNameStr) {
          node.attrs = node.attrs.filter((attr) => attr !== bindAttrNameNode)
          return
        }
        // :class 存在
        if (bindClassNode) {
          // 双引号转为单引号
          const bindClassContent = transform2SingleQuotes(getPugVal(bindClassNode.val))
          let result: string
          // :class="{}"
          if (isObjectExp(bindClassContent)) {
            // 获取{}中间的内容
            let objectContent = getObjectOrArrayExpressionContent(bindClassContent)
            /** fix: :class="{}" 和 :class="[]" 报错 */
            if (objectContent) {
              objectContent += ','
            }
            // :class="{}"  :cls="{}"
            if (isObjectExp(bindAttrNameContent)) {
              result = `"{${objectContent}${bindAttrNameContent2CssModuleNameStr}}"`
            }
            // :class="{}"  :cls="[]" 或 :cls="exp"
            else {
              result = `"{${objectContent}${transformString2ObjectString(
                bindAttrNameContent2CssModuleNameStr
              )}}"`
            }
          }
          // :class="[]"
          else if (isArrayExp(bindClassContent)) {
            // 获取[]中间的内容
            let arrayContent = getObjectOrArrayExpressionContent(bindClassContent)
            // :class="[]" :cls="{}"
            if (isObjectExp(bindAttrNameContent)) {
              arrayContent = transformString2ObjectString(arrayContent)
              /** fix: :class="{}" 和 :class="[]" 报错 */
              if (arrayContent) {
                arrayContent += ','
              }
              result = `"{${arrayContent}${bindAttrNameContent2CssModuleNameStr}}"`
            }
            // :class="[]" :cls="[]" 或 :cls="exp"
            else {
              result = `"[${arrayContent},${bindAttrNameContent2CssModuleNameStr}]"`
            }
          }
          // :class="exp"
          else {
            // :class="exp" :cls="{}"
            if (isObjectExp(bindAttrNameContent)) {
              result = `"{${transformString2ObjectString(
                bindClassContent
              )},${bindAttrNameContent2CssModuleNameStr}}"`
            }
            // :class="exp" :cls="[]" 或 :cls="exp"
            else {
              result = `"[${bindClassContent},${bindAttrNameContent2CssModuleNameStr}]"`
            }
          }
          bindClassNode.val = result
          // 删除 :cls节点
          node.attrs = node.attrs.filter((attr) => attr !== bindAttrNameNode)
        } else {
          bindAttrNameNode.name = ':class'
          // :cls="{}"
          if (isObjectExp(bindAttrNameContent)) {
            bindAttrNameNode.val = `"{${bindAttrNameContent2CssModuleNameStr}}"`
          } else {
            bindAttrNameNode.val = `"[${bindAttrNameContent2CssModuleNameStr}]"`
          }
        }
      }
      if (attrNameNode) {
        const attrNameArr = transformString2Array(getPugVal(attrNameNode.val))
        // cls 为空时，直接删除属性
        if (attrNameArr.length === 0) {
          node.attrs = node.attrs.filter((attr) => attr !== attrNameNode)
          return
        }
        // :class
        if (bindClassNode) {
          let result: string
          const bindClassContent = transform2SingleQuotes(getPugVal(bindClassNode.val))
          // :class="{}"  :class='{}'
          if (isObjectExp(bindClassContent)) {
            // 获取{}中间的内容
            let objectContent = getObjectOrArrayExpressionContent(bindClassContent)
            /** fix: :class="{}" 和 :class="[]" 报错 */
            if (objectContent) {
              objectContent += ','
            }
            result = `"{${objectContent}${attrNameArr
              .map((cls) => `[${cssModuleName}['${cls}']]:true`)
              .join(',')}}"`
          }
          // :class="[]" :class='[]'
          else if (isArrayExp(bindClassContent)) {
            const arrayContent = getObjectOrArrayExpressionContent(bindClassContent)
            result = `"[${arrayContent}, ${attrNameArr
              .map((cls) => `${cssModuleName}['${cls}']`)
              .join(',')}]"`
          }
          // :class="type" :class='type === "add" && "red"' :class="type === 'add' ? 'red' : 'green'"
          else {
            result = `"[${bindClassContent},${attrNameArr
              .map((cls) => `${cssModuleName}['${cls}']`)
              .join(',')}]"`
          }
          // 修改 :class的值
          bindClassNode.val = result
          // 删除 attrName 属性
          node.attrs = node.attrs.filter((attr) => attr !== attrNameNode)
        }
        // 只存在 或 不存在 class
        else {
          attrNameNode.name = `:class`
          attrNameNode.val = `"[${attrNameArr
            .map((cls) => `${cssModuleName}['${cls}']`)
            .join(',')}]"`
        }
      }
    }
  })
  const templateFn = wrap(generate(ast))
  return templateFn()
}