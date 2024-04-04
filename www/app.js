const CodeMirror = require('codemirror')
const codemirrorJSON = require('@codemirror/lang-json')
const codemirrorLint = require('@codemirror/lint')

const { Convert } = require("../lib/DSL")
const transformRule = require("../Transformation_rule/2019_to_2020.json")

const _instance_ = Convert()


function safeJSONParse(string) {
  try {
    return JSON.parse(string)
  } catch (error) {
    return null
  }
}



function getSelectValue(element) {
  return element.selectedIndex === -1
    ? null
    : element.options[element.selectedIndex].value
}



const from = document.getElementById('from')
const to = document.getElementById('to')
const input = document.getElementById('input')
const output = document.getElementById('output')
const transform = document.getElementById('upgrade')

function onError(error) {
  output.value = `ERROR: ${error.message}`
}



const DEFAULT_SCHEMA = {
  "$schema": "https://json-schema.org/draft/2019-12",
  "$id": "https://example.com/schema/customer",

  "type": "object",
  "properties": {
      "name": { "type": "string" },
      "phone": { "$ref": "/schema/common#/$defs/phone" },
      "address": { "$ref": "/schema/address#/properties/city/items/0/properties/items/items" },
      "address2": { "$ref": "/schema/address#/properties/city/additionalItems" }
  },

  "$defs": {
      "https://example.com/schema/address": {
          "$id": "https://example.com/schema/address",

          "type": "object",
          "properties": {
              "address": { "type": "string" },
              "city": {
                  "type": "array",
                  // just to check the transformation i made it  complexe
                  "items": [{"properties" : {"items" : {"type" : "array" , "items" : [] , "additionalItems" : {}}}}],
                  "additionalItems": { "type": "string" }
              },
              "postalCode": { "$ref": "/schema/common#/$defs/usaPostalCode" },
              "state": { "$ref": "#/$defs/states" }
          },

          "$defs": {
              "states": {
                  "enum": []
              }
          }
      },
      "https://example.com/schema/common": {
          "$schema": "https://json-schema.org/draft/2019-09",
          "$id": "https://example.com/schema/common",
          "$recursiveAnchor": true,
          "$defs": {
              "phone": {
                  "type": "string",
                  "pattern": "^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$",
                  "$recursiveRef": "#"
              },
              "usaPostalCode": {
                  "type": "string",
                  "pattern": "^[0-9]{5}(?:-[0-9]{4})?$"
              },
              "unsignedInt": {
                  "type": "integer",
                  "minimum": 0
              }
          }
      }
  }
}

const editor = new CodeMirror.EditorView({
  doc: JSON.stringify(DEFAULT_SCHEMA, null, 2),
  extensions: [
    CodeMirror.basicSetup,
    codemirrorJSON.json(),
    codemirrorLint.linter(codemirrorJSON.jsonParseLinter()),
    CodeMirror.EditorView.updateListener.of((event) => {
      const types = event.transactions.reduce((accumulator, transaction) => {
        const annotations = transaction.annotations.filter((annotation) => {
          return typeof annotation.value === 'string'
        }).map((annotation) => {
          return annotation.value
        })

        return accumulator.concat(annotations)
      }, [])

      if (types.length === 0) {
        return
      } else if (types.length === 1) {
        if (types[0] === 'select.pointer' || types[0] === 'select') {
          return
        }
      }

      const jsonValue = safeJSONParse(event.state.doc.toString())
      if (jsonValue === null) {
        return
      }

      const spec = METASCHEMAS[jsonValue.$schema]
      if (!spec) {
        return
      }

   
    })
  ],
  parent: input
})

transform.addEventListener('click', () => {
  const fromValue = getSelectValue(from)
  const toValue = getSelectValue(to)
  const inputValue = editor.state.doc.toString()
  const jsonValue = safeJSONParse(inputValue)
  if (jsonValue === null) {
    window.plausible('Invalid')
    return onError(new Error('Invalid input JSON'))
  }

  window.plausible('Transform', {
    props: {
      from: fromValue,
      to: toValue
    }
  })
  console.log("transform click is fire here is the fromvalue")
  console.log(jsonValue)

  
  _instance_.addJsonData(jsonValue)
  _instance_.analyseSchemaIds()
  const result = _instance_.applytransformations(transformRule)
  output.value = JSON.stringify(result, null, 2)
  console.log(JSON.stringify(result, null, 2))

})

from.addEventListener('change', (event) => {
  setSpecificationOptions(to,
    builtin.drafts.slice(builtin.drafts.indexOf(event.target.value) + 1).reverse())
})

// document.getElementById('version').innerText = `v${packageJSON.version}`
// refreshFrom(METASCHEMAS[DEFAULT_SCHEMA.$schema])
editor.focus()
transform.dispatchEvent(new Event('click'))
