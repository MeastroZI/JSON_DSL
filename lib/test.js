const {Convert} = require("./DSL")


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
            ,
            "somthing" : {
                "another" : {} ,
                "somethingElse" : {
                    "$ref" : "#/properties/items/items/0"
                }
            }
            ,
            "somthing1" : {
                "another" : {} ,
                "somethingElse" : {
                    "$ref" : "#/properties/items/items/0"
                }
            }
            ,
            "somthing2" : {
                "another" : {} ,
                "somethingElse" : {
                    "$ref" : "#/properties/items/items/0"
                }
            }
            ,
            "somthing3" : {
                "another" : {} ,
                "somethingElse" : {
                    "$ref" : "#/properties/items/items/0"
                }
            }
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

console.log(JSON.stringify(myObj , null , 1))