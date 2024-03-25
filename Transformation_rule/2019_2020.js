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

                                current: { getConcatinate: [{ getUriWithoutFragment: { uri: { "getValue": null } } }, '#'] },
                                updater: [
                                    // items -------------------------> prefixItems
                                    {
                                        conditions: [
                                            {
                                                isEqual: { value1: "items", value2: { getStorage: "_$value_" } },
                                                not: {
                                                    condiArr: [
                                                        {
                                                            isEqual: { value1: { getStorage: "prevKey" }, value2: "properties" },
                                                            isEqual: { value1: { getStorage: "prevKey" }, value2: "$defs" }
                                                        }
                                                    ]
                                                },
                                                hasProperty: { key: "items", from: { getStorage: "prevReference" } }
                                            },

                                        ],
                                        getters: {
                                            getConcatinate: [{ getStorage: "path" }, "/prefixItems"]
                                        }
                                    },
                                    //additionalItmes -----------------> items
                                    {
                                        conditions: [
                                            {
                                                isEqual: { value1: "additionalItems", value2: { getStorage: "_$value_" } },
                                                not: {
                                                    condiArr: [
                                                        {
                                                            isEqual: { value1: { getStorage: "prevKey" }, value2: "properties" },
                                                            isEqual: { value1: { getStorage: "prevKey" }, value2: "$defs" }
                                                        }
                                                    ]
                                                },
                                                hasProperty: { key: "additionalItems", from: { getStorage: "prevReference" } }
                                            },

                                        ],
                                        getters: {
                                            getConcatinate: [{ getStorage: "path" }, "/items"]
                                        }
                                    },

                                    //----------------------default-----------------------------
                                    { getters: { getConcatinate: [{ getStorage: "path" }, '/', { getStorage: "_$value_" }] } }

                                ]
                            },
                            "prevReference": {
                                current: { getReference: { path: { getRootUri: { uri: { getValue: null } } } } },
                                updater: [
                                    { conditions: [{ "isEqual": { value1: "#", value2: { getStorage: "_$value_" } } }] },
                                    { getters: { getReference: { path: { getConcatinate: ['#/', { getStorage: "_$value_" }] }, from: { getStorage: "prevReference" } } } }
                                ]
                            },
                            "prevKey": {
                                updater: [
                                    { getters: { getStorage: "_$value_" } }
                                ]
                            }
                        },
                        // changing value of $ref to the path
                        operations: {
                            "updateValue": { value: { getStorage: "path" } }
                        }
                    }
                }
            },
            {
                "conditions": [
                    {
                        "hasChild": {
                            "childName": "$recursiveAnchor"
                        },
                        "not": {
                            "condiArr": [
                                { "isKey": { "key": "properties" } },
                                { "isKey": { "key": "$def" } }
                            ]
                        }
                    }
                ],
                "operations": {
                    "updateValue": {
                        "key": "$recursiveAnchor",
                        "from": {
                            "getReference": {
                                "path": "#.../"
                            }
                        },
                        "value": "anchor"
                    },
                    "editChildKey": {
                        "key": "$recursiveAnchor",
                        "newKey": "$dynamicAnchor"
                    }
                }
            },
            {
                "conditions": [
                    {
                        "hasChild": {
                            "childName": "$recursiveRef"
                        },
                        "not": {
                            "condiArr": [
                                { "isKey": { "key": "properties" } },
                                { "isKey": { "key": "$def" } }
                            ]
                        }
                    }
                ],
                "operations": {
                    "updateValue": {
                        "key": "$recursiveRef",
                        "from": {
                            "getReference": {
                                "path": "#.../"
                            }
                        },
                        "value": "#anchor"
                    },
                    "editChildKey": {
                        "key": "$recursiveRef",
                        "newKey": "$dynamicRef"
                    }
                }
            },
            {
                "conditions": [
                    {
                        "hasChild": {
                            "childName": "items"
                        },
                        "not": {
                            "condiArr": [
                                { "isKey": { "key": "properties" } },
                                { "isKey": { "key": "$def" } }
                            ]
                        }
                    }
                ],
                "operations": {
                    "editChildKey": {
                        "key": "items",
                        "newKey": "prefixItems"
                    }
                }
            },
            {
                "conditions": [
                    {
                        "hasChild": {
                            "childName": "additionalItems"
                        },
                        "not": {
                            "condiArr": [
                                { "isKey": { "key": "properties" } },
                                { "isKey": { "key": "$def" } }
                            ]
                        }
                    }
                ],
                "operations": {
                    "editChildKey": {
                        "key": "additionalItems",
                        "newKey": "items"
                    }
                }
            },
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
                    { "$ref": "#/properties/tags/items" },
                    { "$ref": "#/properties/testTag/items/1" }
                ],
                "additionalItems": {
                    "$ref": "#/properties/title/items/0"
                }
            },
            "tags": {
                "type": "array",
                "items": {
                    "type": "string"
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
                        "items": [{ "something": { "items": "", "type": "array" } }, "some", "somanother"],
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
for (const elm of refJsonTest) {
    const instance = Convert(transformRule, elm)
    const analyseResult = instance.analyseSchemaIds()
    const result = instance.applytransformations()
    console.log(`**************************************Schema ${count}********************************************`)
    console.log(JSON.stringify(result, null, 3))
    count = count + 1
    console.log("\n\n\n\n")
}