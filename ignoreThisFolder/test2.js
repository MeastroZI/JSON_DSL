const { Convert } = require("../lib/DSL")
const obj =  {
    "$schema": "https://json-schema.org/draft/2019-09/schema",
    "$id": "https://example.com/tree",
    "$recursiveAnchor": true,
    "type": "object",
    "properties": {
        "items" : {"type" : "string"},
        "data": true,
        "children": {
            "type": "array",
            "items": {
                "$recursiveRef": "#"
            }
        }
    }
}

const transformRule = [
    {
        path: "*",
        condOperMapper : [
            {conditions: [
                {not :{ condiArr : [{ "isKey": { key: "properties" } }]} , "hasChild" : {childName : "items"}   }
            ],
            operations : {
                "editChildKey" : {key : "items" ,   newKey : "prefixItems"}
              }
        
            }
        ]
    }
]

const instance = Convert(transformRule , obj)

const result = instance.applytransformations()

console.log(JSON.stringify(result , null ,3))