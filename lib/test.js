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
                conditions :[{"isKey" : {key : "$ref"} , "valuePattern" : ".*\\/items\\/.*"} ],
                operations : {"valueIterator" :{
                    type : "string" , splitBy : "/" ,
                    defineStorage : {
                        "prevReference" : {
                            current :  {getReference : {path : '/'}}, 
                           
                            updater : [
                                {conditions : [{"isEqual" : {value1 : "#" , value2 : {getStorage : "_$value_"}}}] , getters :{getReference :{path :"#"}}},
                                {getters : {getReference : {path : {getConcatinate : ['/' , {getStorage:"_$value_"} ]} , from :{getStorage : "prevReference"}  } }}
                            
                            ]
                        },
                        "path" :{
                            current : "" ,
                            updater : [
                                {conditions : [{"isEqual" : {value1 : "#" , value2 : {getStorage : "_$value_"}}}] , 
                                getters : {getConcatinate : ['#']}} ,
                                {conditions : [
                                    {"isEqual" : {value1:"items" , value2 : {getStorage:"_$value_"}} , 
                                    "hasSibling" : {key: "type" , value : "array", from:{getReference : {path : {getStorage : "path"}}}}}] , 
                                    // actully this propety is haschild 
                                    
                                    getters : {getConcatinate : [{getStorage : "path"} , '/' , "prefixItems"]}},

                                {getters : {getConcatinate : [{getStorage : "path"} , '/' , {getStorage:"_$value_"}]}}

                            ]
                        }
                    },
                   
                    operations : {
                        "updateValue" :{value : {getStorage : "path"}}
                    }

                  
                
                }}


            
            },
            {
                conditions : [{"isKey" : {key : "$schema"}}  ],
                operations : {"updateValue" : {value : "https://json-schema.org/draft/2020-12/schema"}}
            
            }
        ]

    }
    // ,
    // {
    //     path : "*" ,
    //     condOperMapper : [
    //         {conditions : [{"isKey": {key:"items"}, "hasSibling": {key:"type" , value : "array"} }]  , operations : {"editKey": {key:"prefixItems"}}},
    //         {conditions : [{"isKey" : {key:"$schema"}}] , operations : { "updateValue" : {value:"https://json-schema.org/draft/2020-12/schema"}}}
    
        
    //     ]
    // }
]


const myObj = Convert(transformRule , jasonobj)


const obj = myObj.analyseSchemaIds()

console.log(JSON.stringify(obj , null ,2))