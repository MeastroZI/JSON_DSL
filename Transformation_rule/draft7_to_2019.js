const { Convert } = require("../lib/DSL")

const transformation_rule = [
    {
        "path": {
            "walkers": "jsonschema-draft7"
        },
        condOperMapper: [
            {
                conditions: [{ "isKey": { "key": "$schema" } }],
                operations: [{ "updateValue": { "value": "https://json-schema.org/draft/2019-09/schema" } }]
            },
            {
                conditions: [{ "isKey": { "key": "$id" }, "valuePattern": "^#" }],
                operations: [{ "editKey": { "key": "$anchor" } }]
            },
            {
                conditions: [
                    { "isKey": { "key": "definitions" }, "isType": { "type": "object" } }
                ],
                operations: [{ "editKey": { "key": "$defs" } }]
            },
            {
                conditions: [
                    {
                        "isKey": { "key": "dependencies" }
                    }
                ],
                operations: [{
                    "valueIterator": {
                        "type": "object",
                        "defineStorage": {
                            "dependentRequire": {
                                "current": {},
                                "updater": [
                                    {
                                        "conditions": [
                                            {
                                                "isType": {
                                                    "type": "array"
                                                },
                                            }],
                                        "opType": "append",
                                        "getters": { "getStorage": "_$value_" }
                                    }
                                ]
                            },
                            "dependentSchema": {
                                "current": {},
                                "updater": [
                                    {
                                        "conditions": [
                                            {
                                                "isType": {
                                                    "type": "object"
                                                },
                                            }],
                                        "opType": "append",
                                        "getters": { "getStorage": "_$value_" }

                                    }
                                ]
                            }
                        },
                        "operations": [
                            { "addSiblingProperty": { "key": "dependentRequire", "value": { "getStorage": "dependentRequire" } } },
                            { "addSiblingProperty": { "key": "dependentSchema", "value": { "getStorage": "dependentSchema" } } },
                            { "deletProperty": "dependencies" }
                        ]
                    }
                }]
            }
        ]
    },

    // to update the $ref
    {
        "path": {
            "walkers": "jsonschema-2019-09"
        },
        condOperMapper: [
            {
                conditions: [
                    { "isKey": { "key": "$ref" }, "valuePattern": ".*\\bdefinitions\\b.*" },
                    { "isKey": { "key": "$ref" }, "valuePattern": ".*\\bdependencies\\b.*" }
                ],
                operations: [{
                    "valueIterator": {
                        "targetValue": { "getFragmentUri": null },
                        "type": "string",
                        "splitBy": "/",
                        "defineStorage": {
                            "path": {
                                "current": { "getConcatinate": [{ "getUriWithoutFragment": null }, "#"] },
                                "updater": [
                                    {
                                        "conditions": [{
                                            "isEqual": { "value1": "definitions", "value2": { "getStorage": "_$value_" } },
                                            "isValidPath": { "getConcatinate": [{ "getStorage": "path" }, "/", "$defs"] }
                                        }],
                                        "opType": "append",
                                        "getters": "/$defs"
                                        // "getters": {"getConcatinate": [{ "getStorage": "path" }, "/$defs"]}
                                    },
                                    // for dependencies person can only reference to the part which have schema as the value means we need to convert dependencies into the dependentSchema
                                    {
                                        "conditions": [{
                                            "isEqual": { "value1": "dependencies", "value2": { "getStorage": "_$value_" } },
                                            "isValidPath": { "getConcatinate": [{ "getStorage": "path" }, "/", "dependentSchema"] }
                                        }],
                                        "opType": "append",
                                        "getters": "/dependentSchemas"
                                        // "getters":{"getConcatinate": [{ "getStorage": "path" }, "/dependentSchemas"]}
                                    },
                                    //default : 
                                    {
                                        "opType": "append",
                                        // "getters" : {"getConcatinate": [{ "getStorage": "path" }, "/",{"getStorage" : "_$value_"}]}
                                        "getters": { "getConcatinate": ["/", { "getStorage": "_$value_" }] }
                                    }
                                ]
                            }
                        },
                        "operations": [{ "updateValue": { "value": { "getStorage": "path" } } }]
                    }
                }]
            }
        ]
    }

]


// just made the complex schema may be there is no meaning of it 
const test =
{
    "$id": "https://example.com/schema/customer",
    "$schema": "https://json-schema.org/draft/draft7/schema",
    "properties": {
        "$ref": {
            "$ref": "#/definitions/ones"
        },
        "$ref2": {
            "oneOf": [
                { "$ref": "#/definitions/ones/properties/definitions" },
                { "$ref": "/schema/something#/properties/definitions" }
            ]
        },
        "$ref3": { "$ref": "#/definitions/ones/properties/someProperties/dependencies/foo2" },
        "$ref4": { "$ref": "#/definitions/ones/properties/definitions/definitions" }
    },
    "definitions": {
        "ones": {
            "$id": "https://example.com/schema/something",
            "properties": {
                "someProperties": {
                    "dependencies": {
                        "foo": ["bar"],
                        "foo2": {
                            "properties": {
                                "foo2Dependencies1": {},
                                "foo2Dependencies2": {}
                            }
                        }
                    }
                },
                "definitions": {
                    "definitions": {}
                }
            }
        },
        "twos": {
            "$id": "#so"
        }
    }
}


const instance = Convert(test)
instance.analyseSchemaIds()
// console.log(JSON.stringify(instance.analyseSchemaIds() , null , 2))

console.log(JSON.stringify(instance.applytransformations(transformation_rule), null, 2))