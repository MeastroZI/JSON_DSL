const { Convert } = require("../lib/DSL")



const transformRule = [
  {
    path: "*",
    condOperMapper: [
      //*****************************$ref Transformation********************************** */
      {
        conditions: [
          { "isKey": { key: "$ref" }, "valuePattern": ".*\\bitems\\b.*" },
          { "isKey": { key: "$ref" }, "valuePattern": ".*\\badditionalItems\\b.*" }
        ],
        operations: {
          "valueIterator": {
            targetValue: { getFragmentUri: null },
            type: "string", splitBy: "/",
            defineStorage: {
              "path": {
                
                current: { "getConcatinate": [{"getUriWithoutFragment" :{ uri : {"getValue" : null}}} , '#'] },
                updater: [
               
                  // **************items ---- > prefixitems
                  {
                    conditions: [
                      {
                        "isEqual": { value1: "items", value2: { getStorage: "_$value_" } },
                        "hasSibling": { key: "type", value: "array", from: { getStorage: "prevReference" } }
                      }],
                    getters: { getConcatinate: [{ getStorage: "path" }, '/', "prefixItems"] }
                  },
                  // ***************additionalItems ---- > items
                  {
                    conditions: [{
                      "isEqual": { value1: "additionalItems", value2: { getStorage: "_$value_" } },
                      "hasSibling": { key: "type", value: "array", from: { getStorage: "prevReference" } }
                    }],
                    getters: { getConcatinate: [{ getStorage: "path" }, '/', "items"] }
                  },
                  //******************Default conditions to append the value as it is  */
                  { getters: { getConcatinate: [{ getStorage: "path" }, '/', { getStorage: "_$value_" }] } }

                ]
              },
              "prevReference": {
                current: { getReference: { path: { getRootUri: { uri: { getValue: null } } } } },
                updater: [
                  { conditions: [{ "isEqual": { value1: "#", value2: { getStorage: "_$value_" } } }] },
                  { getters: { getReference: { path: { getConcatinate: ['#/', { getStorage: "_$value_" }] }, from: { getStorage: "prevReference" } } } }
                ]
              }
            },

            operations: {
              "updateValue": { value: { getStorage: "path" } }
            }
          }
        }
      },
      //*****************************$recursiveAnchor Tramsformation********************** */
      {
        conditions: [{ "hasChild": { childName: "$recursiveAnchor" } }],
        operations: {
          "updateValue": { key: "$recursiveAnchor", parent: { getReference: { path: "#.../" } }, value: "node" },
          "editChildKey": { key: "$recursiveAnchor", newKey: "$dynamicAnchor" }
        }

      },
      /*********************************$recursiveRef Transformation********************* */
      {
        conditions: [{ "hasChild": { childName: "$recursiveRef" } }],
        operations: {
          "updateValue": { key: "$recursiveRef", parent: { getReference: { path: "#.../" } }, value: "#node" },
          "editChildKey": { key: "$recursiveRef", newKey: "$dynamicRef" }
        }

      },
      //*****************************$schema Transformation *********************************/
      {
        conditions: [{ "isKey": { key: "$schema" } }],
        operations: { "updateValue": { value: "https://json-schema.org/draft/2020-12/schema" } }

      }
    ]

  }
]










const jasonobjs = [{
  //********************Bundled Schema************************ */

  "$schema": "https://json-schema.org/draft/2019-12",
  "$id": "https://example.com/schema/customer",

  "type": "object",
  "properties": {
    "name": { "type": "string" },
    "phone": { "$ref": "/schema/common#/$defs/phone" },
    "address": { "$ref": "/schema/address#/properties/city/items/0/something/items/items/items" },
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
          "items": [{"something" : {"items" : "" , "type" : "array"}}, "some", "somanother"],
          "additonalItems": { "type": "string" }
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
},

/***************************normal Schema*********************************** */
{
  "$schema": "https://json-schema.org/draft/2019-09/schema",
  "$id": "https://example.com/tree",
  "$recursiveAnchor": true,
  "type": "object",
  "properties": {
    "data": true,
    "children": {
      "type": "array",
      "items": {
        "$recursiveRef": "#"
      }
    }
  }
}
]



// const myObj = Convert(transformRule, jasonobj)

// const result =myObj.applytransformations()
let count = 1
// console.log(JSON.stringify(result , null ,2) )


for (const elm of jasonobjs) {
  const instance = Convert(transformRule, elm)
  instance.analyseSchemaIds()
  const result = instance.applytransformations()
  console.log(`**********************************************___${count} Schema___*******************************************\n\n\\n`)

  console.log(JSON.stringify(result, null, 2))
  count = count + 1
}

// const instance = Convert(transformRule , jasonobj[0])
// instance.analyseSchemaIds()