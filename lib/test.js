const {Convert} = require("./DSL")


const jasonobj ={
    "$schema": "https://json-schema.org/draft/2020-12",
    "$id": "https://example.com/schema/customer",
  
    "type": "object",
    "properties": {
      "name": { "type": "string" },
      "phone": { "$ref": "/schema/common#/$defs/phone" },
      "address": { "$ref": "/schema/address" }
    },
  
    "$defs": {
      "https://example.com/schema/address": {
        "$id": "https://example.com/schema/address",
  
        "type": "object",
        "properties": {
          "address": { "type": "string" },
          "city": { "type": "string" },
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
  
        "$defs": {
          "phone": {
            "type": "string",
            "pattern": "^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$"
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
  




const transformRule = [
    {
        path : "*" ,
        condOperMapper : [
            {
                conditions : [{"isKey" : {key : "$schema"}}  ],
                operations : {"updateValue" : {value : "https://json-schema.org/draft/2020-12/schema"}}
            
            }
          
        ]

    }
 
]


const myObj = Convert(transformRule , jasonobj)


