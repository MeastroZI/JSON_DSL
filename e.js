

const {Convert} = require("./lib/DSL")


const transformRule = [

{
    path: '*',
    // conditions: [{ "isKey": "items", "hasSibling": ["type", "array"] }],
    // operations: {
    //     "editKey": "prefixItems"
    // },
    condOperMapper : [
        {conditions : [{"isKey": "items", "hasSibling": ["type", "array"] }]  , operations : {"editKey": "prefixItems"}},
        {conditions : [{"isKey" : "$schema"}] , operations : { "updateValue" : "https://json-schema.org/draft/2020-12/schema"}}

    
    ]
} 
// {
//     path : '$schema' ,
    
//     operations : {
//         "updateValue" : "https://json-schema.org/draft/2020-12/schema"
//     }
// }
]



const jasonobj = {
    "$schema": "https://json-schema.org/draft/2019-09/schema",
    "type": "object",
    "properties": {
        "items": {
            "type": "array",
            "items": [
                { "type": "string" }
            ]
        },
        "extra": {
            "$ref": "#/properties/items/items/0"
        }
    },
    "ooos": {
        "items2": {
            "type": "array",
            "items": []
        },
        "item3": {
            "items4": {
                "items5": {
                    "type": "array",
                    "items": []
                }
            }
        }
    }
}

const myObj = Convert(transformRule , jasonobj)

console.log(JSON.stringify(myObj , null , 1))


