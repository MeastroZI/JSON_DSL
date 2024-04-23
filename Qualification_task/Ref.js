const { Convert } = require("../lib/DSL")



const transformRule = [
    {
        path: { walkers: "jsonschema-2019-09" },
        condOperMapper: [

            // recursiveAnchor -------------------------------> dynamicAnchor
            {
                "conditions": [
                    {
                        "isKey": { "key": "$recursiveAnchor" }
                    }
                ],
                "operations": {
                    "updateValue": {
                        "value": "anchor"
                    },
                    "editKey": {
                        "key": "$dynamicAnchor"
                    }
                }
            },

            //recursiveRef ------> dynamicRef
            {
                "conditions": [
                    {
                        "isKey": { "key": "$recursiveRef" }
                    }
                ],
                "operations": {
                    "updateValue": {
                        "value": "#anchor"
                    },
                    "editKey": {
                        "key": "$dynamicRef"
                    }
                }
            },

            //items --------> prefixItems
            {
                "conditions": [
                    {
                        "isKey": {
                            "key": "items"
                        }
                    }
                ],
                "operations": {
                    "editKey": {
                        "key": "prefixItems"
                    }
                }
            },
            //additionalItems ----------------> items
            {
                "conditions": [
                    {
                        "isKey": {
                            "key": "additionalItems"
                        }
                    }
                ],
                "operations": {
                    "editKey": {
                        "key": "items"
                    }
                }
            },
            // schema uri change
            {
                "conditions": [
                    {
                        "isKey": {
                            "key": "$schema"
                        }
                    }
                ],
                "operations": {
                    "updateValue": {
                        "value": "https://json-schema.org/draft/2020-12/schema"
                    }
                }
            },

        ]

    },
    // as the whole json schema is get transform into the 2020-12 draft we need apply the 2020-12 walkers to update the $ref
    {
        path: { walkers: "jsonschema-2020-12" },
        condOperMapper: [
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
                                "current": { "getConcatinate": [{ "getUriWithoutFragment": null }, "#"] },
                                "updater": [
                                    //items ------------------------------> prefixItems 
                                    {
                                        "conditions": [
                                            {
                                                "isEqual": { "value1": "items", "value2": { "getStorage": "_$value_" } },

                                                "isValidPath": {
                                                    "getConcatinate": [{ "getStorage": "path" }, "/", "prefixItems"]
                                                }
                                                // i am alredy checking the conditions first that _$value_ is items or not, so that i am directly writing the items here either concistent way is to use getStorage

                                            }
                                        ],
                                        "getters": {
                                            "getConcatinate": [{ "getStorage": "path" }, "/prefixItems"]
                                        }
                                    },

                                    //additionalItems -------------------> items
                                    {
                                        "conditions": [
                                            {
                                                "isEqual": { "value1": "additionalItems", "value2": { "getStorage": "_$value_" } },


                                                "isValidPath": {
                                                    "getConcatinate": [{ "getStorage": "path" }, "/", "items"]
                                                }

                                            }
                                        ],
                                        "getters": {
                                            "getConcatinate": [{ "getStorage": "path" }, "/items"]
                                        }
                                    },

                                    //----------------------default-----------------------------
                                    { getters: { getConcatinate: [{ getStorage: "path" }, '/', { getStorage: "_$value_" }] } }
                                ]
                            }
                        },
                        operations: {
                            "updateValue": { value: { getStorage: "path" } }
                        }

                    }
                }
            }
        ]
    }
]





// this examples are taken from teh JSON schema examples and change littlbit for testing if any validation error is found then ignore please
const refJsonTest = [

    {
        "$id": "https://example.com/blog-post.schema.json",
        "$schema": "https://json-schema.org/draft/2019-12/schema",
        "description": "A representation of a blog post",
        "type": "object",
        "required": ["title", "content", "author"],
        "properties": {
            "items": {},
            "title": {
                "type": "array",
                "items": [
                    { "type": "string" },
                    { "$ref": "#properties/title/items/0" }
                ]
            },
            "content": {
                "type": "string"
            },
            "publishedDate": {
                "type": "string",
                "format": "date-time"
            },
            "author": {
                "$ref": "https://example.com/user-profile.schema.json"
            },
            "testTag": {
                "type": "array",
                "items": [
                    { "$ref": "#/properties/tags/items/properties/items/items" },
                    { "$ref": "#/properties/testTag/items/1" }
                ],
                "additionalItems": {
                    "$ref": "#/properties/title/items/0"
                }
            },
            "tags": {
                "type": "array",
                "items": {
                    "properties" : {
                        "items" : {
                            "type" : "array",
                            "items" : [
                                {"type" : "string"}
                            ]
                        }
                    }
                }
            }
        }
    },

    // external schema $refs  ---->  need to be ignore   
    {
        "$id": "https://example.com/device.schema.json",
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "type": "object",
        "properties": {
            "deviceType": {
                "type": "string"
            }
        },
        "required": ["deviceType"],
        "oneOf": [
            {
                "properties": {
                    "deviceType": { "const": "smartphone" }
                },
                "$ref": "https://example.com/smartphone.schema.json"
            },
            {
                "properties": {
                    "deviceType": { "const": "laptop" }
                },
                "$ref": "https://example.com/laptop.schema.json"
            }
        ]
    },

    //********************Bundled Schema************************ */
    {
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
                        // just to check the transformation i made it extrimly complexe
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
    },

    /***************************normal Schema*********************************** */
    {
        "$schema": "https://json-schema.org/draft/2019-09/schema",
        "$id": "https://example.com/tree",
        "$recursiveAnchor": true,
        "type": "object",
        "properties": {
            "items": { "type": "string" },
            "data": true,
            "children": {
                "type": "array",
                "items": {
                    "$recursiveRef": "#"
                }
            }
        }
    },

    /*********************************$anchore Schema********************************** */
    {
        "$id": "https://example.com/ecommerce.schema.json",
        "$schema": "https://json-schema.org/draft/2019-12/schema",
        "$defs": {
            "product": {
                "$anchor": "ProductSchema",
                "type": "object",
                "properties": {
                    "name": { "type": "string" },
                    "price": { "type": "number", "minimum": 0 },
                    "something": {
                        "type": "array", "items":
                            [
                                { "$ref": "#OrderSchema" },
                                { "$ref": "#ProductSchema" }]
                    }
                }
            },
            "order": {
                "$anchor": "OrderSchema",
                "type": "object",
                "properties": {
                    "orderId": { "type": "string" },
                    "items": {
                        "type": "array",
                        "items": { "$ref": "#ProductSchema" }
                    }
                }
            }
        }
    }


]



let count = 1
console.log("\n\n\n\n")
// const walkers = require("../walkers/jsonschema-2019-09.json")
const instance = Convert()

for (const elm of refJsonTest) {
    instance.addJsonData(elm)
    const analyseResult = instance.analyseSchemaIds()
    const result = instance.applytransformations(transformRule)
    console.log(`**************************************Schema ${count}********************************************`)
    console.log(JSON.stringify(result, null, 3))
    count = count + 1
    console.log("\n\n\n\n")
}


// const used = process.memoryUsage();
// console.log(`Memory Usage: 
//   - RSS: ${used.rss / 1024 / 1024} MB
//   - Heap Total: ${used.heapTotal / 1024 / 1024} MB
//   - Heap Used: ${used.heapUsed / 1024 / 1024} MB
//   - External: ${used.external / 1024 / 1024} MB`);
